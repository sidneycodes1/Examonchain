# ExamChain

AI-powered exam preparation platform on Solana. Upload PDFs, get real exam-style questions and summaries, and (optionally) store quiz scores on-chain.

> Upload your lecture notes. Get real exam-style questions. Own your academic record on Solana.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State**: Zustand
- **AI**: Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Storage**: IPFS via Pinata
- **Auth**: Email + password, JWT (`jose`), httpOnly cookies
- **Blockchain**: Solana + Anchor program for on-chain quiz scores
- **DB**: Local JSON file (`data/db.json`) – can be swapped for Postgres

---

## Features

- **Authentication**
  - Email + password login and registration (JWT, httpOnly cookie)
  - Auth state stored in a small Zustand store on the client

- **PDF Upload**
  - Drag-and-drop or file picker
  - Max 10MB PDFs
  - Uploaded to IPFS (Pinata)
  - Text extracted on the server with `pdf-parse`
  - Scanned / image-only PDFs rejected with a clear 422 error

- **AI Question Generation**
  - Uses Claude to generate **exactly 10** multiple-choice questions per PDF
  - Questions focus on application/analysis (not just recall)
  - Each question has 4 options, correct index, and explanation
  - Quiz session stored in the JSON DB

- **AI Summary Mode**
  - Claude generates:
    - 8 bullet-point key ideas
    - 3–4 sentence paragraph summary

- **Quiz Interface**
  - Question-by-question flow
  - Immediate feedback with color states (correct / incorrect)
  - Explanation displayed after each answer
  - Final score and simple emoji-based feedback

- **On-Chain Score Storage (Solana)**
  - Anchor program sketch in `programs/examchain/src/lib.rs`
  - PDA seeds: `["quiz", student_pubkey, session_id]`
  - Stores `student`, `session_id`, `pdf_hash`, `score`, `total`, `timestamp`
  - Frontend already wired with a placeholder Solana client for future integration

- **Quiz History**
  - History page shows previous quiz sessions with scores
  - Includes Solana explorer links when an on-chain tx is present

---

## Getting Started (Local Dev)

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/examchain.git
cd examchain
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

- `ANTHROPIC_API_KEY` — Claude API key
- `JWT_SECRET` — random string for signing JWTs
- `PINATA_API_KEY` / `PINATA_SECRET_API_KEY` — Pinata API keys
- `SOLANA_PROGRAM_ID` — (optional) your deployed Anchor program ID

You can leave the Solana program ID empty while working only on the web UX.

### 3. Run the app

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

Login / register with any email + password (data is stored locally in `data/db.json`).

---

## Project Structure

```text
src/
  app/
    (auth)/login/page.tsx         # email/password login
    (auth)/register/page.tsx      # registration
    dashboard/page.tsx            # main hub for logged-in users
    upload/page.tsx               # PDF upload + AI actions
    quiz/[id]/page.tsx            # quiz player
    summary/[id]/page.tsx         # summary view
    history/page.tsx              # quiz history
    api/                          # all API routes
  lib/
    db.ts                         # JSON file DB helper
    auth.ts                       # JWT helpers + getAuthUser
    claude.ts                     # calls to Anthropic
    ipfs.ts                       # Pinata client
    solana.ts                     # Solana helpers (placeholder client)
  components/
    quiz/QuizCard.tsx
    summary/SummaryView.tsx
  store/
    authStore.ts                  # small Zustand auth store
programs/
  examchain/src/lib.rs            # Anchor program for quiz scores
data/
  db.json                         # local JSON database (dev only)
```

---

## Roadmap / Ideas for Contributors

These are great places to contribute:

- **1. Solana integration**
  - Wire the existing Anchor program into the frontend using `@coral-xyz/anchor` or a plain `@solana/web3.js` client.
  - Save quiz scores on-chain when a user finishes a quiz.
  - Show transaction status and errors in the UI.

- **2. Phantom wallet login**
  - Add Phantom wallet adapter and connect button.
  - Allow “login with wallet” as an alternative identity.
  - Link email account + wallet on the backend.

- **3. Better question quality controls**
  - Add sliders/toggles for difficulty (easy/medium/hard).
  - Add exam style presets (MCQ, short answer, etc.).

- **4. Analytics & progress**
  - Show score trends over time.
  - Per-PDF statistics (best score, attempts, last score).

- **5. Database backend**
  - Swap `data/db.json` for Postgres (Prisma, Drizzle, or raw SQL).
  - Keep the same TypeScript interfaces from `src/types`.

- **6. UI / UX polish**
  - Improve mobile layout.
  - Add dark/light mode toggle (keeping the Solana-inspired palette).
  - Add animations and skeleton loaders where it makes sense.

If you have other ideas, feel free to open an issue or discussion!

---

## Contributing

1. **Fork** the repo on GitHub.
2. **Clone** your fork and create a feature branch:

   ```bash
   git checkout -b feature/my-idea
   ```

3. **Run the app locally** and make your changes.
4. **Add tests or updates** to docs if needed.
5. **Commit** with a clear message and **open a Pull Request** against `main`.

Please see `CONTRIBUTING.md` for more details and guidelines.

---

## License

This project is licensed under the **MIT License** – see `LICENSE` for details.
