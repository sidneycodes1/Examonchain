import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { generateSummary } from "@/lib/claude";
import { createSummary } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pdfText, pdfName, ipfsHash } = await req.json();
    if (!pdfText || !pdfName || !ipfsHash) {
      return NextResponse.json(
        { error: "pdfText, pdfName, and ipfsHash required" },
        { status: 400 }
      );
    }

    const { bulletPoints, paragraph } = await generateSummary(pdfText);
    const points = bulletPoints.slice(0, 8);

    const summary = await createSummary({
      id: uuidv4(),
      userId: user.userId,
      pdfName,
      ipfsHash,
      bulletPoints: points,
      paragraph: paragraph || "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Summary generation failed" },
      { status: 500 }
    );
  }
}
