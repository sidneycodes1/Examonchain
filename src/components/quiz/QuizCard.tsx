"use client";

import { Question } from "@/types";

interface QuizCardProps {
  question: Question;
  index: number;
  total: number;
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
  showResult: boolean;
}

export function QuizCard({
  question,
  index,
  total,
  selectedAnswer,
  onSelect,
  showResult,
}: QuizCardProps) {
  const correctIndex = question.correctAnswer;
  const isCorrect = selectedAnswer === correctIndex;

  function getOptionStyle(optIndex: number) {
    if (!showResult) {
      return selectedAnswer === optIndex
        ? "border-[#00FFA3] bg-[#00FFA3]/10"
        : "border-[#1e2840] hover:border-[#1e2840]/80";
    }
    if (optIndex === correctIndex) return "border-[#00FFA3] bg-[#00FFA3]/20";
    if (optIndex === selectedAnswer && !isCorrect)
      return "border-red-500 bg-red-500/20";
    return "border-[#1e2840] opacity-60";
  }

  return (
    <div className="card">
      <div className="flex justify-between text-sm text-slate-400 mb-4">
        <span>
          Question {index + 1} of {total}
        </span>
        <div className="h-2 flex-1 max-w-[200px] ml-4 rounded-full bg-[#1e2840] overflow-hidden">
          <div
            className="h-full bg-[#00FFA3] transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>
      <h2 className="text-lg font-medium mb-6">{question.question}</h2>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => !showResult && onSelect(i)}
            disabled={showResult}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${getOptionStyle(
              i
            )}`}
          >
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>
      {showResult && (
        <div className="mt-6 p-4 rounded-lg bg-[#1e2840]/50">
          <p className="text-sm font-medium text-[#00FFA3] mb-1">Explanation</p>
          <p className="text-slate-300 text-sm">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
