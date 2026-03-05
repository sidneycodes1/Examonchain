import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export async function generateQuestions(pdfText: string): Promise<
  Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>
> {
  const truncated = pdfText.slice(0, 100000);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are an expert exam creator. Based on the following study material, generate exactly 10 multiple choice questions that mirror real exam patterns — focus on application and analysis, not just recall.

Study material:
---
${truncated}
---

Return ONLY a valid JSON array of 10 objects. Each object must have:
- "id": unique string (e.g. "q1", "q2", ...)
- "question": string
- "options": array of exactly 4 strings (A, B, C, D)
- "correctAnswer": number 0-3 (index of correct option)
- "explanation": string

Example format:
[{"id":"q1","question":"...","options":["A","B","C","D"],"correctAnswer":1,"explanation":"..."},...]`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";
  const parsed = JSON.parse(stripMarkdownFences(text)) as Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  return Array.isArray(parsed) ? parsed : [];
}

export async function generateSummary(pdfText: string): Promise<{
  bulletPoints: string[];
  paragraph: string;
}> {
  const truncated = pdfText.slice(0, 100000);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Summarize the following study material in two formats:

1. bulletPoints: exactly 8 concise key points (array of strings)
2. paragraph: a 3-4 sentence comprehensive summary (single string)

Study material:
---
${truncated}
---

Return ONLY valid JSON:
{"bulletPoints":["point1","point2",...],"paragraph":"..."}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";
  const parsed = JSON.parse(stripMarkdownFences(text)) as {
    bulletPoints: string[];
    paragraph: string;
  };
  return {
    bulletPoints: Array.isArray(parsed?.bulletPoints) ? parsed.bulletPoints : [],
    paragraph: typeof parsed?.paragraph === "string" ? parsed.paragraph : "",
  };
}
