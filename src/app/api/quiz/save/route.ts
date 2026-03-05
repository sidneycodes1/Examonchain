import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { updateQuizSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, score, total, onChainTx } = await req.json();
    if (!sessionId || score == null || total == null) {
      return NextResponse.json(
        { error: "sessionId, score, and total required" },
        { status: 400 }
      );
    }

    const updated = await updateQuizSession(sessionId, {
      score: Number(score),
      total: Number(total),
      completedAt: new Date().toISOString(),
      ...(onChainTx && { onChainTx }),
    });

    if (!updated || updated.userId !== user.userId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ session: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Save failed" },
      { status: 500 }
    );
  }
}
