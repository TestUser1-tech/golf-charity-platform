"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/nav";

interface Charity {
  id: string;
  name: string;
  description: string;
  is_featured: boolean;
  image_url?: string | null;
  upcoming_events?: Array<{ title: string; date: string }>;
}

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [eventsText, setEventsText] = useState("[]");
  const [isFeatured, setIsFeatured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/charities");
    const payload = await response.json();
    setCharities(payload.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCharity(event: React.FormEvent) {
    event.preventDefault();

    let parsedEvents: Array<{ title: string; date: string }> = [];
    try {
      parsedEvents = eventsText.trim() ? JSON.parse(eventsText) : [];
    } catch {
      setMessage("Upcoming events JSON is invalid.");
      return;
    }

    const response = await fetch("/api/charities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        is_featured: isFeatured,
        image_url: imageUrl || undefined,
        upcoming_events: parsedEvents,
      }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Charity created" : payload.error || "Creation failed");
    if (response.ok) {
      setName("");
      setDescription("");
      setImageUrl("");
      setEventsText("[]");
      setIsFeatured(false);
      await load();
    }
  }

  async function updateCharity(id: string, patch: Record<string, unknown>) {
    const response = await fetch("/api/charities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });

    const payload = await response.json();
    setMessage(response.ok ? "Charity updated" : payload.error || "Update failed");
    await load();
  }

  async function toggleFeatured(charity: Charity) {
    await updateCharity(charity.id, { is_featured: !charity.is_featured });
  }

  async function saveInlineEdit(charity: Charity) {
    const nameInput = document.getElementById(`charity-name-${charity.id}`) as HTMLInputElement | null;
    const descInput = document.getElementById(`charity-description-${charity.id}`) as HTMLTextAreaElement | null;
    const imageInput = document.getElementById(`charity-image-${charity.id}`) as HTMLInputElement | null;
    const eventsInput = document.getElementById(`charity-events-${charity.id}`) as HTMLTextAreaElement | null;

    let parsedEvents: Array<{ title: string; date: string }> = [];
    try {
      parsedEvents = eventsInput?.value?.trim() ? JSON.parse(eventsInput.value) : [];
    } catch {
      setMessage("Upcoming events JSON is invalid.");
      return;
    }

    await updateCharity(charity.id, {
      name: nameInput?.value || charity.name,
      description: descInput?.value || "",
      image_url: imageInput?.value || undefined,
      upcoming_events: parsedEvents,
    });
    setEditingId(null);
  }

  async function removeCharity(id: string) {
    const response = await fetch(`/api/charities?id=${id}`, { method: "DELETE" });
    const payload = await response.json();
    setMessage(response.ok ? "Charity deleted" : payload.error || "Delete failed");
    await load();
  }

  return (
    <main className="page-container py-8">
      <AdminNav />
      <h1 className="page-title">Charity management</h1>
      <p className="page-subtitle">Curate featured causes, storytelling media, and event timelines.</p>
      <form className="card mt-6 space-y-3" onSubmit={createCharity}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Charity name" className="ui-input" required />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="ui-textarea" rows={3} />
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" className="ui-input" />
        <textarea
          value={eventsText}
          onChange={(e) => setEventsText(e.target.value)}
          placeholder='Upcoming events JSON e.g. [{"title":"Charity Golf Day","date":"2026-09-10"}]'
          className="ui-textarea font-mono text-xs"
          rows={4}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured charity
        </label>
        <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Create charity</button>
      </form>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      <div className="mt-6 space-y-2">
        {charities.map((charity) => (
          <article key={charity.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full">
              {editingId === charity.id ? (
                <div className="space-y-2">
                  <input id={`charity-name-${charity.id}`} defaultValue={charity.name} className="ui-input" />
                  <textarea id={`charity-description-${charity.id}`} defaultValue={charity.description} className="ui-textarea" rows={3} />
                  <input id={`charity-image-${charity.id}`} defaultValue={charity.image_url || ""} className="ui-input" />
                  <textarea
                    id={`charity-events-${charity.id}`}
                    defaultValue={JSON.stringify(charity.upcoming_events || [], null, 2)}
                    className="ui-textarea font-mono text-xs"
                    rows={4}
                  />
                </div>
              ) : (
                <>
                  <p className="font-semibold">{charity.name}</p>
                  <p className="text-sm text-[var(--muted)]">{charity.description}</p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggleFeatured(charity)} className="ghost-button px-3 py-1">{charity.is_featured ? "Unfeature" : "Feature"}</button>
              {editingId === charity.id ? (
                <button type="button" onClick={() => saveInlineEdit(charity)} className="ghost-button px-3 py-1">Save</button>
              ) : (
                <button type="button" onClick={() => setEditingId(charity.id)} className="ghost-button px-3 py-1">Edit</button>
              )}
              <button type="button" onClick={() => removeCharity(charity.id)} className="ghost-button px-3 py-1">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
