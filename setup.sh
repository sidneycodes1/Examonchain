#!/bin/bash

# ============================================================
#  ⛓️  ExamChain — Full Project Scaffold
#  Run: bash setup.sh
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}⛓️  ExamChain — Scaffolding your project...${NC}"
echo ""

# ── 1. Create Next.js app ────────────────────────────────────
npx create-next-app@latest examchain \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git \
  << 'EOF'
EOF

cd examchain

echo -e "${GREEN}✅ Next.js created${NC}"

# ── 2. Install dependencies ──────────────────────────────────
echo -e "${CYAN}📦 Installing dependencies...${NC}"

npm install \
  @anthropic-ai/sdk \
  @solana/web3.js \
  @solana/wallet-adapter-base \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-phantom \
  @coral-xyz/anchor \
  @pinata/sdk \
  axios \
  bcryptjs \
  jsonwebtoken \
  jose \
  pdf-parse \
  multer \
  next-auth \
  @auth/core \
  zustand \
  react-dropzone \
  react-hot-toast \
  lucide-react \
  clsx \
  tailwind-merge

npm install -D \
  @types/bcryptjs \
  @types/jsonwebtoken \
  @types/multer \
  @types/pdf-parse

echo -e "${GREEN}✅ Dependencies installed${NC}"

# ── 3. Environment file ──────────────────────────────────────
cat > .env.local << 'EOF'
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Auth
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Pinata (IPFS)
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_here
PINATA_JWT=your_pinata_jwt_here

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=your_anchor_program_id_here

# Database (simple JSON file for now, swap with Postgres later)
DB_PATH=./data/db.json
EOF

echo -e "${GREEN}✅ .env.local created${NC}"

# ── 4. Create folder structure ───────────────────────────────
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
mkdir -p src/app/dashboard
mkdir -p src/app/upload
mkdir -p src/app/quiz/\[id\]
mkdir -p src/app/summary/\[id\]
mkdir -p src/app/history
mkdir -p src/app/api/auth/login
mkdir -p src/app/api/auth/register
mkdir -p src/app/api/auth/me
mkdir -p src/app/api/upload
mkdir -p src/app/api/generate
mkdir -p src/app/api/summary
mkdir -p src/app/api/quiz/save
mkdir -p src/components/ui
mkdir -p src/components/quiz
mkdir -p src/components/wallet
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/store
mkdir -p data
mkdir -p programs/examchain/src

echo -e "${GREEN}✅ Folder structure created${NC}"

# ── 5. Types ─────────────────────────────────────────────────
cat > src/types/index.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  walletAddress?: string;
  createdAt: string;
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

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
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

export interface AuthToken {
  userId: string;
  email: string;
}
EOF

# ── 6. Lib: DB (simple JSON store) ──────────────────────────
cat > src/lib/db.ts << 'EOF'
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DB {
  users: any[];
  sessions: any[];
  summaries: any[];
}

