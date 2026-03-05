"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QuizCard } from "@/components/quiz/QuizCard";
import type { QuizSession } from "@/types";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/${id}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) setSession(data.session);
        else {
          toast.error("Quiz not found");
          router.push("/dashboard");
        }
      })
      .catch(() => {
        toast.error("Failed to load quiz");
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const question = session?.questions[currentIndex];
  const selectedAnswer = answers[currentIndex] ?? null;

  function handleSelect(optIndex: number) {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optIndex }));
    setShowResult(true);
  }

  function handleNext() {
    if (currentIndex < (session?.questions.length ?? 1) - 1) {
      setCurrentIndex((i) => i + 1);
      setShowResult(false);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    if (!session) return;
    const total = session.questions.length;
    const correct = Object.entries(answers).filter(
      ([i, a]) => session.questions[Number(i)]?.correctAnswer === a
    ).length;
    setSaving(true);
    try {
      const res = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          score: correct,
          total,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to save score");
      }
      setCompleted(true);
    } catch {
      toast.error("Failed to save score");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading quiz...</div>
      </div>
    );
  }

  if (completed) {
    const total = session.questions.length;
    const correct = Object.entries(answers).filter(
      ([i, a]) => session.questions[Number(i)]?.correctAnswer === a
    ).length;
    const pct = Math.round((correct / total) * 100);
    let emoji = "📚";
    if (pct >= 90) emoji = "🎉";
    else if (pct >= 70) emoji = "👍";
    else if (pct >= 50) emoji = "📖";

    return (
      <div className="min-h-screen px-4 py-8 flex flex-col items-center justify-center">
        <div className="card max-w-md text-center">
          <span className="text-5xl mb-4">{emoji}</span>
          <h1 className="text-2xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-4xl font-bold text-[#00FFA3] mb-4">
            {correct}/{total} ({pct}%)
          </p>
          <Link href="/history" className="btn-primary inline-block">
            View History
          </Link>
          <Link href="/dashboard" className="btn-secondary inline-block mt-4 ml-4">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="text-[#00FFA3] hover:underline mb-6 inline-block"
        >
          ← Dashboard
        </Link>
        {question && (
          <>
            <QuizCard
              question={question}
              index={currentIndex}
              total={session.questions.length}
              selectedAnswer={selectedAnswer}
              onSelect={handleSelect}
              showResult={showResult}
            />
            {showResult && (
              <button
                onClick={handleNext}
                disabled={saving}
                className="btn-primary mt-6 w-full"
              >
                {currentIndex < session.questions.length - 1
                  ? "Next Question"
                  : "Finish Quiz"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
