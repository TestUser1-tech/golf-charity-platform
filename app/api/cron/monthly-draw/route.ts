import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const { data: existingDraw } = await supabase
    .from("draws")
    .select("id, status")
    .eq("draw_month", monthStart)
    .maybeSingle();

  if (existingDraw) {
    return NextResponse.json({ message: "Monthly draw already exists", drawId: existingDraw.id, status: existingDraw.status });
  }

  const { count: activeCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("subscription_status", "active");

  const perActiveContribution = Number(process.env.MONTHLY_DRAW_POOL_PER_ACTIVE || "10");
  const totalPrizePool = Number(((activeCount || 0) * perActiveContribution).toFixed(2));

  const { data: draw, error } = await supabase
    .from("draws")
    .insert({
      draw_month: monthStart,
      draw_type: "random",
      status: "pending",
      total_prize_pool: totalPrizePool,
    })
    .select("id, draw_month, total_prize_pool")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Monthly draw created", data: draw });
}
