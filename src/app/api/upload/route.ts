import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { uploadToIpfs } from "@/lib/ipfs";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_WORDS = 50;

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file. PDF required." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;

    const pdfParse = (await import("pdf-parse")).default;
    const [ipfsHash, parseResult] = await Promise.all([
      uploadToIpfs(buffer, fileName),
      pdfParse(buffer),
    ]);
    const pdfText = parseResult.text;

    if (!ipfsHash) {
      return NextResponse.json(
        { error: "IPFS upload failed" },
        { status: 500 }
      );
    }

    const wordCount = (pdfText || "").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORDS) {
      return NextResponse.json(
        {
          error:
            "PDF appears to be scanned or image-only. Text extraction yielded too few words. Please use a text-based PDF.",
        },
        { status: 422 }
      );
    }

    const pageCount = parseResult.numpages || 1;

    return NextResponse.json({
      ipfsHash,
      pdfText,
      fileName,
      pageCount: pageCount ?? 1,
      wordCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
