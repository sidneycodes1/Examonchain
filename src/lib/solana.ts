import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.SOLANA_PROGRAM_ID;

export interface QuizRecordData {
  student: Uint8Array;
  sessionId: string;
  pdfHash: string;
  score: number;
  total: number;
  timestamp: number;
}

// Anchor-style PDA derivation
export function getQuizRecordPda(
  studentPubkey: PublicKey,
  sessionId: string,
  programId: string
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("quiz"),
      studentPubkey.toBuffer(),
      Buffer.from(sessionId, "utf-8"),
    ],
    new PublicKey(programId)
  );
  return pda;
}

export function getConnection(): Connection {
  return new Connection(RPC_URL);
}

// Placeholder: actual on-chain write requires deployed Anchor program
// This module provides the interface; implementation depends on program IDL
export async function saveScoreOnChain(
  studentPubkey: PublicKey,
  sessionId: string,
  pdfHash: string,
  score: number,
  total: number
): Promise<string | null> {
  if (!PROGRAM_ID) return null;
  const conn = getConnection();
  // In production: build and send Anchor instruction
  // For now return null until program is deployed
  return null;
}
