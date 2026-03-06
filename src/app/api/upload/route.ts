import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { uploadToIpfs } from "@/lib/ipfs";
import { isValidPdfBuffer } from "@/lib/pdfValidation";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_WORDS = 50;
const ALLOWED_MIME = "application/pdf";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.type !== ALLOWED_MIME) {
      return NextResponse.json(
        { error: "Invalid file type. PDF required." },
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
    if (!isValidPdfBuffer(buffer)) {
      return NextResponse.json(
        { error: "Invalid PDF file. File signature does not match a valid PDF." },
        { status: 400 }
      );
    }
    const fileName = (file.name || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);

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
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
