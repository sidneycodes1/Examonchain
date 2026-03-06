"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
        else router.push("/login");
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router, setUser, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold">
            Dashboard — <span className="text-[#00FFA3]">{user?.email}</span>
          </h1>
          <div className="flex gap-2">
            <ThemeToggle />
            <button onClick={logout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/upload" className="card block hover:border-[#00FFA3]/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">📤 Upload PDF</h2>
            <p className="text-slate-400">
              Upload lecture notes to generate quiz questions and AI summaries.
            </p>
          </Link>
          <Link href="/history" className="card block hover:border-[#00FFA3]/50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">📜 Quiz History</h2>
            <p className="text-slate-400">
              View all your past quiz scores and on-chain records.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
