import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.12em] text-[var(--primary)]">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-bold text-white">ID</span>
          <span>Impact Draw</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link href="/charities" className="font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">Charities</Link>
          <Link href="/subscribe" className="font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">Subscribe</Link>
          <Link href="/login" className="font-medium text-[var(--muted)] transition hover:text-[var(--primary)]">Login</Link>
          <Button href="/register" className="px-4 py-2 shadow-md">Join Now</Button>
        </nav>
      </div>
    </header>
  );
}
