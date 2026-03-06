/**
 * PDF file validation: MIME type + magic bytes.
 * PDF magic bytes: %PDF (25 50 44 46 in hex)
 */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
const MIN_PDF_BYTES = 4;

export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < MIN_PDF_BYTES) return false;
  return buffer.subarray(0, MIN_PDF_BYTES).equals(PDF_MAGIC);
}
