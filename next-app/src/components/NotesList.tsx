"use client";

import { showToast } from "./Toast";

interface Note {
  id: number;
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotesList({ notes, onRefresh }: { notes: Note[]; onRefresh: () => void }) {
  async function deleteNote(id: number) {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Note deleted");
      onRefresh();
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  if (notes.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm text-[#6b6b7b]">No notes yet. Create one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.id} className="glass-card p-4 group relative">
          <p className="text-sm text-[#e1e1e9] whitespace-pre-wrap">{n.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#6b6b7b]">{timeAgo(n.created_at)}</span>
            <button
              className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteNote(n.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
