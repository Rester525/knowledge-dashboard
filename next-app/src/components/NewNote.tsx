"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export function NewNote({ onCreated }: { onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setContent("");
      showToast("Note saved & indexed");
      onCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">New Note</h3>
      <textarea
        className="glass-input resize-none h-28 text-sm"
        placeholder="Capture a thought..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        className="btn-primary w-full mt-3 text-sm"
        onClick={submit}
        disabled={loading || !content.trim()}
      >
        {loading ? "Indexing..." : "Save & Index"}
      </button>
    </div>
  );
}
