"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/nav";
import { createClient } from "@/lib/supabase/client";

interface Charity {
  id: string;
  name: string;
}

interface DonationRow {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
  charities: {
    name: string;
  } | null;
}

export default function DashboardCharityPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [charityId, setCharityId] = useState("");
  const [contributionPct, setContributionPct] = useState(10);
  const [donationCharityId, setDonationCharityId] = useState("");
  const [donationAmount, setDonationAmount] = useState(25);
  const [donationMessage, setDonationMessage] = useState("");
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [donationStatus, setDonationStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDonationStatus(params.get("donation"));
  }, []);

  useEffect(() => {
    async function loadCharities() {
      const supabase = createClient();
      setLoadError(null);

      const [{ data: charitiesData, error: charitiesError }, { data: userData }] = await Promise.all([
        supabase.from("charities").select("id, name").order("name", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (charitiesError) {
        setLoadError(charitiesError.message || "Unable to load charities");
        setLoading(false);
        return;
      }

      setCharities(charitiesData || []);

      if (userData.user?.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("charity_id, charity_contribution_pct")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (profileData?.charity_id) {
          setCharityId(profileData.charity_id);
          setDonationCharityId(profileData.charity_id);
        }

        if (profileData?.charity_contribution_pct) {
          setContributionPct(profileData.charity_contribution_pct);
        }
      }

      const donationResponse = await fetch("/api/donations?limit=6");
      const donationPayload = await donationResponse.json();
      if (donationResponse.ok) {
        setDonations(donationPayload.data || []);
      }

      setLoading(false);
    }

    loadCharities();
  }, []);

  async function savePreferences(event: React.FormEvent) {
    event.preventDefault();

    const response = await fetch("/api/charities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-profile-charity",
        charity_id: charityId,
        charity_contribution_pct: contributionPct,
      }),
    });

    const payload = await response.json();
    if (response.ok) {
      setMessage("Preferences updated");
    } else {
      setMessage(payload.error || "Update failed");
    }
  }

  async function startDonationCheckout(event: React.FormEvent) {
    event.preventDefault();
    setDonating(true);
    setMessage(null);

    const response = await fetch("/api/stripe/donation-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        charity_id: donationCharityId,
        amount: donationAmount,
        message: donationMessage || undefined,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.url) {
      setMessage(payload.error || "Unable to start donation checkout");
      setDonating(false);
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <main className="page-container max-w-4xl py-8">
      <DashboardNav />
      <h1 className="page-title text-4xl">Charity contribution</h1>
      <p className="page-subtitle">Choose where your contribution goes and define your impact percentage.</p>
      {donationStatus === "success" ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Donation received. Thank you for supporting this cause.</p> : null}
      {donationStatus === "cancelled" ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Donation checkout was cancelled.</p> : null}
      {loadError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p> : null}

      <form onSubmit={savePreferences} className="card mt-6 space-y-3">
        <label className="block text-sm font-medium">
          Selected charity
          <select className="ui-select mt-1" value={charityId} onChange={(e) => setCharityId(e.target.value)} required disabled={loading}>
            <option value="">Choose one</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>{charity.name}</option>
            ))}
          </select>
          {!loading && charities.length === 0 ? <p className="mt-1 text-xs text-[var(--muted)]">No charities available yet.</p> : null}
        </label>

        <label className="block text-sm font-medium">
          Contribution percentage
          <input type="number" min={10} max={100} value={contributionPct} onChange={(e) => setContributionPct(Number(e.target.value))} className="ui-input mt-1" />
        </label>

        <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Save</button>
      </form>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Independent donation</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Make a direct donation that is separate from subscription gameplay.</p>
        <form className="mt-4 space-y-3" onSubmit={startDonationCheckout}>
          <label className="block text-sm font-medium">
            Charity
            <select
              className="ui-select mt-1"
              value={donationCharityId}
              onChange={(e) => setDonationCharityId(e.target.value)}
              required
            >
              <option value="">Choose one</option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Amount (USD)
            <input
              type="number"
              min={1}
              step={1}
              value={donationAmount}
              onChange={(e) => setDonationAmount(Number(e.target.value))}
              className="ui-input mt-1"
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Message (optional)
            <textarea
              value={donationMessage}
              onChange={(e) => setDonationMessage(e.target.value)}
              rows={2}
              maxLength={300}
              className="ui-textarea mt-1"
              placeholder="Write a short note of support"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={donating || loading}
              className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {donating ? "Redirecting..." : "Donate now"}
            </button>
            <a href="/charities" className="ghost-button inline-flex">Browse charity profiles</a>
          </div>
        </form>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold">Recent independent donations</h2>
        {donations.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No donation records yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {donations.map((donation) => (
              <li key={donation.id} className="rounded-xl border border-black/10 p-3 text-sm">
                <p className="font-semibold text-[var(--ink-soft)]">{donation.charities?.name || "Charity"}</p>
                <p className="text-[var(--muted)]">
                  {Number(donation.amount).toLocaleString("en-US", { style: "currency", currency: donation.currency.toUpperCase() })}
                  {" "}•{" "}
                  {donation.payment_status}
                  {" "}•{" "}
                  {new Date(donation.created_at).toLocaleDateString("en-US")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
    </main>
  );
}
