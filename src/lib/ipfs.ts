import PinataClient from "@pinata/sdk";
import { Readable } from "stream";

let pinata: PinataClient | null = null;

function getPinata(): PinataClient | null {
  if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
    return null;
  }
  if (!pinata) {
    pinata = new PinataClient(
      process.env.PINATA_API_KEY,
      process.env.PINATA_SECRET_API_KEY
    );
  }
  return pinata;
}

function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export async function uploadToIpfs(buffer: Buffer, fileName: string): Promise<string | null> {
  const client = getPinata();
  if (!client) {
    throw new Error("Pinata credentials not configured");
  }
  const stream = bufferToStream(buffer);
  const result = await client.pinFileToIPFS(stream, {
    pinataMetadata: { name: fileName },
  });
  return result.IpfsHash || null;
}
