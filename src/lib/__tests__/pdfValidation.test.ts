import { isValidPdfBuffer } from "../pdfValidation";

describe("isValidPdfBuffer", () => {
  it("returns true for valid PDF magic bytes", () => {
    const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(isValidPdfBuffer(buffer)).toBe(true);
  });

  it("returns false for non-PDF content", () => {
    const buffer = Buffer.from([0x50, 0x4e, 0x47]); // PNG
    expect(isValidPdfBuffer(buffer)).toBe(false);
  });

  it("returns false for empty buffer", () => {
    expect(isValidPdfBuffer(Buffer.alloc(0))).toBe(false);
  });

  it("returns false for buffer shorter than 4 bytes", () => {
    const buffer = Buffer.from([0x25, 0x50]);
    expect(isValidPdfBuffer(buffer)).toBe(false);
  });
});
