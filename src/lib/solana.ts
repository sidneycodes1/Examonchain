import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
} from '@solana/spl-token';
import bs58 from 'bs58';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const EXB_MINT_ADDRESS = process.env.NEXT_PUBLIC_EXB_MINT_ADDRESS || '';
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY || '';

function isPlaceholderKey(key: string): boolean {
  const k = key.trim();
  if (!k) return true;
  if (/placeholder|your-key|xxx|changeme|test-key/i.test(k)) return true;
  return false;
}

export function isSolanaConfigured(): boolean {
  if (isPlaceholderKey(EXB_MINT_ADDRESS)) return false;
  if (isPlaceholderKey(SOLANA_PRIVATE_KEY)) return false;
  return true;
}

export function getSolanaConfigError(): string | null {
  if (isPlaceholderKey(EXB_MINT_ADDRESS) || isPlaceholderKey(SOLANA_PRIVATE_KEY)) {
    return 'Token rewards are not configured yet';
  }
  return null;
}

/** Validate a Solana address: must be base58 decoding to exactly 32 bytes and a valid PublicKey. */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (!trimmed || trimmed.startsWith('temp-')) return false;
  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length !== 32) return false;
    // Throws on invalid curve points / malformed keys
    new PublicKey(decoded);
    return true;
  } catch {
    return false;
  }
}

function decodeAuthoritySecretKey(): Keypair {
  const raw = SOLANA_PRIVATE_KEY.trim();
  let secretKey: Uint8Array | null = null;
  // Primary format: base58 (as documented for SOLANA_PRIVATE_KEY)
  try {
    const decoded = bs58.decode(raw);
    if (decoded.length === 64) {
      secretKey = decoded;
    }
  } catch {
    // fall through to base64 attempt
  }
  // Fallback: base64-encoded 64-byte secret key (some tooling exports this format)
  if (!secretKey) {
    try {
      const buf = Buffer.from(raw, 'base64');
      if (buf.length === 64) {
        secretKey = new Uint8Array(buf);
      }
    } catch {
      // fall through to error below
    }
  }
  if (!secretKey) {
    throw new Error('Token rewards are not configured yet');
  }
  return Keypair.fromSecretKey(secretKey);
}

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed');
}

export async function distributeTokens(recipientWallet: string, amount: number): Promise<{ signature: string; status: string }> {
  try {
    const configError = getSolanaConfigError();
    if (configError) {
      throw new Error(configError);
    }
    if (!isValidSolanaAddress(recipientWallet)) {
      throw new Error('Invalid recipient wallet address');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid token amount');
    }

    const connection = getConnection();

    // Treasury authority (supports base58 primary, base64 fallback)
    const authority = decodeAuthoritySecretKey();

    const mintPubKey = new PublicKey(EXB_MINT_ADDRESS.trim());
    const recipientPubKey = new PublicKey(recipientWallet.trim());
    const authorityPubKey = authority.publicKey;

    // Read mint decimals dynamically so the transfer is correct for any mint.
    // Human-readable EXB amount (e.g. score 85 = 85 EXB) -> base units.
    const mintInfo = await getMint(connection, mintPubKey);
    const decimals = mintInfo.decimals;
    const scaledAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

    // Get source and destination associated token accounts (ATAs)
    const sourceATA = await getAssociatedTokenAddress(mintPubKey, authorityPubKey);
    const destinationATA = await getAssociatedTokenAddress(mintPubKey, recipientPubKey);

    const transaction = new Transaction();

    // Check if recipient's ATA exists
    let createATA = false;
    try {
      const accountInfo = await connection.getAccountInfo(destinationATA);
      if (!accountInfo) {
        createATA = true;
      }
    } catch {
      createATA = true;
    }

    if (createATA) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          authorityPubKey, // payer
          destinationATA,  // ata
          recipientPubKey, // owner
          mintPubKey       // mint
        )
      );
    }

    // Add SPL token transfer instruction (amount in base units, scaled by mint decimals)
    transaction.add(
      createTransferInstruction(
        sourceATA,
        destinationATA,
        authorityPubKey,
        scaledAmount
      )
    );

    // Send and confirm
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );

    return { signature, status: 'confirmed' };
  } catch (err) {
    console.error('Failed to distribute tokens:', err);
    throw err;
  }
}
