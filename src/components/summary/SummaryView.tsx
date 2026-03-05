"use client";

interface SummaryViewProps {
  bulletPoints: string[];
  paragraph: string;
  view: "bullets" | "paragraph";
}

export function SummaryView({
  bulletPoints,
  paragraph,
  view,
}: SummaryViewProps) {
  return (
    <div className="card">
      {view === "bullets" ? (
        <ul className="space-y-2">
          {bulletPoints.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#00FFA3]">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-300 leading-relaxed">{paragraph}</p>
      )}
    </div>
  );
}
