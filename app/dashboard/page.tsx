import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, scoresResult, entriesResult, winningsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, subscription_plan, subscription_renewal_date, charity_contribution_pct, charities(name, image_url)")
      .eq("id", user?.id || "")
      .single(),
    supabase.from("scores").select("*").eq("user_id", user?.id || "").order("score_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("draw_entries").select("*, draws(draw_month, drawn_numbers, status)").eq("user_id", user?.id || "").order("created_at", { ascending: false }),
    supabase.from("winners").select("*").eq("user_id", user?.id || "").order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data as any;
  const charityName = Array.isArray(profile?.charities) ? profile.charities[0]?.name : profile?.charities?.name;
  const scores = scoresResult.data || [];
  const entries = entriesResult.data || [];
  const wins = winningsResult.data || [];
  const totalWon = wins.reduce((sum, win) => sum + Number(win.prize_amount || 0), 0);

  return (
    <main className="page-container">
      <DashboardNav />
      <h1 className="page-title">Subscriber dashboard</h1>
      <p className="page-subtitle">Track your subscription, performance, participation, and winnings in one place.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Subscription status">
          <p className="text-sm text-[var(--muted)]">Status</p>
          <p className="kpi capitalize">{profile?.subscription_status || "inactive"}</p>
          <p className="mt-2 text-sm">Plan: <strong>{profile?.subscription_plan || "Not set"}</strong></p>
          <p className="text-sm">Renewal: {profile?.subscription_renewal_date ? new Date(profile.subscription_renewal_date).toLocaleDateString("en-US") : "N/A"}</p>
        </Card>

        <Card title="Score history">
          <p className="text-sm text-[var(--muted)]">Latest {scores.length} of 5 stored scores</p>
          <ul className="mt-3 space-y-2">
            {scores.map((score) => (
              <li key={score.id} className="flex items-center justify-between rounded-lg border border-black/10 p-2 text-sm">
                <span>{new Date(score.score_date).toLocaleDateString()}</span>
                <strong>{score.score}</strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Charity selection">
          <p className="text-sm">{charityName || "No charity selected"}</p>
          <p className="text-sm text-[var(--muted)]">Contribution: {profile?.charity_contribution_pct || 10}%</p>
        </Card>

        <Card title="Participation summary">
          <p className="text-sm text-[var(--muted)]">Past entries: {entries.length}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {entries.slice(0, 5).map((entry) => (
              <li key={entry.id} className="rounded-lg border border-black/10 p-2">
                {entry.draws?.draw_month ? new Date(entry.draws.draw_month).toLocaleDateString() : "Unknown draw"} | Match {entry.match_type}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Winnings overview">
          <p className="kpi">{totalWon.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
          <p className="text-sm text-[var(--muted)]">All-time winnings</p>
          <ul className="mt-3 space-y-2 text-sm">
            {wins.slice(0, 5).map((win) => (
              <li key={win.id} className="rounded-lg border border-black/10 p-2">
                {win.match_type} | {Number(win.prize_amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })} | {win.payment_status}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
