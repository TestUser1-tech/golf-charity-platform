"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

type DonationStatus = "pending" | "paid" | "failed" | "refunded";

interface DonationRow {
  id: string;
  donor_email: string;
  amount: number;
  currency: string;
  message: string | null;
  payment_status: DonationStatus;
  created_at: string;
  completed_at: string | null;
  charities: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
}

export default function AdminDonationsPage() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | DonationStatus>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
    const response = await fetch(`/api/admin/donations${query}`);
    const payload = await response.json();
    setRows(payload.data || []);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, payment_status: DonationStatus) {
    setSavingId(id);
    const response = await fetch("/api/admin/donations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donationId: id, payment_status }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Donation updated" : payload.error || "Update failed");
    await load();
    setSavingId(null);
  }

  const totalPaid = rows
    .filter((row) => row.payment_status === "paid")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Independent donations</h1>
      <p className="page-subtitle">Track standalone charity donations, reconcile payment states, and review donor context.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Records in view</p>
          <p className="kpi">{rows.length}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid total (view)</p>
          <p className="kpi">{totalPaid.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
        </article>
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status filter</p>
          <select className="ui-select mt-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | DonationStatus)}>
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
            <option value="refunded">refunded</option>
          </select>
        </article>
      </div>

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-6 space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-[var(--ink-soft)]">{row.charities?.name || "Charity"} • {Number(row.amount).toLocaleString("en-US", { style: "currency", currency: row.currency.toUpperCase() })}</p>
                <p className="text-sm text-[var(--muted)]">Donor: {row.profiles?.full_name || row.donor_email}</p>
                <p className="text-sm text-[var(--muted)]">Created: {new Date(row.created_at).toLocaleString("en-US")}</p>
                <p className="text-sm text-[var(--muted)]">Status: {row.payment_status}{row.completed_at ? ` • Completed ${new Date(row.completed_at).toLocaleDateString("en-US")}` : ""}</p>
                {row.message ? <p className="text-sm text-[var(--muted)]">Message: {row.message}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ghost-button px-3 py-1" disabled={savingId === row.id} onClick={() => updateStatus(row.id, "pending")}>Set pending</button>
                <button type="button" className="ghost-button px-3 py-1" disabled={savingId === row.id} onClick={() => updateStatus(row.id, "paid")}>Set paid</button>
                <button type="button" className="ghost-button px-3 py-1" disabled={savingId === row.id} onClick={() => updateStatus(row.id, "failed")}>Set failed</button>
                <button type="button" className="ghost-button px-3 py-1" disabled={savingId === row.id} onClick={() => updateStatus(row.id, "refunded")}>Set refunded</button>
              </div>
            </div>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">No donations found for this filter.</p> : null}
      </div>
    </main>
  );
}