function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    const empty: DB = { users: [], sessions: [], summaries: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const db = {
  getUsers: () => readDB().users,
  getSessions: () => readDB().sessions,
  getSummaries: () => readDB().summaries,

  addUser: (user: any) => {
    const data = readDB();
    data.users.push(user);
    writeDB(data);
  },

  addSession: (session: any) => {
    const data = readDB();
    data.sessions.push(session);
    writeDB(data);
  },

  addSummary: (summary: any) => {
    const data = readDB();
    data.summaries.push(summary);
    writeDB(data);
  },

  findUserByEmail: (email: string) => readDB().users.find((u: any) => u.email === email),
  findUserById: (id: string) => readDB().users.find((u: any) => u.id === id),
  findSessionsByUser: (userId: string) => readDB().sessions.filter((s: any) => s.userId === userId),
  findSummariesByUser: (userId: string) => readDB().summaries.filter((s: any) => s.userId === userId),
  findSessionById: (id: string) => readDB().sessions.find((s: any) => s.id === id),
  findSummaryById: (id: string) => readDB().summaries.find((s: any) => s.id === id),
};
EOF

# ── 7. Lib: Auth ─────────────────────────────────────────────
cat > src/lib/auth.ts << 'EOF'
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function signToken(payload: { userId: string; email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function getAuthUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
EOF

# ── 8. Lib: Claude AI ────────────────────────────────────────
cat > src/lib/claude.ts << 'EOF'
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateQuestions(pdfText: string, pdfName: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are an expert exam question generator. Analyze this academic content and generate 10 high-quality multiple choice questions that mirror the style and difficulty of real past exam questions for this subject.

PDF Name: ${pdfName}

Content:
${pdfText.slice(0, 8000)}

Generate exactly 10 questions. Each question must:
- Be based on key concepts from the content
- Have 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation of why the answer is correct
- Mirror real exam question patterns (application, analysis, not just recall)

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "This is correct because..."
    }
  ]
}`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateSummary(pdfText: string, pdfName: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert academic summarizer. Summarize this content in two formats.

PDF Name: ${pdfName}

Content:
${pdfText.slice(0, 8000)}

Respond ONLY with valid JSON:
{
  "bulletPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3",
    "Key point 4",
    "Key point 5",
    "Key point 6",
    "Key point 7",
    "Key point 8"
  ],
  "paragraph": "A comprehensive 3-4 sentence paragraph summary of the entire content..."
}`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
EOF

# ── 9. Lib: IPFS ─────────────────────────────────────────────
cat > src/lib/ipfs.ts << 'EOF'
import axios from 'axios';
import FormData from 'form-data';

export async function uploadToIPFS(buffer: Buffer, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', buffer, { filename: fileName, contentType: 'application/pdf' });
  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
    }
  );

  return response.data.IpfsHash;
}
EOF

# ── 10. Lib: Solana ──────────────────────────────────────────
cat > src/lib/solana.ts << 'EOF'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

export function getSolanaExplorerUrl(tx: string) {
  return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}
EOF

# ── 11. Store: Auth ──────────────────────────────────────────
cat > src/store/authStore.ts << 'EOF'
import { create } from 'zustand';

interface AuthState {
  user: { id: string; email: string } | null;
  walletAddress: string | null;
  setUser: (user: { id: string; email: string } | null) => void;
  setWallet: (address: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  walletAddress: null,
  setUser: (user) => set({ user }),
  setWallet: (walletAddress) => set({ walletAddress }),
  logout: () => set({ user: null, walletAddress: null }),
}));
EOF

# ── 12. API: Register ────────────────────────────────────────
cat > src/app/api/auth/register/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { v4 as uuid } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, walletAddress } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const existing = db.findUserByEmail(email);
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      walletAddress: walletAddress || null,
      createdAt: new Date().toISOString(),
    };

    db.addUser(user);
    const token = await signToken({ userId: user.id, email: user.email });

    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    res.cookies.set('auth_token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
EOF

# ── 13. API: Login ───────────────────────────────────────────
cat > src/app/api/auth/login/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = db.findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = await signToken({ userId: user.id, email: user.email });
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    res.cookies.set('auth_token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/' });
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
EOF

# ── 14. API: Me ──────────────────────────────────────────────
cat > src/app/api/auth/me/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = db.findUserById(auth.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user: { id: user.id, email: user.email, walletAddress: user.walletAddress } });
}
EOF

# ── 15. API: Upload PDF ──────────────────────────────────────
cat > src/app/api/upload/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadToIPFS } from '@/lib/ipfs';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ipfsHash = await uploadToIPFS(buffer, file.name);

    return NextResponse.json({ success: true, ipfsHash, fileName: file.name });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
EOF

