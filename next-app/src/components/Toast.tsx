"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  text: string;
  type: "success" | "error";
}

let addToastFn: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string, type: "success" | "error" = "success") {
  addToastFn?.({ text, type });
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    addToastFn = setToast;
    return () => { addToastFn = null; };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="toast fixed bottom-6 right-6 z-50">
      <div className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg border ${
        toast.type === "success"
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-red-50 border-red-200 text-red-700"
      }`}>
        {toast.text}
      </div>
    </div>
  );
}
