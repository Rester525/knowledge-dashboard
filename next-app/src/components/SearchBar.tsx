"use client";

import { useState } from "react";

interface SearchResult {
  id: number;
  content: string;
  score: number;
  created_at: string;
}

function scoreBadge(score: number) {
  if (score >= 0.6) return <span className="score-badge-high">{Math.round(score * 100)}%</span>;
  if (score >= 0.3) return <span className="score-badge-mid">{Math.round(score * 100)}%</span>;
  return <span className="score-badge-low">{Math.round(score * 100)}%</span>;
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

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") search();
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-[#e1e1e9] font-semibold mb-3 text-sm uppercase tracking-wider">Search Notes</h3>
      <div className="flex gap-2">
        <input
          className="glass-input text-sm flex-1"
          placeholder='Search semantically... try "animals jumping"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn-primary text-sm px-4" onClick={search} disabled={loading}>
          Search
        </button>
      </div>

      {loading && (
        <p className="text-sm text-[#6b6b7b] mt-4">Searching...</p>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="text-sm text-[#6b6b7b] mt-4">No results found.</p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
          <p className="text-xs text-[#6b6b7b]">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          {results.map((r) => (
            <div key={r.id} className="border border-[#252530] rounded-xl p-3 bg-[#12121a]/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#6b6b7b]">{timeAgo(r.created_at)}</span>
                {scoreBadge(r.score)}
              </div>
              <p className="text-sm text-[#e1e1e9] line-clamp-3">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
