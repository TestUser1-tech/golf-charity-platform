"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/nav";

interface Score {
  id: string;
  score: number;
  score_date: string;
}

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [score, setScore] = useState<number>(36);
  const [scoreDate, setScoreDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadScores() {
    const response = await fetch("/api/scores");
    const payload = await response.json();
    if (response.ok) {
      setScores(payload.data || []);
    } else {
      setError(payload.error || "Unable to load scores");
    }
  }

  useEffect(() => {
    loadScores();
  }, []);

  async function submitScore(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!Number.isInteger(score) || score < 1 || score > 45) {
      setError("Score must be an integer between 1 and 45");
      return;
    }

    if (!scoreDate) {
      setError("Score date is required");
      return;
    }

    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, score, score_date: scoreDate } : { score, score_date: scoreDate };

    const response = await fetch("/api/scores", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.formErrors?.[0] || payload.error || "Save failed");
      return;
    }

    setEditingId(null);
    await loadScores();
  }

  function startEdit(item: Score) {
    setEditingId(item.id);
    setScore(item.score);
    setScoreDate(item.score_date);
  }

  return (
    <main className="page-container max-w-4xl py-8">
      <DashboardNav />
      <h1 className="page-title text-4xl">Score entry and edit</h1>
      <p className="page-subtitle">Keep your latest five Stableford scores accurate and ready for upcoming draws.</p>

      <form onSubmit={submitScore} className="card mt-6 grid gap-3 sm:grid-cols-3">
        <input type="number" min={1} max={45} value={score} onChange={(e) => setScore(Number(e.target.value))} className="ui-input" />
        <input type="date" value={scoreDate} onChange={(e) => setScoreDate(e.target.value)} className="ui-input" />
        <button className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" type="submit">
          {editingId ? "Update score" : "Add score"}
        </button>
      </form>

      {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 card">
        <h2 className="text-lg font-semibold">Latest 5 scores (most recent first)</h2>
        <p className="text-sm text-[var(--muted)]">Stored count: {scores.length} / 5</p>
        <ul className="mt-3 space-y-2">
          {scores.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-black/10 p-2">
              <span>{new Date(item.score_date).toLocaleDateString()}</span>
              <div className="flex items-center gap-3">
                <strong>{item.score}</strong>
                <button onClick={() => startEdit(item)} type="button" className="text-sm font-semibold text-[var(--accent)]">Edit</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
