"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { showToast } from "./Toast";

interface GmailAccount {
  id: number;
  email: string;
  created_at: string;
}

export function Header() {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);

  const fetchAccounts = useCallback(() => {
    fetch("/api/gmail/accounts")
      .then((r) => r.json())
      .then((a) => setAccounts(Array.isArray(a) ? a : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user, fetchAccounts]);

  async function connectGmail() {
    try {
      const res = await fetch("/api/gmail/auth");
      if (!res.ok) throw new Error("Failed to start auth");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  return (
    <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-slate-900">Knowledge</span>
        <span className="text-sm text-slate-400 hidden sm:inline">|</span>
        <span className="text-sm text-slate-500 hidden sm:inline">AI Study Dashboard</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {user && (
          <>
            {accounts.length === 0 && (
              <button className="btn-primary text-sm" onClick={connectGmail}>
                Connect Gmail
              </button>
            )}
            {accounts.length > 0 && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                {accounts[0].email}
              </span>
            )}
            <span className="hidden sm:inline text-slate-500">{user.email}</span>
            <button className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