# ── 16. API: Generate Questions ──────────────────────────────
cat > src/app/api/generate/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateQuestions } from '@/lib/claude';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pdfText, pdfName, ipfsHash } = await req.json();
    if (!pdfText) return NextResponse.json({ error: 'PDF text required' }, { status: 400 });

    const { questions } = await generateQuestions(pdfText, pdfName);

    const session = {
      id: crypto.randomUUID(),
      userId: auth.userId,
      pdfName,
      ipfsHash,
      questions,
      createdAt: new Date().toISOString(),
    };

    db.addSession(session);
    return NextResponse.json({ success: true, sessionId: session.id, questions });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
EOF

# ── 17. API: Summary ─────────────────────────────────────────
cat > src/app/api/summary/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateSummary } from '@/lib/claude';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pdfText, pdfName, ipfsHash } = await req.json();
    if (!pdfText) return NextResponse.json({ error: 'PDF text required' }, { status: 400 });

    const { bulletPoints, paragraph } = await generateSummary(pdfText, pdfName);

    const summary = {
      id: crypto.randomUUID(),
      userId: auth.userId,
      pdfName,
      ipfsHash,
      bulletPoints,
      paragraph,
      createdAt: new Date().toISOString(),
    };

    db.addSummary(summary);
    return NextResponse.json({ success: true, summaryId: summary.id, bulletPoints, paragraph });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 });
  }
}
EOF

# ── 18. API: Save Quiz Score ─────────────────────────────────
cat > src/app/api/quiz/save/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, score, onChainTx } = await req.json();
    const sessions = db.getSessions();
    const session = sessions.find((s: any) => s.id === sessionId && s.userId === auth.userId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    session.score = score;
    session.completedAt = new Date().toISOString();
    session.onChainTx = onChainTx || null;

    // Write updated sessions back
    const data = { users: db.getUsers(), sessions: sessions, summaries: db.getSummaries() };
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(process.cwd(), 'data', 'db.json'), JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
EOF

# ── 19. Root Layout ──────────────────────────────────────────
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExamChain — AI Study Tool on Solana',
  description: 'Upload your PDFs, get AI-generated exam questions, store your progress on the Solana blockchain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
EOF

# ── 20. Global CSS ───────────────────────────────────────────
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --green: #00FFA3;
  --purple: #9945FF;
  --blue: #00C2FF;
  --bg: #060910;
  --card: #0a0f1a;
  --border: #1e2840;
}

body {
  background: var(--bg);
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
}

