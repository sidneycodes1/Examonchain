"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  type Commitment,
} from "@solana/web3.js";

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as "devnet" | "mainnet-beta";
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK);
const PROGRAM_ID = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID;

/**
 * Solana client wrapper for ExamChain.
 * Provides connection, PDA helpers, and placeholder for Anchor integration.
 */
export const solanaClient = {
  getConnection(commitment?: Commitment): Connection {
    return new Connection(RPC_URL, commitment ?? "confirmed");
  },

  getProgramId(): PublicKey | null {
    if (!PROGRAM_ID) return null;
    try {
      return new PublicKey(PROGRAM_ID);
    } catch {
      return null;
    }
  },

  /**
   * Derive PDA for quiz record.
   * PDA seeds: ["quiz", student_pubkey, session_id]
   */
  getQuizRecordPda(studentPubkey: PublicKey, sessionId: string): PublicKey | null {
    const programId = this.getProgramId();
    if (!programId) return null;
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("quiz"),
        studentPubkey.toBuffer(),
        Buffer.from(sessionId, "utf-8"),
      ],
      programId
    );
    return pda;
  },

  /**
   * Placeholder: save quiz score on-chain.
   * In production, use @coral-xyz/anchor to build and send the instruction.
   */
  async saveScoreOnChain(
    _studentPubkey: PublicKey,
    _sessionId: string,
    _pdfHash: string,
    _score: number,
    _total: number
  ): Promise<string | null> {
    if (!this.getProgramId()) return null;
    // TODO: Build Anchor instruction and send transaction
    return null;
  },

  getExplorerTxUrl(signature: string): string {
    const base = NETWORK === "mainnet-beta"
      ? "https://explorer.solana.com"
      : `https://explorer.solana.com/?cluster=${NETWORK}`;
    return `${base}/tx/${signature}`;
  },
};
