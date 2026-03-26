import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAlgorithmicDraw, generateRandomDraw, runDraw, type AlgorithmMode } from "@/lib/draw-engine";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/api-auth";
import { sendDrawPublishedEmail } from "@/lib/email";

const drawSchema = z.object({
  draw_month: z.string(),
  draw_type: z.enum(["random", "algorithmic"]),
  status: z.enum(["pending", "simulation", "published"]).default("pending"),
  total_prize_pool: z.number().nonnegative(),
});

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("draws").select("*").order("draw_month", { ascending: false });

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

  const payload = await request.json();

  if (payload.action === "simulate") {
    const mode = payload.draw_type === "algorithmic"
      ? await generateAlgorithmicDraw((payload.algorithmMode as AlgorithmMode) ?? "most-frequent")
      : generateRandomDraw();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("draws")
      .insert({
        draw_month: payload.draw_month,
        draw_type: payload.draw_type,
        drawn_numbers: mode,
        status: "simulation",
        total_prize_pool: payload.total_prize_pool ?? 0,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  }

  if (payload.action === "publish") {
    const result = await runDraw(payload.drawId, payload.draw_type, payload.algorithmMode);
    const supabase = createServerSupabaseClient();
    await supabase.from("draws").update({ status: "published", published_at: new Date().toISOString() }).eq("id", payload.drawId);

    const [{ data: entries }, { data: winners }] = await Promise.all([
      supabase
        .from("draw_entries")
        .select("user_id, match_type, profiles!draw_entries_user_id_fkey(email)")
        .eq("draw_id", payload.drawId),
      supabase
        .from("winners")
        .select("user_id, prize_amount")
        .eq("draw_id", payload.drawId),
    ]);

    const prizeByUser = new Map<string, number>();
    for (const winner of winners || []) {
      const existing = prizeByUser.get(winner.user_id) ?? 0;
      prizeByUser.set(winner.user_id, existing + Number(winner.prize_amount || 0));
    }

    await Promise.all(
      (entries || []).map(async (entry) => {
        const profileRelation = entry.profiles as { email?: string } | Array<{ email?: string }> | null;
        const email = Array.isArray(profileRelation) ? profileRelation[0]?.email : profileRelation?.email;
        if (!email) return;

        const payout = prizeByUser.get(entry.user_id) ?? 0;
        await sendDrawPublishedEmail(email, result.drawnNumbers, entry.match_type, payout);
      }),
    );

    return NextResponse.json({ data: result });
  }

  const parsed = drawSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("draws").insert(parsed.data).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
