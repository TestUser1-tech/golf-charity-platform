"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopNav } from "@/components/public/top-nav";
import { PublicFooter } from "@/components/public/footer";

interface Charity {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [charityId, setCharityId] = useState("");
  const [charityContributionPct, setCharityContributionPct] = useState(10);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCharities() {
      try {
        const response = await fetch(`/api/charities?t=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load charities");
        }

        setCharities(payload.data || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load charities");
      }
    }

    loadCharities();
  }, []);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (charityContributionPct < 10) {
      setError("Contribution must be at least 10%");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await fetch("/api/charities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-profile-charity",
          charity_id: charityId || null,
          charity_contribution_pct: charityContributionPct,
        }),
      });
    }

    router.push("/subscribe");
    router.refresh();
  }

  return (
    <main>
      <TopNav />
      <section className="page-container max-w-md py-14">
        <h1 className="page-title text-4xl sm:text-5xl">Create your account</h1>
        <p className="page-subtitle">Join the community where golf performance creates measurable impact.</p>
        <form onSubmit={handleRegister} className="card mt-6 space-y-3">
          <label className="block text-sm font-medium">
            Full name
            <input className="ui-input mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input type="email" className="ui-input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input type="password" className="ui-input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <label className="block text-sm font-medium">
            Select charity
            <select className="ui-select mt-1" value={charityId} onChange={(e) => setCharityId(e.target.value)} required>
              <option value="">Choose a charity</option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
            {charities.length === 0 ? <p className="mt-1 text-xs text-[var(--muted)]">No charities loaded yet. Refresh after adding charities in admin.</p> : null}
          </label>
          <label className="block text-sm font-medium">
            Charity contribution percentage
            <input
              type="number"
              className="ui-input mt-1"
              min={10}
              max={100}
              value={charityContributionPct}
              onChange={(e) => setCharityContributionPct(Number(e.target.value))}
              required
            />
          </label>
          {error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}
