"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthForm } from "@/components/auth/AuthForm";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BookmarkBar } from "@/components/BookmarkBar";
import { TasksTab } from "@/components/TasksTab";
import { NotesTab } from "@/components/NotesTab";
import { StudyPanel } from "@/components/StudyPanel";
import { ToastContainer, showToast } from "@/components/Toast";

export default function Home() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("tasks");
  const [bookmarks, setBookmarks] = useState([]);

  const fetchBookmarks = useCallback(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then(setBookmarks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchBookmarks();
  }, [user, fetchBookmarks]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    if (gmail === "connected") {
      showToast("Gmail account connected successfully", "success");
      window.history.replaceState({}, "", "/");
    } else if (gmail === "error") {
      const msg = params.get("msg");
      showToast(
        msg ? decodeURIComponent(msg) : "Failed to connect Gmail account",
        "error"
      );
      window.history.replaceState({}, "", "/");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bookmarks={bookmarks}
        onBookmarksRefresh={fetchBookmarks}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <BookmarkBar onCreated={fetchBookmarks} />
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "study" && <StudyPanel />}
          {activeTab === "notes" && <NotesTab />}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
