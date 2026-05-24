"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "./Toast";

interface GmailAccount {
  id: number;
  email: string;
  created_at: string;
}

export function EmailScanner({ onCreated }: { onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const fetchAccounts = useCallback(() => {
    fetch("/api/gmail/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setAccountsLoading(false));
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function connect() {
    try {
      const res = await fetch("/api/gmail/auth");
      if (!res.ok) throw new Error("Failed to start auth");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  async function disconnect(id: number) {
    try {
      const res = await fetch(`/api/gmail/accounts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      showToast("Account disconnected");
      fetchAccounts();
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  async function scan() {
    setLoading(true);
    try {
      const res = await fetch("/api/scan-emails", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      if (data.tasksFound > 0) {
        showToast(`${data.tasksFound} task${data.tasksFound > 1 ? "s" : ""} found`);
        onCreated();
      } else {
        showToast("No new tasks found");
      }
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
        Email Scanner
      </h3>

      {/* Connected accounts */}
      {!accountsLoading && accounts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5"
            >
              <span className="truncate mr-2">{a.email}</span>
              <button
                onClick={() => disconnect(a.id)}
                className="text-slate-500 hover:text-red-500 shrink-0 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {accounts.length > 0 && (
          <button
            className="btn-primary text-sm flex-1"
            onClick={scan}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning...
              </span>
            ) : (
              "Scan Emails"
            )}
          </button>
        )}
        <button
          className={accounts.length > 0 ? "btn-ghost text-sm" : "btn-primary text-sm flex-1"}
          onClick={connect}
        >
          {accounts.length > 0 ? "+" : "Connect Gmail"}
        </button>
      </div>

      {accounts.length === 0 && !accountsLoading && (
        <p className="text-xs text-slate-500 mt-2">
          Connect a Google account to scan emails for tasks.
        </p>
      )}
    </div>
  );
}
