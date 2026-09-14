import { z } from 'zod';

// POST /api/submissions — score a quiz; answers as map or array shapes
export const QuizAnswerArrayItemSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

export const SubmissionsPostSchema = z.object({
  quizId: z.string().uuid('quizId must be a UUID'),
  answers: z.union([
    z.record(z.string(), z.string()),
    z.array(QuizAnswerArrayItemSchema).min(1),
  ]),
});

export type SubmissionsPost = z.infer<typeof SubmissionsPostSchema>;

// POST /api/submissions/claim — retry a token distribution
export const ClaimPostSchema = z.object({
  resultId: z.string().uuid('resultId must be a UUID'),
});

export type ClaimPost = z.infer<typeof ClaimPostSchema>;

// POST /api/quizzes — generate a quiz from a material
export const QuizzesPostSchema = z.object({
  materialId: z.string().uuid('materialId must be a UUID'),
});

export type QuizzesPost = z.infer<typeof QuizzesPostSchema>;

// POST /api/ai/chat — chat scoped to a material
export const ChatPostSchema = z.object({
  materialId: z.string().uuid('materialId must be a UUID'),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8000),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

export type ChatPost = z.infer<typeof ChatPostSchema>;
