import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateTierPools } from "@/lib/prize-pool";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const drawId = new URL(request.url).searchParams.get("drawId");
  const supabase = createServerSupabaseClient();

  let query = supabase.from("prize_pools").select("*").order("created_at", { ascending: false });
  if (drawId) {
    query = query.eq("draw_id", drawId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth instanceof NextResponse) return auth;

  const adminError = requireAdmin(auth);
  if (adminError) return adminError;

  const schema = z.object({
    drawId: z.string().uuid(),
    totalPrizePool: z.number().nonnegative(),
    fiveMatchRollover: z.number().nonnegative().default(0),
  });

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pools = calculateTierPools(parsed.data.totalPrizePool, parsed.data.fiveMatchRollover);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.from("prize_pools").upsert(
    pools.map((pool) => ({
      draw_id: parsed.data.drawId,
      match_type: pool.matchType,
      pool_amount: pool.poolAmount,
      winner_count: 0,
      payout_per_winner: 0,
      jackpot_rollover_amount: pool.matchType === "5-match" ? parsed.data.fiveMatchRollover : 0,
    })),
  ).select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
