"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface OrganizationRow {
  id: string;
  name: string;
  country_code: string | null;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const [rows, setRows] = useState<OrganizationRow[]>([]);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/organizations");
    const payload = await response.json();
    setRows(payload.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        country_code: countryCode || undefined,
      }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Organization created" : payload.error || "Creation failed");

    if (response.ok) {
      setName("");
      setCountryCode("");
      await load();
    }
  }

  async function saveOrganization(id: string) {
    const nameInput = document.getElementById(`org-name-${id}`) as HTMLInputElement | null;
    const countryInput = document.getElementById(`org-country-${id}`) as HTMLInputElement | null;

    const response = await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: nameInput?.value,
        country_code: countryInput?.value || null,
      }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Organization updated" : payload.error || "Update failed");
    await load();
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Organizations</h1>
      <p className="page-subtitle">Manage enterprise entities to support teams and corporate account expansion.</p>

      <form className="card mt-6 space-y-3" onSubmit={createOrganization}>
        <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" required />
        <input className="ui-input" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="Country code (optional)" maxLength={8} />
        <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Create organization</button>
      </form>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-6 space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="card grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-center">
            <input id={`org-name-${row.id}`} defaultValue={row.name} className="ui-input" />
            <input id={`org-country-${row.id}`} defaultValue={row.country_code || ""} className="ui-input" />
            <button type="button" className="ghost-button" onClick={() => saveOrganization(row.id)}>Save</button>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">No organizations yet.</p> : null}
      </div>
    </main>
  );
}
