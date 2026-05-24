"use client";

import { useState } from "react";
import { showToast } from "./Toast";

export function MaterialUpload({ onCreated }: { onCreated: () => void }) {
  const [mode, setMode] = useState<"pdf" | "youtube">("pdf");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function uploadPDF(file: File) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/study/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      showToast("Notesheet generated", "success");
      onCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  async function submitYoutube() {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Extraction failed");
      }

      setYoutubeUrl("");
      showToast("Notesheet generated", "success");
      onCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) uploadPDF(file);
    };
    input.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      uploadPDF(file);
    } else {
      showToast("Please upload a PDF file", "error");
    }
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
        New Study Material
      </h3>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            mode === "pdf"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setMode("pdf")}
        >
          PDF
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            mode === "youtube"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setMode("youtube")}
        >
          YouTube
        </button>
      </div>

      {mode === "pdf" ? (
        <div
          className={`upload-zone ${dragOver ? "border-blue-500" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Processing PDF...
            </div>
          ) : (
            <>
              <div className="text-2xl mb-2">&#128196;</div>
              <p className="text-sm text-slate-500">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Extracts text and generates a study notesheet
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            className="glass-input text-sm"
            placeholder="Paste YouTube URL..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitYoutube()}
          />
          <button
            className="btn-primary w-full text-sm"
            onClick={submitYoutube}
            disabled={loading || !youtubeUrl.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Extracting...
              </span>
            ) : (
              "Extract & Generate Notesheet"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
