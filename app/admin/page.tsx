import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/nav";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();

  const [
    usersRes,
    activeRes,
    drawRes,
    winnerRes,
    pendingVerificationRes,
    unpublishedDrawRes,
    charityRes,
    featuredCharityRes,
    attentionSubsRes,
    drawQueueRes,
    winnerQueueRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
    supabase.from("draws").select("id", { count: "exact", head: true }),
    supabase.from("winners").select("id", { count: "exact", head: true }),
    supabase.from("winners").select("id", { count: "exact", head: true }).in("verification_status", ["pending", "submitted"]),
    supabase.from("draws").select("id", { count: "exact", head: true }).neq("status", "published"),
    supabase.from("charities").select("id", { count: "exact", head: true }),
    supabase.from("charities").select("id", { count: "exact", head: true }).eq("is_featured", true),
    supabase
      .from("profiles")
      .select("id,email,subscription_status")
      .in("subscription_status", ["inactive", "lapsed", "cancelled"])
      .limit(6),
    supabase
      .from("draws")
      .select("id,draw_month,draw_type,status")
      .neq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(6),
    supabase
      .from("winners")
      .select("id,match_type,verification_status,payment_status,proof_image_url")
      .or("verification_status.eq.pending,verification_status.eq.submitted,payment_status.eq.pending")
      .limit(6),
  ]);

  const attentionSubs = attentionSubsRes.data || [];
  const drawQueue = drawQueueRes.data || [];
  const winnerQueue = winnerQueueRes.data || [];

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Admin dashboard</h1>
      <p className="page-subtitle">Use live operational data to manage users, draws, charities, winners, and reporting workflows.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total users"><p className="kpi">{usersRes.count || 0}</p></Card>
        <Card title="Active subscribers"><p className="kpi">{activeRes.count || 0}</p></Card>
        <Card title="Draws run"><p className="kpi">{drawRes.count || 0}</p></Card>
        <Card title="Winner records"><p className="kpi">{winnerRes.count || 0}</p></Card>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-4">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Verification queue</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink-soft)]">{pendingVerificationRes.count || 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Winners waiting for review</p>
          <Link href="/admin/winners" className="ghost-button mt-4 inline-flex">Open winners</Link>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Unpublished draws</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink-soft)]">{unpublishedDrawRes.count || 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Simulation or pending publish</p>
          <Link href="/admin/draws" className="ghost-button mt-4 inline-flex">Open draws</Link>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Charity profiles</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink-soft)]">{charityRes.count || 0}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Featured now: {featuredCharityRes.count || 0}</p>
          <Link href="/admin/charities" className="ghost-button mt-4 inline-flex">Manage charities</Link>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Subscriber issues</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink-soft)]">{attentionSubs.length}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Inactive, lapsed, or cancelled</p>
          <Link href="/admin/users" className="ghost-button mt-4 inline-flex">Manage users</Link>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-[var(--ink-soft)]">User operations</h2>
            <span className="status-chip">Live</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Direct access to profile edits, score corrections, and subscription controls.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/users" className="ghost-button inline-flex">Open user manager</Link>
            <Link href="/admin/reports" className="ghost-button inline-flex">View subscriber trends</Link>
          </div>
          <div className="mt-5 space-y-2">
            {attentionSubs.slice(0, 4).map((profile) => (
              <div key={profile.id} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--ink-soft)]">{profile.email || "No email"}</p>
                <p className="text-[var(--muted)]">Status: {profile.subscription_status}</p>
              </div>
            ))}
            {attentionSubs.length === 0 ? <p className="text-sm text-[var(--muted)]">No subscriber issues in queue.</p> : null}
          </div>
        </article>

        <article className="card lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-[var(--ink-soft)]">Draw operations</h2>
            <span className="status-chip">Live</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Configure logic, run simulations, and publish outcomes without leaving admin scope.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/draws" className="ghost-button inline-flex">Open draw manager</Link>
            <Link href="/admin/reports" className="ghost-button inline-flex">Open draw analytics</Link>
          </div>
          <div className="mt-5 space-y-2">
            {drawQueue.slice(0, 4).map((draw) => (
              <div key={draw.id} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--ink-soft)]">{new Date(draw.draw_month).toLocaleDateString()} | {draw.draw_type}</p>
                <p className="text-[var(--muted)]">Status: {draw.status}</p>
              </div>
            ))}
            {drawQueue.length === 0 ? <p className="text-sm text-[var(--muted)]">No pending draws right now.</p> : null}
          </div>
        </article>

        <article className="card lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-[var(--ink-soft)]">Winner operations</h2>
            <span className="status-chip">Live</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Verify submissions, review evidence links, and mark payout completion status.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/winners" className="ghost-button inline-flex">Open winners manager</Link>
            <Link href="/admin/reports" className="ghost-button inline-flex">Open payout analytics</Link>
          </div>
          <div className="mt-5 space-y-2">
            {winnerQueue.slice(0, 4).map((winner) => (
              <div key={winner.id} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                <p className="font-semibold text-[var(--ink-soft)]">{winner.match_type}</p>
                <p className="text-[var(--muted)]">Verification: {winner.verification_status} | Payment: {winner.payment_status}</p>
                <p className="text-[var(--muted)]">Proof: {winner.proof_image_url ? "uploaded" : "missing"}</p>
              </div>
            ))}
            {winnerQueue.length === 0 ? <p className="text-sm text-[var(--muted)]">No winners currently awaiting action.</p> : null}
          </div>
        </article>
      </section>

    </main>
  );
}
