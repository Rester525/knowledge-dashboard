"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmailScanner } from "./EmailScanner";
import { NewTodo } from "./NewTodo";
import { TodosList } from "./TodosList";

export function TasksTab() {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);

  const fetchTodos = useCallback(() => {
    fetch("/api/todos")
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchTodos();
  }, [user, fetchTodos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <EmailScanner onCreated={fetchTodos} />
        <NewTodo onCreated={fetchTodos} />
      </div>
      <div className="glass-card p-5">
        <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
          To-dos
        </h3>
        <TodosList todos={todos} onRefresh={fetchTodos} />
      </div>
    </div>
  );
}
