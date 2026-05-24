"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialUpload } from "./MaterialUpload";
import { NotesheetDisplay } from "./NotesheetDisplay";
import { QuizSection } from "./QuizSection";

interface StudyMaterial {
  id: number;
  title: string;
  source_type: string;
  source_url: string | null;
  raw_text?: string;
  notesheet: string | null;
  quizzes: Quiz[];
  created_at: string;
}

interface Quiz {
  id: number;
  questions: { question: string; options: string[]; correctIndex: number }[];
  created_at: string;
}

export function StudyPanel() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedMaterial, setSelectedMaterial] =
    useState<StudyMaterial | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(false);

  const fetchMaterials = useCallback(() => {
    fetch("/api/study/materials")
      .then((r) => r.json())
      .then((data) => setMaterials(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    if (selectedId === null) {
      setSelectedMaterial(null);
      return;
    }
    setLoadingMaterial(true);
    fetch(`/api/study/materials/${selectedId}`)
      .then((r) => r.json())
      .then(setSelectedMaterial)
      .catch(() => {})
      .finally(() => setLoadingMaterial(false));
  }, [selectedId]);

  function handleCreated() {
    fetchMaterials();
  }

  async function regenerateNotesheet() {
    if (!selectedId) return;
    setLoadingMaterial(true);
    try {
      const res = await fetch(
        `/api/study/materials/${selectedId}/notesheet`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedMaterial((prev) =>
          prev ? { ...prev, notesheet: data.notesheet } : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setLoadingMaterial(false);
    }
  }

  async function deleteMaterial(id: number) {
    try {
      await fetch(`/api/study/materials/${id}`, { method: "DELETE" });
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedMaterial(null);
      }
      fetchMaterials();
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left column — upload + material list */}
      <div className="w-[320px] flex-shrink-0 space-y-4">
        <MaterialUpload onCreated={handleCreated} />

        {materials.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
              Materials
            </h3>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedId === m.id
                      ? "bg-blue-50 text-slate-900"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <span className="truncate mr-2">{m.title}</span>
                  <button
                    className="text-slate-500 hover:text-red-500 shrink-0 transition-colors text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMaterial(m.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column — notesheet + quiz */}
      <div className="flex-1 space-y-4 min-w-0">
        {selectedMaterial ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedMaterial.title}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedMaterial.source_type === "youtube"
                    ? "YouTube Video"
                    : "PDF Document"}
                </p>
              </div>
              <button
                className="btn-ghost text-xs"
                onClick={regenerateNotesheet}
              >
                Regenerate
              </button>
            </div>

            <NotesheetDisplay
              notesheet={selectedMaterial.notesheet}
              loading={loadingMaterial}
            />

            <QuizSection
              quizzes={selectedMaterial.quizzes || []}
              materialId={selectedMaterial.id}
              hasNotesheet={!!selectedMaterial.notesheet}
              onQuizCreated={() => {
                // Refresh the material to get updated quizzes
                setSelectedId(selectedMaterial.id);
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] text-center">
            <div>
              <div className="text-3xl mb-3">&#128218;</div>
              <p className="text-sm text-slate-500">
                Upload a PDF or paste a YouTube URL to get started
              </p>
              <p className="text-xs text-slate-400 mt-1">
                AI will generate a study notesheet and quiz for you
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
