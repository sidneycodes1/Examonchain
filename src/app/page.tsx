"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#00FFA3] via-[#00C2FF] to-[#9945FF] bg-clip-text text-transparent">
          ExamChain
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Upload your lecture notes. Get real exam-style questions. Own your
          academic record on Solana.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/login" className="btn-secondary">
            Login
          </Link>
          <Link href="/register" className="btn-primary">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
