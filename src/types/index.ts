export interface User {
  id: string;
  email: string;
  passwordHash: string;
  walletAddress?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizSession {
  id: string;
  userId: string;
  pdfName: string;
  ipfsHash: string;
  questions: Question[];
  score?: number;
  completedAt?: string;
  onChainTx?: string;
  createdAt: string;
}

export interface Summary {
  id: string;
  userId: string;
  pdfName: string;
  ipfsHash: string;
  bulletPoints: string[];
  paragraph: string;
  createdAt: string;
}
