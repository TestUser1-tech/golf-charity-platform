"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/scores", label: "Scores" },
  { href: "/dashboard/charity", label: "Charity" },
  { href: "/dashboard/draws", label: "Draws" },
  { href: "/dashboard/winnings", label: "Winnings" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="mb-8 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <Link href="/dashboard" className="justify-self-start text-sm font-bold tracking-wide text-[var(--primary)]">
          Impact Draw
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-2">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--primary)] text-white shadow"
                    : "border border-black/10 bg-white text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="justify-self-end">
          <button
            onClick={handleLogout}
            type="button"
            className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--muted)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
