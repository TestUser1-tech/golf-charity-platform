"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface Draw {
  id: string;
  draw_month: string;
  draw_type: string;
  status: string;
  drawn_numbers: number[] | null;
}

export default function AdminDrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawMonth, setDrawMonth] = useState(new Date().toISOString().slice(0, 10));
  const [drawType, setDrawType] = useState<"random" | "algorithmic">("random");
  const [algorithmMode, setAlgorithmMode] = useState<"most-frequent" | "least-frequent">("most-frequent");
  const [message, setMessage] = useState<string | null>(null);

  async function loadDraws() {
    const response = await fetch("/api/draws");
    const payload = await response.json();
    setDraws(payload.data || []);
  }

  useEffect(() => {
    loadDraws();
  }, []);

  async function simulate() {
    const response = await fetch("/api/draws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "simulate", draw_month: drawMonth, draw_type: drawType, algorithmMode, total_prize_pool: 0 }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Simulation created" : payload.error || "Simulation failed");
    await loadDraws();
  }

  async function publish(drawId: string) {
    const response = await fetch("/api/draws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", drawId, draw_type: drawType, algorithmMode }),
    });

    const payload = await response.json();
    setMessage(response.ok ? `Draw published: ${payload.data.drawnNumbers.join(", ")}` : payload.error || "Publish failed");
    await loadDraws();
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Draw management</h1>
      <p className="page-subtitle">Run simulations, inspect outcomes, and publish monthly draw results with confidence.</p>
      <div className="card mt-6 grid gap-3 sm:grid-cols-4">
        <input value={drawMonth} onChange={(e) => setDrawMonth(e.target.value)} type="date" className="ui-input" />
        <select value={drawType} onChange={(e) => setDrawType(e.target.value as "random" | "algorithmic")} className="ui-select">
          <option value="random">random</option>
          <option value="algorithmic">algorithmic</option>
        </select>
        <select value={algorithmMode} onChange={(e) => setAlgorithmMode(e.target.value as "most-frequent" | "least-frequent")} className="ui-select">
          <option value="most-frequent">most frequent</option>
          <option value="least-frequent">least frequent</option>
        </select>
        <button onClick={simulate} type="button" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Run simulation</button>
      </div>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-6 space-y-2">
        {draws.map((draw) => (
          <article key={draw.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{new Date(draw.draw_month).toLocaleDateString()} | {draw.draw_type}</p>
              <p className="text-sm text-[var(--muted)]">Status: {draw.status} | Numbers: {(draw.drawn_numbers || []).join(", ") || "pending"}</p>
            </div>
            {draw.status !== "published" ? (
              <button onClick={() => publish(draw.id)} type="button" className="ghost-button px-3 py-1">Publish</button>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
