"use client";

import { useState } from "react";
import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    ipfsHash: string;
    pdfText: string;
    fileName: string;
    pageCount: number;
    wordCount: number;
  } | null>(null);
  const router = useRouter();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      setResult(data);
      toast.success("PDF uploaded successfully");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  async function generateQuiz() {
    if (!result) return;
    toast.loading("Generating questions...", { id: "gen" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfText: result.pdfText,
          pdfName: result.fileName,
          ipfsHash: result.ipfsHash,
        }),
        credentials: "include",
      });
      const data = await res.json();
      toast.dismiss("gen");
      if (!res.ok) {
        toast.error(data.error || "Generation failed");
        return;
      }
      toast.success("Quiz ready!");
      router.push(`/quiz/${data.session.id}`);
    } catch {
      toast.dismiss("gen");
      toast.error("Generation failed");
    }
  }

  async function generateSummary() {
    if (!result) return;
    toast.loading("Generating summary...", { id: "sum" });
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfText: result.pdfText,
          pdfName: result.fileName,
          ipfsHash: result.ipfsHash,
        }),
        credentials: "include",
      });
      const data = await res.json();
      toast.dismiss("sum");
      if (!res.ok) {
        toast.error(data.error || "Summary failed");
        return;
      }
      sessionStorage.setItem(
        `summary_${data.summary.id}`,
        JSON.stringify(data.summary)
      );
      toast.success("Summary ready!");
      router.push(`/summary/${data.summary.id}`);
    } catch {
      toast.dismiss("sum");
      toast.error("Summary failed");
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-[#00FFA3] hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <div
          {...getRootProps()}
          className={`card cursor-pointer border-dashed transition-colors ${
            isDragActive ? "border-[#00FFA3]" : ""
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-center text-slate-400">
            {uploading
              ? "Uploading..."
              : isDragActive
              ? "Drop the PDF here"
              : "Drag & drop a PDF here, or click to select"}
          </p>
        </div>

        {result && (
          <div className="card mt-6 space-y-4">
            <h2 className="text-lg font-semibold">{result.fileName}</h2>
            <p className="text-slate-400 text-sm">
              {result.pageCount} pages · {result.wordCount} words · IPFS:{" "}
              {result.ipfsHash.slice(0, 12)}...
            </p>
            <div className="flex gap-4">
              <button onClick={generateQuiz} className="btn-primary">
                Generate Quiz
              </button>
              <button onClick={generateSummary} className="btn-secondary">
                Generate Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
