interface TierSplit {
  fiveMatch: number;
  fourMatch: number;
  threeMatch: number;
}

export interface PrizeTierResult {
  matchType: "5-match" | "4-match" | "3-match";
  poolAmount: number;
  winnerCount: number;
  payoutPerWinner: number;
  jackpotRolloverAmount: number;
}

const DEFAULT_SPLIT: TierSplit = {
  fiveMatch: 0.4,
  fourMatch: 0.35,
  threeMatch: 0.25,
};

export function calculateTierPools(totalPrizePool: number, rolloverFiveMatch = 0): PrizeTierResult[] {
  const normalizedTotal = Math.max(0, totalPrizePool);
  const normalizedRollover = Math.max(0, rolloverFiveMatch);

  const fiveMatchAmount = Number((normalizedTotal * DEFAULT_SPLIT.fiveMatch + normalizedRollover).toFixed(2));
  const fourMatchAmount = Number((normalizedTotal * DEFAULT_SPLIT.fourMatch).toFixed(2));
  const threeMatchAmount = Number((normalizedTotal * DEFAULT_SPLIT.threeMatch).toFixed(2));

  return [
    {
      matchType: "5-match",
      poolAmount: fiveMatchAmount,
      winnerCount: 0,
      payoutPerWinner: 0,
      jackpotRolloverAmount: 0,
    },
    {
      matchType: "4-match",
      poolAmount: fourMatchAmount,
      winnerCount: 0,
      payoutPerWinner: 0,
      jackpotRolloverAmount: 0,
    },
    {
      matchType: "3-match",
      poolAmount: threeMatchAmount,
      winnerCount: 0,
      payoutPerWinner: 0,
      jackpotRolloverAmount: 0,
    },
  ];
}

export function splitPoolByWinners(poolAmount: number, winnerCount: number): number {
  if (winnerCount <= 0) {
    return 0;
  }

  return Number((poolAmount / winnerCount).toFixed(2));
}

export function getRolloverAmount(fiveMatchPool: number, fiveMatchWinnerCount: number): number {
  if (fiveMatchWinnerCount > 0) {
    return 0;
  }

  return Number(Math.max(0, fiveMatchPool).toFixed(2));
}
