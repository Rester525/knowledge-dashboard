"use client";

import { useState } from "react";
import { showToast } from "./Toast";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Quiz {
  id: number;
  questions: QuizQuestion[];
  created_at: string;
}

export function QuizSection({
  quizzes,
  materialId,
  hasNotesheet,
  onQuizCreated,
}: {
  quizzes: Quiz[];
  materialId: number;
  hasNotesheet: boolean;
  onQuizCreated: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number>
  >({});
  const [submitted, setSubmitted] = useState(false);

  // Use the most recent quiz
  const latestQuiz = quizzes.length > 0 ? quizzes[0] : null;
  const questions = latestQuiz?.questions || [];

  async function generateQuiz() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/study/materials/${materialId}/quiz`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Quiz generation failed");
      }
      setSelectedAnswers({});
      setSubmitted(false);
      showToast("Quiz generated", "success");
      onQuizCreated();
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setGenerating(false);
    }
  }

  function selectAnswer(questionIndex: number, optionIndex: number) {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [String(questionIndex)]: optionIndex }));
  }

  function submitQuiz() {
    setSubmitted(true);
  }

  const correctCount = questions.reduce(
    (acc, q, i) => acc + (selectedAnswers[String(i)] === q.correctIndex ? 1 : 0),
    0
  );

  const allAnswered = questions.every(
    (_, i) => selectedAnswers[String(i)] !== undefined
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 font-semibold text-sm uppercase tracking-wider">
          Quiz
        </h3>
        {submitted && latestQuiz && (
          <span className="text-sm font-medium text-blue-600">
            {correctCount}/{questions.length} correct
          </span>
        )}
      </div>

      {!latestQuiz ? (
        <button
          className="btn-primary w-full text-sm"
          onClick={generateQuiz}
          disabled={generating || !hasNotesheet}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Quiz"
          )}
        </button>
      ) : (
        <div className="space-y-5">
          {questions.map((q, qi) => {
            const selected = selectedAnswers[String(qi)];
            const isCorrect =
              submitted && selected === q.correctIndex;
            const isWrong =
              submitted && selected !== undefined && selected !== q.correctIndex;

            return (
              <div key={qi}>
                <p className="text-sm font-medium text-slate-900 mb-2">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => {
                    let cls = "quiz-option";
                    if (submitted) {
                      if (oi === q.correctIndex) cls += " correct";
                      else if (selected === oi) cls += " incorrect";
                    } else if (selected === oi) {
                      cls += " selected";
                    }
                    return (
                      <button
                        key={oi}
                        className={cls}
                        onClick={() => selectAnswer(qi, oi)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {isCorrect && (
                  <p className="text-xs text-green-600 mt-1">Correct!</p>
                )}
                {isWrong && (
                  <p className="text-xs text-red-500 mt-1">
                    Incorrect — the correct answer is highlighted
                  </p>
                )}
              </div>
            );
          })}

          {!submitted && (
            <button
              className="btn-primary w-full text-sm"
              onClick={submitQuiz}
              disabled={!allAnswered}
            >
              Submit Answers
            </button>
          )}

          {submitted && (
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1 text-sm"
                onClick={() => {
                  setSubmitted(false);
                  setSelectedAnswers({});
                }}
              >
                Retry
              </button>
              <button
                className="btn-primary flex-1 text-sm"
                onClick={generateQuiz}
                disabled={generating}
              >
                New Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
