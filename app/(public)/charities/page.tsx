import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

interface CharityPageProps {
  searchParams: { q?: string; featured?: string };
}

export default async function CharitiesPage({ searchParams }: CharityPageProps) {
  const supabase = await createServerSupabaseClient();
  const q = searchParams.q?.trim();
  const featuredOnly = searchParams.featured === "1";

  let query = supabase.from("charities").select("*").order("is_featured", { ascending: false }).order("name", { ascending: true });
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const { data: charities } = await query;

  return (
    <main>
      <TopNav />
      <section className="page-container py-10">
        <h1 className="page-title">Charity directory</h1>
        <p className="page-subtitle">Discover causes, explore impact stories, and choose where your support goes.</p>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="search"
            name="q"
            defaultValue={q || ""}
            placeholder="Search charities"
            className="ui-input"
          />
          <select
            name="featured"
            defaultValue={featuredOnly ? "1" : ""}
            className="ui-select"
          >
            <option value="">All charities</option>
            <option value="1">Featured only</option>
          </select>
        </form>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(charities ?? []).map((charity) => (
            <article key={charity.id} className="card">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{charity.is_featured ? "Featured" : "Charity"}</p>
              <h2 className="mt-1 text-lg font-semibold">{charity.name}</h2>
              <p className="mt-2 text-sm text-[var(--muted)] line-clamp-3">{charity.description || "Description coming soon."}</p>
              <Link href={`/charities/${charity.id}`} className="ghost-button mt-4 inline-flex">View profile</Link>
            </article>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