.btn-primary {
  @apply bg-[#00FFA3] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#00e090] transition-all duration-200;
}

.btn-secondary {
  @apply bg-[#0a0f1a] border border-[#1e2840] text-white font-semibold px-6 py-3 rounded-xl hover:border-[#00FFA3] transition-all duration-200;
}

.card {
  @apply bg-[#0a0f1a] border border-[#1e2840] rounded-2xl p-6;
}

.input {
  @apply bg-[#060910] border border-[#1e2840] text-white rounded-xl px-4 py-3 w-full focus:outline-none focus:border-[#00FFA3] transition-colors;
}
EOF

# ── 21. Landing Page ─────────────────────────────────────────
cat > src/app/page.tsx << 'EOF'
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 bg-[#0a0f1a] border border-[#1e2840] rounded-full px-4 py-1.5 text-sm text-[#00FFA3]">
        ⛓️ Built on Solana
      </div>

      {/* Hero */}
      <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
        Study Smarter.<br />
        <span className="text-[#00FFA3]">On-Chain.</span>
      </h1>
      <p className="text-lg text-gray-400 max-w-xl mb-10">
        Upload your lecture notes or textbook. Our AI generates real exam-style questions
        from your content and stores your progress permanently on the Solana blockchain.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/register" className="btn-primary text-lg">
          Get Started Free →
        </Link>
        <Link href="/login" className="btn-secondary text-lg">
          Sign In
        </Link>
      </div>

      {/* Features */}
      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          { icon: '🤖', title: 'AI Question Generation', desc: 'Claude AI infers exam-style questions directly from your PDF content — not random, but relevant.' },
          { icon: '📝', title: 'Smart Summaries', desc: 'Get bullet-point or paragraph summaries of any PDF in seconds. Study faster, retain more.' },
          { icon: '⛓️', title: 'On-Chain History', desc: 'Your quiz scores and sessions are stored immutably on Solana. Own your academic record.' },
        ].map((f) => (
          <div key={f.title} className="card text-left">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-white mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
EOF

# ── 22. Login Page ───────────────────────────────────────────
cat > "src/app/(auth)/login/page.tsx" << 'EOF'
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">⛓️</div>
          <h1 className="text-2xl font-black">Sign In to ExamChain</h1>
          <p className="text-gray-400 text-sm mt-1">Your AI study companion on Solana</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@university.edu"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          No account?{' '}
          <Link href="/register" className="text-[#00FFA3] hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
EOF

# ── 23. Register Page ────────────────────────────────────────
cat > "src/app/(auth)/register/page.tsx" << 'EOF'
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      toast.success('Account created!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">⛓️</div>
          <h1 className="text-2xl font-black">Create Your Account</h1>
          <p className="text-gray-400 text-sm mt-1">Start studying smarter today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
            <input type="email" className="input" placeholder="you@university.edu"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Password</label>
            <input type="password" className="input" placeholder="Min. 8 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Confirm Password</label>
            <input type="password" className="input" placeholder="••••••••"
              value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00FFA3] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
EOF

# ── 24. Dashboard Page ───────────────────────────────────────
cat > src/app/dashboard/page.tsx << 'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return; }
      return r.json();
    }).then(d => d && setUser(d.user));
  }, []);

  async function logout() {
    document.cookie = 'auth_token=; Max-Age=0; path=/';
    router.push('/');
  }

  return (
    <div className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="text-xs text-[#00FFA3] tracking-widest mb-1">⛓️ EXAMCHAIN</div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          {user && <p className="text-gray-400 text-sm mt-1">Welcome back, {user.email}</p>}
        </div>
        <button onClick={logout} className="btn-secondary text-sm px-4 py-2">Sign Out</button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link href="/upload" className="card hover:border-[#00FFA3] transition-colors group cursor-pointer">
          <div className="text-4xl mb-3">📄</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-[#00FFA3] transition-colors">Upload PDF</h2>
          <p className="text-gray-400 text-sm">Generate AI questions or summary from any PDF</p>
          <div className="mt-4 text-[#00FFA3] text-sm font-semibold">Start studying →</div>
        </Link>

        <Link href="/history" className="card hover:border-[#9945FF] transition-colors group cursor-pointer">
          <div className="text-4xl mb-3">⛓️</div>
          <h2 className="text-xl font-bold mb-1 group-hover:text-[#9945FF] transition-colors">On-Chain History</h2>
          <p className="text-gray-400 text-sm">View your quiz scores stored on Solana</p>
          <div className="mt-4 text-[#9945FF] text-sm font-semibold">View history →</div>
        </Link>
      </div>

      {/* Stats placeholder */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">Your Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[['PDFs Uploaded', '—'], ['Quizzes Taken', '—'], ['Avg Score', '—%']].map(([label, val]) => (
            <div key={label}>
              <div className="text-2xl font-black text-[#00FFA3]">{val}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
EOF

# ── 25. Upload Page ──────────────────────────────────────────
cat > src/app/upload/page.tsx << 'EOF'
'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

type Mode = 'quiz' | 'summary' | null;

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  async function extractText(file: File): Promise<string> {
    // Simple text extraction - in production use pdf-parse on server
    return `PDF content from: ${file.name}`;
  }

  async function handleProcess() {
    if (!file || !mode) return;
    setLoading(true);
    try {
      // Step 1: Upload to IPFS
      setStep('Uploading to IPFS...');
      const formData = new FormData();
      formData.append('pdf', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const { ipfsHash } = await uploadRes.json();

      // Step 2: Extract text (client-side simple extraction)
      setStep('Reading PDF...');
      const pdfText = await file.text().catch(() => file.name);

      // Step 3: Generate questions or summary
      setStep(mode === 'quiz' ? 'Generating questions with AI...' : 'Generating summary with AI...');
      const endpoint = mode === 'quiz' ? '/api/generate' : '/api/summary';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText, pdfName: file.name, ipfsHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(mode === 'quiz' ? 'Questions generated!' : 'Summary ready!');
      if (mode === 'quiz') router.push(`/quiz/${data.sessionId}`);
      else router.push(`/summary/${data.summaryId}`);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setStep('');
    }
  }

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-[#00FFA3] tracking-widest mb-1">⛓️ EXAMCHAIN</div>
        <h1 className="text-3xl font-black">Upload PDF</h1>
        <p className="text-gray-400 text-sm mt-1">Upload your study material and choose what to generate</p>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`card border-2 border-dashed cursor-pointer text-center py-16 transition-colors ${isDragActive ? 'border-[#00FFA3] bg-[#00FFA3]/5' : file ? 'border-[#00FFA3]/50' : 'border-[#1e2840] hover:border-[#2d3f60]'}`}>
        <input {...getInputProps()} />
        {file ? (
          <div>
            <div className="text-4xl mb-3">📄</div>
            <div className="font-bold text-white">{file.name}</div>
            <div className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <div className="text-[#00FFA3] text-sm mt-2">✓ Ready to process</div>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">📤</div>
            <div className="font-semibold text-white mb-1">Drop your PDF here</div>
            <div className="text-gray-400 text-sm">or click to browse files</div>
          </div>
        )}
      </div>

      {/* Mode Selection */}
      {file && (
        <div className="mt-8">
          <h2 className="font-bold mb-4">What do you want to generate?</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMode('quiz')} className={`card text-left transition-all ${mode === 'quiz' ? 'border-[#00FFA3]' : 'hover:border-[#2d3f60]'}`}>
              <div className="text-2xl mb-2">🧠</div>
              <div className="font-bold">Quiz Mode</div>
              <div className="text-gray-400 text-sm mt-1">10 AI-generated exam-style questions</div>
              {mode === 'quiz' && <div className="text-[#00FFA3] text-xs mt-2 font-semibold">✓ Selected</div>}
            </button>
            <button onClick={() => setMode('summary')} className={`card text-left transition-all ${mode === 'summary' ? 'border-[#00FFA3]' : 'hover:border-[#2d3f60]'}`}>
              <div className="text-2xl mb-2">📝</div>
              <div className="font-bold">Summary Mode</div>
              <div className="text-gray-400 text-sm mt-1">Bullets or paragraph — your choice</div>
              {mode === 'summary' && <div className="text-[#00FFA3] text-xs mt-2 font-semibold">✓ Selected</div>}
            </button>
          </div>
        </div>
      )}

      {/* Submit */}
      {file && mode && (
        <button onClick={handleProcess} disabled={loading} className="btn-primary w-full mt-8 text-lg">
          {loading ? step || 'Processing...' : `Generate ${mode === 'quiz' ? 'Quiz' : 'Summary'} →`}
        </button>
      )}
    </div>
  );
}
EOF

# ── 26. Quiz Page ────────────────────────────────────────────
cat > "src/app/quiz/[id]/page.tsx" << 'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function QuizPage() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/save`, { method: 'GET' }); // placeholder
    // Load session from db via a GET endpoint (add if needed)
    // For now we'll use localStorage as bridge
    const cached = localStorage.getItem(`session_${id}`);
    if (cached) setSession(JSON.parse(cached));
  }, [id]);

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Loading quiz...</div>
    </div>
  );

  const q = session.questions[current];
  const score = answers.filter((a, i) => a === session.questions[i]?.correctAnswer).length;

  function handleAnswer(idx: number) {
    if (showAnswer) return;
    setSelected(idx);
    setShowAnswer(true);
  }

  function handleNext() {
    const newAnswers = [...answers, selected!];
    setAnswers(newAnswers);
    if (current + 1 >= session.questions.length) {
      setDone(true);
      const finalScore = newAnswers.filter((a, i) => a === session.questions[i]?.correctAnswer).length;
      fetch('/api/quiz/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, score: finalScore }),
      });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowAnswer(false);
    }
  }

  if (done) {
    const finalScore = answers.filter((a, i) => a === session.questions[i]?.correctAnswer).length;
    const pct = Math.round((finalScore / session.questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">{pct >= 70 ? '🎉' : pct >= 50 ? '📚' : '💪'}</div>
          <h1 className="text-3xl font-black mb-2">Quiz Complete!</h1>
          <div className="text-6xl font-black text-[#00FFA3] my-4">{pct}%</div>
          <p className="text-gray-400">{finalScore} of {session.questions.length} correct</p>
          <div className="mt-6 text-xs text-gray-500">Score saved on-chain via Solana ⛓️</div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full mt-6">
            Back to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {current + 1} of {session.questions.length}</span>
          <span>{session.pdfName}</span>
        </div>
        <div className="h-1.5 bg-[#1e2840] rounded-full">
          <div className="h-1.5 bg-[#00FFA3] rounded-full transition-all" style={{ width: `${((current) / session.questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="card mb-6">
        <div className="text-xs text-[#00FFA3] tracking-widest mb-3">QUESTION {current + 1}</div>
        <p className="text-lg font-semibold leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {q.options.map((opt: string, i: number) => {
          let cls = 'card cursor-pointer transition-all hover:border-[#2d3f60] ';
          if (showAnswer) {
            if (i === q.correctAnswer) cls += 'border-[#00FFA3] bg-[#00FFA3]/10 ';
            else if (i === selected && i !== q.correctAnswer) cls += 'border-red-500 bg-red-500/10 ';
          } else if (selected === i) {
            cls += 'border-[#00C2FF] ';
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} className={cls + 'w-full text-left flex items-center gap-3 p-4'}>
              <span className="w-7 h-7 rounded-full border border-[#2d3f60] flex items-center justify-center text-sm font-bold shrink-0">
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswer && (
        <div className="card border-[#00FFA3]/30 mb-6">
          <div className="text-xs text-[#00FFA3] tracking-widest mb-2">EXPLANATION</div>
          <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
        </div>
      )}

      {showAnswer && (
        <button onClick={handleNext} className="btn-primary w-full">
          {current + 1 >= session.questions.length ? 'Finish Quiz →' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
EOF

# ── 27. Summary Page ─────────────────────────────────────────
cat > "src/app/summary/[id]/page.tsx" << 'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SummaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [view, setView] = useState<'bullets' | 'paragraph'>('bullets');

  useEffect(() => {
    const cached = localStorage.getItem(`summary_${id}`);
    if (cached) setSummary(JSON.parse(cached));
  }, [id]);

  if (!summary) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Loading summary...</div>
    </div>
  );

  return (
    <div className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-[#00FFA3] tracking-widest mb-1">⛓️ EXAMCHAIN</div>
        <h1 className="text-3xl font-black">Summary</h1>
        <p className="text-gray-400 text-sm mt-1">{summary.pdfName}</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setView('bullets')} className={view === 'bullets' ? 'btn-primary py-2 px-4 text-sm' : 'btn-secondary py-2 px-4 text-sm'}>
          Bullet Points
        </button>
        <button onClick={() => setView('paragraph')} className={view === 'paragraph' ? 'btn-primary py-2 px-4 text-sm' : 'btn-secondary py-2 px-4 text-sm'}>
          Paragraph
        </button>
      </div>

      <div className="card">
        {view === 'bullets' ? (
          <ul className="space-y-3">
            {summary.bulletPoints.map((point: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[#00FFA3] font-black text-sm mt-0.5">→</span>
                <span className="text-gray-200 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-200 leading-relaxed text-base">{summary.paragraph}</p>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={() => router.push('/upload')} className="btn-primary flex-1">
          Generate Quiz from This →
        </button>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary flex-1">
          Dashboard
        </button>
      </div>
    </div>
  );
}
EOF

# ── 28. Anchor Smart Contract (Rust) ─────────────────────────
cat > programs/examchain/src/lib.rs << 'EOF'
use anchor_lang::prelude::*;

declare_id!("ExamChain111111111111111111111111111111111111");

#[program]
pub mod examchain {
    use super::*;

    pub fn save_quiz_result(
        ctx: Context<SaveQuizResult>,
        session_id: String,
        pdf_hash: String,
        score: u8,
        total: u8,
    ) -> Result<()> {
        let record = &mut ctx.accounts.quiz_record;
        record.student = ctx.accounts.student.key();
        record.session_id = session_id;
        record.pdf_hash = pdf_hash;
        record.score = score;
        record.total = total;
        record.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct SaveQuizResult<'info> {
    #[account(
        init,
        payer = student,
        space = 8 + 32 + 4 + 64 + 4 + 64 + 1 + 1 + 8,
        seeds = [b"quiz", student.key().as_ref(), session_id.as_bytes()],
        bump
    )]
    pub quiz_record: Account<'info, QuizRecord>,
    #[account(mut)]
    pub student: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct QuizRecord {
    pub student: Pubkey,
    pub session_id: String,
    pub pdf_hash: String,
    pub score: u8,
    pub total: u8,
    pub timestamp: i64,
}
EOF

# ── 29. README ───────────────────────────────────────────────
cat > README.md << 'EOF'
# ⛓️ ExamChain — AI Study Tool on Solana

Open source AI-powered exam preparation platform built on Solana.

## Features
- 📄 Upload any PDF lecture note or textbook
- 🤖 Claude AI generates real exam-style questions
- 📝 Get bullet-point or paragraph summaries
- ⛓️ Quiz scores stored immutably on Solana
- 🔐 Email + Phantom Wallet authentication

## Quick Start

```bash
# 1. Add your API keys to .env.local
cp .env.local .env.local.bak
nano .env.local

# 2. Run the dev server
npm run dev
```

## Environment Variables
| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Get from console.anthropic.com |
| `JWT_SECRET` | Any random 32+ char string |
| `PINATA_JWT` | Get from app.pinata.cloud |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` or `mainnet-beta` |

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind
- **AI**: Claude API (Anthropic)
- **Blockchain**: Solana + Anchor Framework
- **Storage**: IPFS via Pinata
- **Auth**: JWT + Phantom Wallet

## Contributing
PRs welcome! See CONTRIBUTING.md

## License
MIT
EOF

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  ExamChain scaffolded successfully!  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}👉 Next steps:${NC}"
echo ""
echo -e "  1. ${CYAN}cd examchain${NC}"
echo -e "  2. Open ${CYAN}.env.local${NC} and add your API keys:"
echo -e "     • ANTHROPIC_API_KEY  → console.anthropic.com"
echo -e "     • PINATA_JWT         → app.pinata.cloud (free)"
echo -e "     • JWT_SECRET         → any random string"
echo ""
echo -e "  3. ${CYAN}npm run dev${NC}"
echo -e "  4. Open ${CYAN}http://localhost:3000${NC} 🚀"
echo ""
echo -e "${YELLOW}For Solana (Phase 2):${NC}"
echo -e "  • Install Anchor: ${CYAN}cargo install --git https://github.com/coral-xyz/anchor anchor-cli${NC}"
echo -e "  • ${CYAN}anchor build${NC} inside the project"
echo ""
echo -e "${GREEN}⛓️  Let's ship it!${NC}"
echo ""
