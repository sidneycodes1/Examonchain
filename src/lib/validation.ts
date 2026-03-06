import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(128),
});

export const generateSchema = z.object({
  pdfText: z.string().min(1, "pdfText required").max(500_000),
  pdfName: z.string().min(1, "pdfName required").max(512),
  ipfsHash: z.string().min(1, "ipfsHash required").max(128),
});

export const summarySchema = z.object({
  pdfText: z.string().min(1, "pdfText required").max(500_000),
  pdfName: z.string().min(1, "pdfName required").max(512),
  ipfsHash: z.string().min(1, "ipfsHash required").max(128),
});

export const quizSaveSchema = z.object({
  sessionId: z.string().min(1, "sessionId required").max(64),
  score: z.number().int().min(0).max(255),
  total: z.number().int().min(1).max(255),
  onChainTx: z.string().max(128).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type SummaryInput = z.infer<typeof summarySchema>;
export type QuizSaveInput = z.infer<typeof quizSaveSchema>;
