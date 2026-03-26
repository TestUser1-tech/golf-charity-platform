"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const userId = loginData.user?.id;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
    } else {
      router.push("/dashboard");
    }

    router.refresh();
  }

  return (
    <main>
      <TopNav />
      <section className="page-container max-w-md py-14">
        <h1 className="page-title text-4xl sm:text-5xl">Welcome back</h1>
        <p className="page-subtitle">Sign in to continue your draws, charities, and rewards journey.</p>
        <form onSubmit={handleLogin} className="card mt-6 space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input className="ui-input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input className="ui-input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-center text-sm text-[var(--muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[var(--primary)] hover:underline">
              Register
            </Link>
          </p>
          <p className="text-center text-xs text-[var(--muted)]">
            Admin?{" "}
            <Link href="/admin/login" className="font-semibold text-[var(--primary)] hover:underline">
              Use admin login
            </Link>
          </p>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}
