import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getQuizSessionsByUserId } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getQuizSessionsByUserId(user.userId);
  return NextResponse.json({ sessions });
}
