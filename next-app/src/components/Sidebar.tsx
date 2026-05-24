"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BookmarksList } from "./BookmarksList";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "tasks", label: "Tasks", icon: "check" },
  { id: "study", label: "Study", icon: "book" },
  { id: "notes", label: "Notes", icon: "file" },
];

export function Sidebar({
  activeTab,
  onTabChange,
  bookmarks,
  onBookmarksRefresh,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  bookmarks: { id: number; url: string; title: string; created_at: string }[];
  onBookmarksRefresh: () => void;
}) {
  return (
    <aside className="sidebar flex flex-col">
      <div className="flex items-center gap-3 mb-6 px-2">
        <span className="text-lg font-bold text-slate-900">Knowledge</span>
      </div>

      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon === "check" ? <CheckIcon /> : tab.icon === "book" ? <BookIcon /> : <FileIcon />}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Bookmarks list always visible in sidebar */}
      <div className="mt-6 flex-1 overflow-y-auto min-h-0">
        <h3 className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-2">
          Bookmarks
        </h3>
        <BookmarksList bookmarks={bookmarks} onRefresh={onBookmarksRefresh} />
      </div>
    </aside>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}
