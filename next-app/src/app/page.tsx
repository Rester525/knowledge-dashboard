"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { NewNote } from "@/components/NewNote";
import { NewTodo } from "@/components/NewTodo";
import { NewBookmark } from "@/components/NewBookmark";
import { SearchBar } from "@/components/SearchBar";
import { NotesList } from "@/components/NotesList";
import { TodosList } from "@/components/TodosList";
import { BookmarksList } from "@/components/BookmarksList";
import { ToastContainer } from "@/components/Toast";

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  const fetchNotes = useCallback(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then(setNotes)
      .catch(() => {});
  }, []);

  const fetchTodos = useCallback(() => {
    fetch("/api/todos")
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => {});
  }, []);

  const fetchBookmarks = useCallback(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then(setBookmarks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchTodos();
    fetchBookmarks();
  }, [fetchNotes, fetchTodos, fetchBookmarks]);

  const refreshAll = useCallback(() => {
    fetchNotes();
    fetchTodos();
    fetchBookmarks();
  }, [fetchNotes, fetchTodos, fetchBookmarks]);

  return (
    <div className="relative z-10">
      <Header />

      <div className="bento-grid">
        {/* Left column — capture */}
        <div className="space-y-4">
          <NewNote onCreated={refreshAll} />
          <NewTodo onCreated={refreshAll} />
          <NewBookmark onCreated={refreshAll} />
        </div>

        {/* Middle column — search + notes */}
        <div className="space-y-4">
          <SearchBar />
          <div>
            <h3 className="text-[#e1e1e9] font-semibold mb-3 text-sm uppercase tracking-wider px-1">Recent Notes</h3>
            <NotesList notes={notes} onRefresh={refreshAll} />
          </div>
        </div>

        {/* Right column — todos + bookmarks */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-[#e1e1e9] font-semibold mb-3 text-sm uppercase tracking-wider">To-dos</h3>
            <TodosList todos={todos} onRefresh={refreshAll} />
          </div>
          <div className="glass-card p-5">
            <h3 className="text-[#e1e1e9] font-semibold mb-3 text-sm uppercase tracking-wider">Bookmarks</h3>
            <BookmarksList bookmarks={bookmarks} onRefresh={refreshAll} />
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
