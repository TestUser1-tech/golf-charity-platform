import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardDrawsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("draw_entries")
    .select("*, draws(draw_month, status, drawn_numbers)")
    .eq("user_id", user?.id || "")
    .order("created_at", { ascending: false });

  const { data: upcoming } = await supabase.from("draws").select("*").eq("status", "pending").order("draw_month", { ascending: true }).limit(3);

  return (
    <main className="page-container max-w-4xl py-8">
      <DashboardNav />
      <h1 className="page-title text-4xl">Draw participation summary</h1>
      <p className="page-subtitle">Review your entries and watch upcoming draws as they queue for publishing.</p>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Your draw entries</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(entries || []).map((entry) => (
            <li key={entry.id} className="rounded-lg border border-black/10 p-2">
              <div>{entry.draws?.draw_month ? new Date(entry.draws.draw_month).toLocaleDateString() : "Unknown month"}</div>
              <div className="text-[var(--muted)]">Snapshot: {(entry.scores_snapshot || []).join(", ") || "No snapshot"}</div>
              <div className="text-[var(--muted)]">Match: {entry.match_type || "none"}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Upcoming draws</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(upcoming || []).map((draw) => (
            <li key={draw.id} className="rounded-lg border border-black/10 p-2">{new Date(draw.draw_month).toLocaleDateString()} | {draw.draw_type}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
