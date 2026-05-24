"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NewNote } from "./NewNote";
import { SearchBar } from "./SearchBar";
import { NotesList } from "./NotesList";

export function NotesTab() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);

  const fetchNotes = useCallback(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user, fetchNotes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NewNote onCreated={fetchNotes} />
        <SearchBar />
      </div>
      <div>
        <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider px-1">
          Recent Notes
        </h3>
        <NotesList notes={notes} onRefresh={fetchNotes} />
      </div>
    </div>
  );
}
