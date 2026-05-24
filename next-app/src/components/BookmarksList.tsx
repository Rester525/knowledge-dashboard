"use client";

import { showToast } from "./Toast";

interface Bookmark {
  id: number;
  url: string;
  title: string;
  created_at: string;
}

export function BookmarksList({ bookmarks, onRefresh }: { bookmarks: Bookmark[]; onRefresh: () => void }) {
  async function deleteBookmark(id: number) {
    try {
      const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Bookmark deleted");
      onRefresh();
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  if (bookmarks.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm text-slate-500">No links saved yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {bookmarks.map((b) => (
        <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group">
          <a
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0"
          >
            <p className="text-sm text-blue-600 truncate hover:underline">{b.title}</p>
            <p className="text-xs text-slate-400 truncate">{b.url}</p>
          </a>
          <button
            className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
            onClick={() => deleteBookmark(b.id)}
          >
            Del
          </button>
        </div>
      ))}
    </div>
  );
}
