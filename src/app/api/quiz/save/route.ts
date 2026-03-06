import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateQuizSession } from "@/lib/db";
import { quizSaveSchema, type QuizSaveInput } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parse = quizSaveSchema.safeParse(body);
    if (!parse.success) {
      const msg = parse.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const data = parse.data as QuizSaveInput;
    const sessionId = String(data.sessionId);

    const updates: Parameters<typeof updateQuizSession>[1] = {
      score: Number(data.score),
      completedAt: new Date().toISOString(),
    };
    if (typeof data.onChainTx === "string") updates.onChainTx = data.onChainTx;

    const updated = await updateQuizSession(sessionId, updates);

    if (!updated || updated.userId !== user.userId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch {
    return NextResponse.json(
      { error: "Save failed" },
      { status: 500 }
    );
  }
}
