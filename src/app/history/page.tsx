"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Session {
  id: string;
  pdfName: string;
  score?: number;
  completedAt?: string;
  onChainTx?: string;
  questions: { length: number };
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { sessions: [] }))
      .then((data) => {
        const completed = (data.sessions || []).filter(
          (s: Session) => s.score != null && s.completedAt
        );
        setSessions(completed);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="text-[#00FFA3] hover:underline mb-6 inline-block"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-6">Quiz History</h1>

        {loading ? (
          <div className="animate-pulse text-slate-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="card text-center text-slate-400">
            No completed quizzes yet.{" "}
            <Link href="/upload" className="text-[#00FFA3] hover:underline">
              Upload a PDF
            </Link>{" "}
            and take a quiz!
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => {
              const total = s.questions?.length ?? 10;
              const pct =
                s.score != null ? Math.round((s.score / total) * 100) : 0;
              return (
                <div key={s.id} className="card flex justify-between items-center">
                  <div>
                    <h2 className="font-medium">{s.pdfName}</h2>
                    <p className="text-slate-400 text-sm">
                      {s.score}/{total} ({pct}%) ·{" "}
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.onChainTx && (
                      <a
                        href={`https://explorer.solana.com/tx/${s.onChainTx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        View on Solana
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
