"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  country_code: string | null;
  created_at: string;
}

export default function AdminCampaignsPage() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/campaigns");
    const payload = await response.json();
    setRows(payload.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        country_code: countryCode || undefined,
        starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
        ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
      }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Campaign created" : payload.error || "Creation failed");

    if (response.ok) {
      setName("");
      setDescription("");
      setCountryCode("");
      setStartsAt("");
      setEndsAt("");
      await load();
    }
  }

  async function toggleActive(campaign: CampaignRow) {
    const response = await fetch("/api/admin/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.id, is_active: !campaign.is_active }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Campaign updated" : payload.error || "Update failed");
    await load();
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Campaign management</h1>
      <p className="page-subtitle">Prepare market-specific campaigns, activation windows, and future growth tracks.</p>

      <form className="card mt-6 space-y-3" onSubmit={createCampaign}>
        <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required />
        <textarea className="ui-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="ui-input" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="Country code (e.g. IN)" maxLength={8} />
          <input className="ui-input" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input className="ui-input" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Create campaign</button>
      </form>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-6 space-y-2">
        {rows.map((campaign) => (
          <article key={campaign.id} className="card flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--ink-soft)]">{campaign.name}</p>
              <p className="text-sm text-[var(--muted)]">{campaign.description || "No description"}</p>
              <p className="text-sm text-[var(--muted)]">Country: {campaign.country_code || "Global"}</p>
              <p className="text-sm text-[var(--muted)]">Window: {campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString("en-US") : "N/A"} - {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString("en-US") : "N/A"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-chip">{campaign.is_active ? "active" : "inactive"}</span>
              <button type="button" className="ghost-button px-3 py-1" onClick={() => toggleActive(campaign)}>
                {campaign.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">No campaigns created yet.</p> : null}
      </div>
    </main>
  );
}
