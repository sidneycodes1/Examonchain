import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generateQuestions } from "@/lib/claude";
import { createQuizSession } from "@/lib/db";
import { generateSchema } from "@/lib/validation";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parse = generateSchema.safeParse(body);
    if (!parse.success) {
      const msg = parse.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { pdfText, pdfName, ipfsHash } = parse.data;

    const rawQuestions = await generateQuestions(pdfText);
    const questions = rawQuestions.slice(0, 10).map((q, i) => ({
      ...q,
      id: q.id || `q${i + 1}`,
    }));

    const session = await createQuizSession({
      id: uuidv4(),
      userId: user.userId,
      pdfName,
      ipfsHash,
      questions,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Question generation failed" },
      { status: 500 }
    );
  }
}
