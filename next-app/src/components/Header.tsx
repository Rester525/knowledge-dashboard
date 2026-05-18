"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)" }}>
          K
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#e1e1e9]">Knowledge Dashboard</h1>
          <p className="text-sm text-[#6b6b7b]">local / private / smart</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-[#6b6b7b]">
        {user && (
          <>
            <span className="hidden sm:inline">{user.email}</span>
            <button className="btn-ghost" onClick={logout}>
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
