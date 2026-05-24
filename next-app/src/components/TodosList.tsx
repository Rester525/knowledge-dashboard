"use client";

import { showToast } from "./Toast";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  created_at: string;
}

export function TodosList({ todos, onRefresh }: { todos: Todo[]; onRefresh: () => void }) {
  async function toggle(id: number) {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to toggle");
      onRefresh();
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  async function deleteTodo(id: number) {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Todo deleted");
      onRefresh();
    } catch (e) {
      showToast(String(e), "error");
    }
  }

  const pending = todos.filter((t) => !t.completed).length;

  if (todos.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm text-slate-500">Nothing yet. Add a task above.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">{pending} pending</span>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group">
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={t.completed}
              onChange={() => toggle(t.id)}
            />
            <span className={`text-sm flex-1 ${t.completed ? "line-through text-slate-400" : "text-slate-900"}`}>
              {t.text}
            </span>
            <button
              className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              onClick={() => deleteTodo(t.id)}
            >
              Del
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
