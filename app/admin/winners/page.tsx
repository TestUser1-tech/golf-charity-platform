"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface Winner {
  id: string;
  match_type: string;
  prize_amount: number;
  verification_status: string;
  payment_status: string;
  proof_image_url: string | null;
}

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadWinners() {
    const response = await fetch("/api/winners");
    const payload = await response.json();
    setWinners(payload.data || []);
  }

  useEffect(() => {
    loadWinners();
  }, []);

  async function updateWinner(winnerId: string, update: Record<string, string>) {
    const response = await fetch("/api/winners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, ...update }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Winner updated" : payload.error || "Update failed");
    await loadWinners();
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Winner verification and payouts</h1>
      <p className="page-subtitle">Review submitted evidence, approve winners, and mark payout completion.</p>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-6 space-y-3">
        {winners.map((winner) => (
          <article key={winner.id} className="card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{winner.match_type}</p>
                <p className="text-sm text-[var(--muted)]">Prize: {Number(winner.prize_amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
                <p className="text-sm text-[var(--muted)]">Proof: {winner.proof_image_url ? <a className="text-[var(--accent)]" href={winner.proof_image_url} target="_blank">View upload</a> : "Not provided"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateWinner(winner.id, { verification_status: "approved" })} className="ghost-button px-3 py-1">Approve</button>
                <button onClick={() => updateWinner(winner.id, { verification_status: "rejected" })} className="ghost-button px-3 py-1">Reject</button>
                <button onClick={() => updateWinner(winner.id, { payment_status: "paid" })} className="ghost-button px-3 py-1">Mark paid</button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">Verification: {winner.verification_status} | Payment: {winner.payment_status}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
