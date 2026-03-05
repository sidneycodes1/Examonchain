"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SummaryView } from "@/components/summary/SummaryView";

interface SummaryData {
  id: string;
  pdfName: string;
  bulletPoints: string[];
  paragraph: string;
}

export default function SummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [view, setView] = useState<"bullets" | "paragraph">("bullets");

  useEffect(() => {
    // Summary is created client-side and passed via sessionStorage after generate
    const stored = sessionStorage.getItem(`summary_${id}`);
    if (stored) {
      try {
        setSummary(JSON.parse(stored));
        return;
      } catch {}
    }
    // Fallback: fetch from API if we add GET /api/summary/[id]
    setSummary(null);
  }, [id]);

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">
          Summary not found. Go back to{" "}
          <Link href="/upload" className="text-[#00FFA3] hover:underline">
            Upload
          </Link>{" "}
          and generate a summary.
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
        <h1 className="text-2xl font-bold mb-4">{summary.pdfName}</h1>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView("bullets")}
            className={`px-4 py-2 rounded-lg ${
              view === "bullets" ? "btn-primary" : "btn-secondary"
            }`}
          >
            Bullet Points
          </button>
          <button
            onClick={() => setView("paragraph")}
            className={`px-4 py-2 rounded-lg ${
              view === "paragraph" ? "btn-primary" : "btn-secondary"
            }`}
          >
            Paragraph
          </button>
        </div>
        <SummaryView
          bulletPoints={summary.bulletPoints}
          paragraph={summary.paragraph}
          view={view}
        />
      </div>
    </div>
  );
}
