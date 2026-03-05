import { User, QuizSession, Summary } from "@/types";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

export interface Database {
  users: User[];
  quizSessions: QuizSession[];
  summaries: Summary[];
}

const defaultDb: Database = {
  users: [],
  quizSessions: [],
  summaries: [],
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function readDb(): Promise<Database> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { ...defaultDb };
  }
}

async function writeDb(db: Database): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function getUsers(): Promise<User[]> {
  const db = await readDb();
  return db.users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(user: User): Promise<User> {
  const db = await readDb();
  db.users.push(user);
  await writeDb(db);
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const db = await readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  await writeDb(db);
  return db.users[idx];
}

export async function getQuizSessions(): Promise<QuizSession[]> {
  const db = await readDb();
  return db.quizSessions;
}

export async function getQuizSessionById(id: string): Promise<QuizSession | undefined> {
  const sessions = await getQuizSessions();
  return sessions.find((s) => s.id === id);
}

export async function getQuizSessionsByUserId(userId: string): Promise<QuizSession[]> {
  const sessions = await getQuizSessions();
  return sessions.filter((s) => s.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createQuizSession(session: QuizSession): Promise<QuizSession> {
  const db = await readDb();
  db.quizSessions.push(session);
  await writeDb(db);
  return session;
}

export async function updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | null> {
  const db = await readDb();
  const idx = db.quizSessions.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.quizSessions[idx] = { ...db.quizSessions[idx], ...updates };
  await writeDb(db);
  return db.quizSessions[idx];
}

export async function getSummaries(): Promise<Summary[]> {
  const db = await readDb();
  return db.summaries;
}

export async function createSummary(summary: Summary): Promise<Summary> {
  const db = await readDb();
  db.summaries.push(summary);
  await writeDb(db);
  return summary;
}
