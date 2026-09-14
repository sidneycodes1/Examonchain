export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizOption[];
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  materialId: string;
  questions: QuizQuestion[];
  createdAt?: string;
}

export interface QuizSubmissionResult {
  resultId: string;
  score: number;
  tokensEarned: number;
  txHash: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
