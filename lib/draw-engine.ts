import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateTierPools, getRolloverAmount, splitPoolByWinners } from "@/lib/prize-pool";

export type AlgorithmMode = "most-frequent" | "least-frequent";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomDraw(): number[] {
  const set = new Set<number>();

  while (set.size < 5) {
    set.add(randomInt(1, 45));
  }

  return Array.from(set).sort((a, b) => a - b);
}

function weightedUniquePick(weightMap: Map<number, number>, pickCount: number): number[] {
  const selected = new Set<number>();
  const entries = Array.from(weightMap.entries());

  while (selected.size < pickCount && selected.size < entries.length) {
    const available = entries.filter(([num]) => !selected.has(num));
    const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);

    let draw = Math.random() * totalWeight;
    for (const [number, weight] of available) {
      draw -= weight;
      if (draw <= 0) {
        selected.add(number);
        break;
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

export async function generateAlgorithmicDraw(mode: AlgorithmMode): Promise<number[]> {
  const supabase = await createServerSupabaseClient();
  const { data: scores } = await supabase
    .from("scores")
    .select("score, user_id, profiles!inner(subscription_status)")
    .eq("profiles.subscription_status", "active");

  const frequencies = new Map<number, number>();
  for (let i = 1; i <= 45; i += 1) {
    frequencies.set(i, 1);
  }

  for (const row of scores ?? []) {
    frequencies.set(row.score, (frequencies.get(row.score) ?? 1) + 1);
  }

  const weighted = new Map<number, number>();
  for (const [num, freq] of frequencies.entries()) {
    weighted.set(num, mode === "most-frequent" ? freq : 1 / freq);
  }

  return weightedUniquePick(weighted, 5);
}

export function calculateMatches(drawnNumbers: number[], userScores: number[]): 0 | 3 | 4 | 5 {
  const drawn = new Set(drawnNumbers);
  const matchCount = userScores.filter((num) => drawn.has(num)).length;

  if (matchCount === 5) return 5;
  if (matchCount === 4) return 4;
  if (matchCount === 3) return 3;
  return 0;
}

export async function runDraw(drawId: string, mode: "random" | "algorithmic", algorithmMode: AlgorithmMode = "most-frequent") {
  const supabase = await createServerSupabaseClient();
  const drawnNumbers = mode === "random" ? generateRandomDraw() : await generateAlgorithmicDraw(algorithmMode);

  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("subscription_status", "active");

  const winnersByType: Record<string, string[]> = {
    "3-match": [],
    "4-match": [],
    "5-match": [],
  };

  for (const user of activeUsers ?? []) {
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("score")
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const snapshot = (scoreRows ?? []).map((s) => s.score);

    if (snapshot.length === 0) {
      continue;
    }

    const match = calculateMatches(drawnNumbers, snapshot);
    const matchType = match === 5 ? "5-match" : match === 4 ? "4-match" : match === 3 ? "3-match" : "none";

    await supabase.from("draw_entries").insert({
      draw_id: drawId,
      user_id: user.id,
      scores_snapshot: snapshot,
      match_type: matchType,
    });

    if (matchType !== "none") {
      winnersByType[matchType].push(user.id);
    }
  }

  const { data: drawData } = await supabase.from("draws").select("total_prize_pool").eq("id", drawId).single();
  const totalPrizePool = Number(drawData?.total_prize_pool ?? 0);
  const tierPools = calculateTierPools(totalPrizePool, 0);

  for (const tier of tierPools) {
    const winnerCount = winnersByType[tier.matchType].length;
    const payoutPerWinner = splitPoolByWinners(tier.poolAmount, winnerCount);
    const jackpotRolloverAmount =
      tier.matchType === "5-match" ? getRolloverAmount(tier.poolAmount, winnerCount) : 0;

    await supabase.from("prize_pools").upsert({
      draw_id: drawId,
      match_type: tier.matchType,
      pool_amount: tier.poolAmount,
      winner_count: winnerCount,
      payout_per_winner: payoutPerWinner,
      jackpot_rollover_amount: jackpotRolloverAmount,
    });

    if (winnerCount > 0) {
      await supabase.from("winners").insert(
        winnersByType[tier.matchType].map((userId) => ({
          draw_id: drawId,
          user_id: userId,
          match_type: tier.matchType,
          prize_amount: payoutPerWinner,
        })),
      );
    }
  }

  const hasFiveMatchWinners = winnersByType["5-match"].length > 0;
  await supabase
    .from("draws")
    .update({
      draw_type: mode,
      drawn_numbers: drawnNumbers,
      jackpot_carried_over: !hasFiveMatchWinners,
    })
    .eq("id", drawId);

  return {
    drawId,
    drawnNumbers,
    winnersByType,
  };
}
