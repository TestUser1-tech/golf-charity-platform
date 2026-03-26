import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: featured }, { count: subscriberCount }, { count: drawCount }, { data: drawTotals }] = await Promise.all([
    supabase.from("charities").select("*").eq("is_featured", true).limit(1).maybeSingle(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
    supabase.from("draws").select("id", { count: "exact", head: true }),
    supabase.from("draws").select("total_prize_pool").not("total_prize_pool", "is", null),
  ]);

  const totalPool = (drawTotals || []).reduce((sum, draw) => sum + Number(draw.total_prize_pool || 0), 0);
  const totalDonated = totalPool * 0.1;
  const impactPerSubscriber = subscriberCount ? totalDonated / subscriberCount : 0;

  return (
    <main>
      <TopNav />
      <section className="relative overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#f8fbf7] via-[#eef6f0] to-[#fdf8ef]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6 reveal-up">
            <p className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              Give Monthly. Win Monthly. Change Lives.
            </p>
            <h1 className="font-[family-name:var(--font-serif)] text-5xl leading-tight sm:text-6xl">
              A Subscription With Heart, Not Hype.
            </h1>
            <p className="max-w-xl text-base text-[var(--muted)] sm:text-lg">
              Join a modern impact platform where your monthly contribution backs verified charities and unlocks monthly cash-prize eligibility.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-black/10 bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">What You Do</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">Subscribe and keep scores current</p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">How You Win</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">Monthly draw entries based on active profile</p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Charity Impact</p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink-soft)]">A guaranteed share flows to causes every cycle</p>
              </article>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button href="/subscribe" className="px-6 py-3 text-base shadow-lg">Start Supporting Today</Button>
              <Link href="/charities" className="ghost-button inline-flex items-center px-5 py-3 text-base">
                View Charity Stories
              </Link>
            </div>
          </div>

          <div className="card reveal-up delay-1 bg-white/90">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Live impact scoreboard</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Subscriber Community</p>
                <p className="text-3xl font-semibold">{subscriberCount || 0}</p>
              </div>
              <div className="rounded-xl border border-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Total Charity Funding</p>
                <p className="text-3xl font-semibold text-[var(--primary)]">{totalDonated.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
              </div>
              <div className="rounded-xl border border-black/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Average Impact Per Subscriber</p>
                <p className="text-2xl font-semibold">{impactPerSubscriber.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
              </div>
            </div>
            <Link href="/subscribe" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              Subscribe Now and Enter This Month&apos;s Draw
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 text-center shadow-sm sm:grid-cols-3 sm:p-6">
          <div className="reveal-up">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Active Subscribers</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{subscriberCount || 0}</p>
          </div>
          <div className="reveal-up delay-1">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Total Donated</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{totalDonated.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
          </div>
          <div className="reveal-up delay-2">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Draws Run</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--primary)]">{drawCount || 0}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-2 sm:px-6">
        <div className="rounded-3xl border border-[var(--primary)]/20 bg-gradient-to-r from-[#11422a] via-[#1a5c3a] to-[#1f6b44] px-5 py-7 text-white shadow-xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Ready to participate</p>
          <h2 className="mt-2 font-[family-name:var(--font-serif)] text-3xl leading-tight sm:text-4xl">Your next subscription can fund impact and open your prize opportunity.</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">No clutter. No gimmicks. One clear monthly flow: subscribe, submit your results, and stay eligible while supporting real causes.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="/subscribe" className="bg-white px-6 py-3 text-base font-bold text-[var(--primary)] hover:text-[var(--primary)]">Choose a Plan</Button>
            <Link href="/register" className="inline-flex items-center rounded-xl border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="card reveal-up flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Featured Charity</p>
            {featured ? (
              <>
                <h2 className="mt-1 text-2xl font-semibold">{featured.name}</h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{featured.description || "Impact updates and events available in the charity directory."}</p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">No featured charity set yet. Configure this in the admin panel.</p>
            )}
          </div>
          {featured?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.image_url} alt={featured.name} className="h-28 w-full rounded-xl object-cover sm:w-64" />
          ) : null}
          <Button href={featured ? `/charities/${featured.id}` : "/charities"}>Support This Cause</Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="font-[family-name:var(--font-serif)] text-3xl">How It Works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <article className="card reveal-up">
            <div className="text-2xl">1.</div>
            <h3 className="mt-2 text-lg font-semibold">Subscribe</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Pick monthly or yearly access and activate your impact profile in under two minutes.</p>
          </article>
          <article className="card reveal-up delay-1">
            <div className="text-2xl">2.</div>
            <h3 className="mt-2 text-lg font-semibold">Stay Eligible</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Submit your required scores to remain active and automatically enter upcoming draw cycles.</p>
          </article>
          <article className="card reveal-up delay-2">
            <div className="text-2xl">3.</div>
            <h3 className="mt-2 text-lg font-semibold">Win and Give Back</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Draw outcomes reward participants while guaranteed allocations continue funding selected charities.</p>
          </article>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
