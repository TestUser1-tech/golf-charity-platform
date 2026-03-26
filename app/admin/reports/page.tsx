import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/nav";
import { Card } from "@/components/ui/card";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();

  const [profilesRes, activeRes, drawRes, poolsRes, winnersRes, charitiesRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
    supabase.from("draws").select("*"),
    supabase.from("prize_pools").select("pool_amount, match_type"),
    supabase.from("winners").select("match_type"),
    supabase.from("charities").select("id, name"),
  ]);

  const { data: contributionProfiles } = await supabase
    .from("profiles")
    .select("charity_id, charity_contribution_pct, subscription_status, charities(name)")
    .not("charity_id", "is", null);

  const totalPrizePoolAllTime = (poolsRes.data || []).reduce((sum, pool) => sum + Number(pool.pool_amount || 0), 0);
  const drawCount = drawRes.data?.length || 0;
  const activeContributors = ((contributionProfiles || []) as any[]).filter((profile) => profile.subscription_status === "active");
  const totalContributionPct = activeContributors.reduce((sum, profile) => sum + Number(profile.charity_contribution_pct || 0), 0);
  const contributionByCharity = activeContributors.reduce<Record<string, { contributors: number; totalPct: number }>>((acc, profile) => {
    const charityName = Array.isArray(profile.charities) ? profile.charities[0]?.name : profile.charities?.name;
    const key = charityName || "Unknown charity";
    if (!acc[key]) {
      acc[key] = { contributors: 0, totalPct: 0 };
    }
    acc[key].contributors += 1;
    acc[key].totalPct += Number(profile.charity_contribution_pct || 0);
    return acc;
  }, {});
  const winnersByTier = (winnersRes.data || []).reduce<Record<string, number>>((acc, winner) => {
    acc[winner.match_type] = (acc[winner.match_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Reports and analytics</h1>
      <p className="page-subtitle">Monitor growth, prize distribution, and charity allocation from a single command view.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Total registered users"><p className="kpi">{profilesRes.count || 0}</p></Card>
        <Card title="Total active subscribers"><p className="kpi">{activeRes.count || 0}</p></Card>
        <Card title="Draws run"><p className="kpi">{drawCount}</p></Card>
        <Card title="Total prize pool all time"><p className="kpi">{totalPrizePoolAllTime.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p></Card>
        <Card title="Charities"><p className="kpi">{charitiesRes.data?.length || 0}</p></Card>
        <Card title="Jackpot winners"><p className="kpi">{winnersByTier["5-match"] || 0}</p></Card>
        <Card title="Charity contribution total (active)"><p className="kpi">{totalContributionPct}%</p></Card>
      </div>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Winners per tier</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>5-match: {winnersByTier["5-match"] || 0}</li>
          <li>4-match: {winnersByTier["4-match"] || 0}</li>
          <li>3-match: {winnersByTier["3-match"] || 0}</li>
        </ul>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Charity contribution breakdown</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(contributionByCharity).map(([name, data]) => (
            <li key={name}>{name}: {data.contributors} contributors | {data.totalPct}% combined allocation</li>
          ))}
          {Object.keys(contributionByCharity).length === 0 ? <li>No active contribution data yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
