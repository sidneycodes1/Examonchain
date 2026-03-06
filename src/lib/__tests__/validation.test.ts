import {
  registerSchema,
  loginSchema,
  generateSchema,
  quizSaveSchema,
} from "../validation";

describe("validation schemas", () => {
  describe("registerSchema", () => {
    it("accepts valid email and password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = registerSchema.safeParse({
        email: "notanemail",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "any",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("generateSchema", () => {
    it("accepts valid generate input", () => {
      const result = generateSchema.safeParse({
        pdfText: "Some content",
        pdfName: "notes.pdf",
        ipfsHash: "QmXyz",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("quizSaveSchema", () => {
    it("accepts valid save input", () => {
      const result = quizSaveSchema.safeParse({
        sessionId: "abc-123",
        score: 8,
        total: 10,
      });
      expect(result.success).toBe(true);
    });
  });
});
