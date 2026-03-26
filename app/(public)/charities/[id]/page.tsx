import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

interface CharityDetailProps {
  params: { id: string };
}

export default async function CharityDetailPage({ params }: CharityDetailProps) {
  const supabase = await createServerSupabaseClient();
  const { data: charity } = await supabase.from("charities").select("*").eq("id", params.id).maybeSingle();

  if (!charity) {
    notFound();
  }

  const events = Array.isArray(charity.upcoming_events) ? charity.upcoming_events : [];

  return (
    <main>
      <TopNav />
      <section className="page-container max-w-4xl py-10">
        <h1 className="page-title">{charity.name}</h1>
        <p className="mt-4 text-[var(--muted)]">{charity.description || "No description yet."}</p>

        <section className="mt-8 card">
          <h2 className="text-lg font-semibold">Upcoming events</h2>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">No upcoming events currently listed.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {events.map((event: { title: string; date: string }, idx: number) => (
                <li key={`${event.title}-${idx}`} className="rounded-lg border border-black/10 p-3">
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-[var(--muted)]">{new Date(event.date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <a href="/subscribe" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          Subscribe and support this charity
        </a>
      </section>
      <PublicFooter />
    </main>
  );
}
