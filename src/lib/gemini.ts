import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';

const OptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const QuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(OptionSchema).min(2),
  explanation: z.string().optional(),
});

const QuizSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedQuiz = z.infer<typeof QuizSchema>;

export async function generateQuizFromText(text: string): Promise<GeneratedQuiz> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GOOGLE_GEMINI_API_KEY environment variable');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Extracted text is empty. Cannot generate quiz.');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
You are an expert educator. Generate a multiple-choice quiz based on the following text.
Your response MUST be a single valid JSON object containing exactly 10 questions.
Each question must have exactly 4 options.
Exactly one of the options must have "isCorrect" set to true, and the other three must have "isCorrect" set to false.
Provide a clear explanation for why the correct option is correct.

The JSON schema must match:
{
  "questions": [
    {
      "questionText": "string",
      "options": [
        { "text": "string", "isCorrect": boolean }
      ],
      "explanation": "string"
    }
  ]
}

Text to generate the quiz from:
"""
${text}
"""
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) {
      throw new Error('Received empty response from Gemini');
    }

    const parsedJson = JSON.parse(responseText);
    const validated = QuizSchema.parse(parsedJson);

    // Sanity-check and enforce exactly one correct answer per question
    for (const q of validated.questions) {
      const correctCount = q.options.filter(o => o.isCorrect).length;
      if (correctCount !== 1) {
        if (correctCount === 0 && q.options.length > 0) {
          q.options[0].isCorrect = true;
        } else if (correctCount > 1) {
          let foundCorrect = false;
          for (const o of q.options) {
            if (o.isCorrect) {
              if (foundCorrect) {
                o.isCorrect = false;
              } else {
                foundCorrect = true;
              }
            }
          }
        }
      }
    }

    return validated;
  } catch (err) {
    console.error('Gemini quiz generation error:', err);
    throw err;
  }
}
