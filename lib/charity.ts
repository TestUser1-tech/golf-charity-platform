export function normalizeContributionPercent(inputPercent: number): number {
  if (!Number.isFinite(inputPercent)) {
    return 10;
  }

  return Math.max(10, Math.min(100, Math.round(inputPercent)));
}

export function calculateCharityContribution(subscriptionAmount: number, contributionPct: number): number {
  const safePercent = normalizeContributionPercent(contributionPct);
  const safeAmount = Number.isFinite(subscriptionAmount) ? Math.max(0, subscriptionAmount) : 0;
  return Number((safeAmount * safePercent / 100).toFixed(2));
}
