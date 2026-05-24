"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export function BookmarkBar({ onCreated }: { onCreated: () => void }) {
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

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="bookmark-bar">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-3 shrink-0">
        Bookmark
      </span>
      <input
        className="glass-input text-sm flex-1 min-w-0"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <input
        className="glass-input text-sm flex-1 min-w-0"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        className="btn-primary text-sm px-4 shrink-0"
        onClick={submit}
        disabled={loading || !title.trim() || !url.trim()}
      >
        Save
      </button>
    </div>
  );
}
