"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardNav } from "@/components/dashboard/nav";
import { createClient } from "@/lib/supabase/client";

interface Winner {
  id: string;
  match_type: string;
  prize_amount: number;
  payment_status: string;
  verification_status: string;
  proof_image_url?: string;
}

export default function WinningsPage() {
  const [winnings, setWinnings] = useState<Winner[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedWinner, setSelectedWinner] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadWinnings() {
      const response = await fetch("/api/winners");
      const payload = await response.json();
      setWinnings(payload.data || []);
    }

    loadWinnings();
  }, []);

  const total = useMemo(() => winnings.reduce((sum, item) => sum + Number(item.prize_amount || 0), 0), [winnings]);

  async function submitProof(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedWinner || !proofFile) {
      setMessage("Select a winning record and upload a proof image.");
      return;
    }

    setUploading(true);
    setMessage(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setMessage("Please sign in again to upload proof.");
      setUploading(false);
      return;
    }

    const extension = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/${selectedWinner}-${Date.now()}.${extension}`;

    const uploadResult = await supabase.storage.from("winner-proofs").upload(filePath, proofFile, {
      upsert: true,
      contentType: proofFile.type || "image/jpeg",
    });

    if (uploadResult.error) {
      setMessage(uploadResult.error.message || "File upload failed");
      setUploading(false);
      return;
    }

    const publicUrl = supabase.storage.from("winner-proofs").getPublicUrl(filePath).data.publicUrl;

    const response = await fetch("/api/winners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upload-proof",
        winnerId: selectedWinner,
        proof_image_url: publicUrl,
      }),
    });

    const payload = await response.json();
    if (response.ok) {
      setMessage("Proof uploaded for review");
      setProofFile(null);
      await fetch("/api/winners")
        .then((res) => res.json())
        .then((data) => setWinnings(data.data || []));
    } else {
      setMessage(payload.error || "Upload failed");
    }

    setUploading(false);
  }

  return (
    <main className="page-container max-w-4xl py-8">
      <DashboardNav />
      <h1 className="page-title text-4xl">Winnings overview</h1>
      <p className="page-subtitle">Track verification and payout progress for each prize tier.</p>
      <p className="mt-2 text-sm text-[var(--muted)]">Total won: {total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>

      <ul className="mt-6 space-y-2">
        {winnings.map((win) => (
          <li key={win.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{win.match_type}</p>
                <p className="text-sm text-[var(--muted)]">Verification: {win.verification_status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{Number(win.prize_amount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
                <p className="text-sm text-[var(--muted)]">Payment: {win.payment_status}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submitProof} className="card mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Upload winner proof</h2>
        <select value={selectedWinner} onChange={(e) => setSelectedWinner(e.target.value)} className="ui-select" required>
          <option value="">Select winning record</option>
          {winnings.map((win) => (
            <option key={win.id} value={win.id}>{win.match_type} - {win.id.slice(0, 8)}</option>
          ))}
        </select>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          className="ui-input text-sm"
          required
        />
        <button disabled={uploading} type="submit" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          {uploading ? "Uploading..." : "Submit proof"}
        </button>
      </form>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
    </main>
  );
}
