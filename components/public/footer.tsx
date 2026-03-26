import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-bold tracking-[0.08em] text-[var(--primary)]">Impact Draw</p>
          <p className="text-sm text-[var(--muted)]">Play with purpose. Support charities every month.</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
          <Link href="/charities" className="transition hover:text-[var(--primary)]">Charities</Link>
          <Link href="/subscribe" className="transition hover:text-[var(--primary)]">Subscribe</Link>
          <Link href="/login" className="transition hover:text-[var(--primary)]">Login</Link>
          <Link href="/register" className="transition hover:text-[var(--primary)]">Join Now</Link>
        </nav>
      </div>
    </footer>
  );
}
