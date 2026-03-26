"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const userId = loginData.user?.id;
    if (!userId) {
      setError("Unable to resolve account. Try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

    if (profileError || !profile) {
      setError("Unable to load profile role.");
      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not an administrator.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main>
      <TopNav />
      <section className="page-container max-w-md py-14">
        <h1 className="page-title text-4xl sm:text-5xl">Administrator login</h1>
        <p className="page-subtitle">Secure access for draw operations, verification, and reporting controls.</p>
        <form onSubmit={handleLogin} className="card mt-6 space-y-3">
          <label className="block text-sm font-medium">
            Admin email
            <input className="ui-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input className="ui-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            {loading ? "Signing in..." : "Sign in as admin"}
          </button>
          <p className="text-center text-xs text-[var(--muted)]">
            Subscriber account?{" "}
            <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
              Use member login
            </Link>
          </p>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}
