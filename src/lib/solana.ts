import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction, 
} from '@solana/spl-token';
import bs58 from 'bs58';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const EXB_MINT_ADDRESS = process.env.NEXT_PUBLIC_EXB_MINT_ADDRESS || '';
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY || '';

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed');
}

export async function distributeTokens(recipientWallet: string, amount: number): Promise<{ signature: string; status: string }> {
  try {
    if (!SOLANA_PRIVATE_KEY) {
      throw new Error('SOLANA_PRIVATE_KEY is missing from environment variables');
    }
    if (!EXB_MINT_ADDRESS) {
      throw new Error('NEXT_PUBLIC_EXB_MINT_ADDRESS is missing from environment variables');
    }

    const connection = getConnection();

    // Decode private key
    const secretKey = bs58.decode(SOLANA_PRIVATE_KEY);
    const authority = Keypair.fromSecretKey(secretKey);

    const mintPubKey = new PublicKey(EXB_MINT_ADDRESS);
    const recipientPubKey = new PublicKey(recipientWallet);
    const authorityPubKey = authority.publicKey;

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

    // Add SPL token transfer instruction
    transaction.add(
      createTransferInstruction(
        sourceATA,
        destinationATA,
        authorityPubKey,
        amount
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
