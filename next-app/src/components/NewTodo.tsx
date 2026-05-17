"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export function NewTodo({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setText("");
      showToast("Todo added");
      onCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-[#e1e1e9] font-semibold mb-3 text-sm uppercase tracking-wider">New To-do</h3>
      <div className="flex gap-2">
        <input
          className="glass-input text-sm flex-1"
          placeholder="What needs doing?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="btn-primary text-sm px-4"
          onClick={submit}
          disabled={loading || !text.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
