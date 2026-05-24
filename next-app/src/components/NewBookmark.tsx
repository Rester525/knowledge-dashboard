"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export function NewBookmark({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), url: url.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle("");
      setUrl("");
      showToast("Bookmark saved");
      onCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">New Bookmark</h3>
      <input
        className="glass-input text-sm mb-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="glass-input text-sm"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="btn-primary w-full mt-3 text-sm"
        onClick={submit}
        disabled={loading || !title.trim() || !url.trim()}
      >
        Save Link
      </button>
    </div>
  );
}
