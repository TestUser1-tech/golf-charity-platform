"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "subscriber" | "admin";
  subscription_status: string;
  subscription_plan: string | null;
  scores?: Array<{
    id: string;
    score: number;
    score_date: string;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    const payload = await response.json();
    setUsers(payload.data || []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function updateUser(id: string, patch: Record<string, string | null>) {
    setSavingId(id);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "User updated" : payload.error || "Update failed");
    await loadUsers();
    setSavingId(null);
  }

  async function updateScore(userId: string, scoreId: string, score: number, scoreDate: string) {
    setSavingId(userId);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-score",
        id: userId,
        scoreId,
        score,
        score_date: scoreDate,
      }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Score updated" : payload.error || "Score update failed");
    await loadUsers();
    setSavingId(null);
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">User management</h1>
      <p className="page-subtitle">Edit roles, subscription states, plans, and score records from one admin surface.</p>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      <div className="mt-6 space-y-2">
        {users.map((user) => (
          <article key={user.id} className="card space-y-3">
            <div>
              <p className="font-semibold">{user.email}</p>
              <p className="text-sm text-[var(--muted)]">User ID: {user.id.slice(0, 8)}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <input
                defaultValue={user.full_name || ""}
                onBlur={(e) => updateUser(user.id, { full_name: e.target.value || null })}
                className="ui-input"
                placeholder="Full name"
              />
              <select
                onChange={(e) => updateUser(user.id, { role: e.target.value })}
                defaultValue={user.role}
                className="ui-select"
              >
                <option value="subscriber">subscriber</option>
                <option value="admin">admin</option>
              </select>
              <select
                onChange={(e) => updateUser(user.id, { subscription_plan: e.target.value || null })}
                defaultValue={user.subscription_plan || ""}
                className="ui-select"
              >
                <option value="">none</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
              </select>
              <select
                onChange={(e) => updateUser(user.id, { subscription_status: e.target.value })}
                defaultValue={user.subscription_status}
                className="ui-select"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="lapsed">lapsed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Recent scores</p>
              <div className="space-y-2">
                {(user.scores || []).map((score) => (
                  <div key={score.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="number"
                      min={1}
                      max={45}
                      defaultValue={score.score}
                      className="ui-input"
                      id={`score-${user.id}-${score.id}`}
                    />
                    <input
                      type="date"
                      defaultValue={score.score_date}
                      className="ui-input"
                      id={`score-date-${user.id}-${score.id}`}
                    />
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        const scoreInput = document.getElementById(`score-${user.id}-${score.id}`) as HTMLInputElement | null;
                        const dateInput = document.getElementById(`score-date-${user.id}-${score.id}`) as HTMLInputElement | null;
                        const nextScore = Number(scoreInput?.value || score.score);
                        const nextDate = dateInput?.value || score.score_date;
                        updateScore(user.id, score.id, nextScore, nextDate);
                      }}
                    >
                      Save score
                    </button>
                  </div>
                ))}
                {(user.scores || []).length === 0 ? <p className="text-xs text-[var(--muted)]">No scores recorded.</p> : null}
              </div>
            </div>

            {savingId === user.id ? <p className="text-xs text-[var(--muted)]">Saving...</p> : null}
          </article>
        ))}
      </div>
    </main>
  );
}
