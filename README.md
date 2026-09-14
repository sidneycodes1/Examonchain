# ExamChain

ExamChain is an AI-powered study platform with blockchain-verified credentials and token rewards — not just a quiz app. Students upload study materials (PDF/image), the app generates multiple-choice quizzes with Google Gemini, scores submissions server-side, and pays EXB SPL-token rewards on Solana devnet when the score meets the threshold. A material-scoped AI chat assistant, Phantom wallet linking via Privy, and a retryable on-chain claims queue complete the loop.

> Audit note (2026-09-14, verified against code): this README describes the repaired working-tree state that has not yet been committed or pushed (see **Current project status**). Every route, path, and env var below was re-checked against `src/` in this pass. Where the code and old reports disagree, the code wins and the disagreement is called out.

## Core product loop

1. **Upload** — authenticated user drops a PDF/PNG/JPG/GIF (≤ 50 MB) into `FileDropZone`. `POST /api/materials` extracts PDF text with `pdf-parse`, uploads the file to the Supabase Storage bucket `study-materials` at `uploads/<privyId>/<materialId>/<filename>`, and inserts a `materials` row (`extracted_text` may be empty for images).
2. **AI quiz** — user picks a material in the Studio panel. `POST /api/quizzes` (`{ materialId }`) rejects empty-text materials (400), calls Gemini (`gemini-1.5-flash`, JSON mode, 10 questions × 4 options, exactly one `isCorrect`), and inserts `quizzes` → `questions` → `options` rows. Returns `quizId`; client routes to `/quiz/[id]`.
3. **Score threshold** — user answers in `QuizContainer`. `POST /api/submissions` (`{ quizId, answers }`) evaluates server-side against `options.is_correct`, computes `score = round(correct/total*100)`, sets `tokensEarned = score >= 70 ? score : 0` (e.g. 85% → 85 EXB). Inserts `quiz_results` + `user_answers` rows always; token logic only runs above threshold.
4. **Token reward** — for passing scores the route inserts a `token_distributions` row (`pending`), validates the user's `phantom_wallet` with base58 + 32-byte check, reads EXB mint decimals dynamically (`getMint`), transfers base-unit SPL tokens from the treasury keypair on devnet, marks the distribution `confirmed` with `tx_signature`, and bumps `users.total_tokens_earned`. Failures (no wallet, unconfigured keys, RPC error) mark the row `failed` instead of crashing the submission.
5. **Retry / verify** — failed or pending distributions appear in Settings (“Pending EXB claims”) and `QuizResults` (“Claim Tokens”). `POST /api/submissions/claim` (`{ resultId }`) re-runs the transfer. Success links to `https://explorer.solana.com/tx/<sig>?cluster=devnet`.
6. **Study chat (parallel loop)** — any material can be discussed with `POST /api/ai/chat` (`{ materialId, message, history }`), which injects `materials.extracted_text` as the Gemini system prompt.

## Tech stack

| Layer | Choice | Why (where non-obvious) |
|---|---|---|
| Framework | Next.js `14.2.35` App Router, React 18 | Route groups `(auth)` / `(protected)`, server `route.ts` handlers |
| Auth | `@privy-io/react-auth` `^3.29.2` + `jose` | One Privy flow covers email, Google OAuth, and Phantom wallet — avoids wiring raw `@solana/wallet-adapter` + custom OAuth. Server verifies the Privy JWT against `https://auth.privy.io/api/v1/apps/<appId>/jwks.json` (`issuer: privy.io`, `audience: appId`). Client never statically imports the SDK (see Architecture) |
| Database / storage | `@supabase/ssr` `^0.12.0` + `@supabase/supabase-js` `^2.108.1` | `@supabase/ssr` specifically because `createServerClient` / `createBrowserClient` are the supported cookie-aware clients; the older `@supabase/auth-helpers-nextjs` is deprecated and must not be installed alongside (see CONTRIBUTING). All API routes use the service-role admin client (`createAdminClient`) and enforce ownership manually via `users.privy_id` — RLS is enabled in SQL but bypassed at runtime (accepted trade-off, see below) |
| AI | `@google/generative-ai` `^0.24.1`, model `gemini-1.5-flash` | JSON-mode generation with zod validation (`QuizSchema`); same model backs quiz gen and chat |
| Solana | `@solana/web3.js` `^1.98.4`, `@solana/spl-token` `^0.4.14`, `bs58` `^6.0.0` | ATA creation + SPL transfer from a treasury keypair; `bs58` for address/secret-key handling; mint decimals read live via `getMint` so any mint works |
| Upload parsing | `pdf-parse` `^2.4.5` | Must stay `const pdf = require('pdf-parse')` inside the route — a top-level ES import breaks the Next server bundle (see CONTRIBUTING) |
| Validation | `zod` `^4.4.3` | `SubmissionsPostSchema`, `ClaimPostSchema`, `QuizzesPostSchema`, `ChatPostSchema` in `src/lib/validators.ts`; every mutating route uses `safeParse` → 400 on first issue |
| Styling | `tailwindcss` `^3.4.1`, dark palette (`#0D0D0D` bg, `#1A1A1A` panels, `#00C896` accent) | Utility-first; shared primitives in `src/components/ui/` |
| Package manager | pnpm (`pnpm-lock.yaml`; observed `10.32.1`) | pnpm only — no `package-lock.json` / `yarn.lock` in repo |

## Prerequisites

- Node.js ≥ 18.17 (observed dev version `v24.11.1`; `@types/node` `^20`). pnpm `≥ 8` (observed `10.32.1`).
- Accounts / keys:
  - Supabase project (URL + anon key + service-role key). Migrations `001`–`005` must be applied in order.
  - Privy dashboard app (App ID). Enables email + Google + Phantom in one modal.
  - Google AI Studio API key (Gemini). Model used: `gemini-1.5-flash`.
  - Solana devnet setup: RPC URL (default `https://api.devnet.solana.com`), an EXB SPL mint address, and the treasury authority secret key (base58 64-byte; base64 64-byte accepted as fallback) funded with SOL + EXB.

## Setup

```bash
git clone https://github.com/sidneycodes1/Examonchain.git
cd Examonchain
pnpm install
cp .env.example .env.local   # then fill values (names below are canonical — must match code exactly)
```

Environment variables — canonical names as read by `process.env` in `src/` (see `.env.example` comments for where to obtain each):

```
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SOLANA_RPC
NEXT_PUBLIC_EXB_MINT_ADDRESS
GOOGLE_GEMINI_API_KEY
SOLANA_PRIVATE_KEY
```

> Known pitfall, verified 2026-09-14: an older `.env.local` in the wild uses `NEXT_PUBLIC_SOLANA_RPC_URL`, `SOLANA_EXB_MINT`, `GEMINI_API_KEY`, and `SOLANA_TREASURY_SECRET`. Those four names are **not** read by any code and will leave Solana + Gemini “not configured yet.” `.env.example` in this repo now contains only the eight canonical names. If you copied `.env.local` from an old gist, rename those four keys.

Apply migrations (Supabase SQL editor in order, or `supabase db push` if linked):

```
supabase/migrations/001_create_users_table.sql
supabase/migrations/002_create_materials_table.sql
supabase/migrations/003_create_quizzes_questions_options.sql
supabase/migrations/004_create_results_answers_distributions.sql
supabase/migrations/005_enable_rls.sql
```

The `study-materials` Storage bucket is auto-created (public) on first upload by `POST /api/materials`; no manual bucket step is required, but the service-role key must have storage rights.

Start the dev server:

```bash
pnpm dev
# → http://localhost:3000  (Next.js 14.2.35, “Environments: .env.local”)
```

Smoke check: `GET /` → 200 (redirect splash to `/dashboard`); `GET /api/health` → `{"status":"ok"}`. Authenticated routes need a Privy token (see Architecture).

## Route map

Frontend pages (`src/app/`):

- `/` (`page.tsx`) — splash (“ExamChain / Loading…”), client-redirects to `/dashboard`.
- `/login` (`(auth)/login/page.tsx`) — Privy login card; redirects to `/dashboard` when already authenticated.
- `/signup` (`(auth)/signup/page.tsx`) — same Privy flow with signup copy; redirects when authenticated.
- `/dashboard` (`(protected)/dashboard/page.tsx`) — ⚠️ currently `return null` (stub). At runtime the `(protected)/layout.tsx` → `LayoutWrapper` fallback (`children || <ChatArea/>`) renders the default 3-panel view (Sidebar + Chat + Studio), so the page *looks* alive, but the route file itself is a placeholder. See Status.
- `/chat` (`(protected)/chat/page.tsx`) — material picker + `ChatArea`.
- `/settings` (`(protected)/settings/page.tsx`) — profile card, Phantom link/unlink, pending-claims retry list.
- `/quiz/[id]` (`(protected)/quiz/[id]/page.tsx`) — fetches quiz, renders `QuizContainer` → `QuizResults`.

API endpoints (`src/app/api/`, all except `/api/health` require `Authorization: Bearer <Privy JWT>`):

- `POST /api/materials` — multipart upload (`file`, optional `walletAddress/email/name`); validates type/50 MB, extracts PDF text, Storage upload, creates user row on first login (`phantom_wallet: temp-<privyId>` fallback), inserts material. `GET /api/materials` — list own non-deleted materials.
- `GET /api/materials/[id]` — fetch one owned material. `DELETE /api/materials/[id]` — soft-delete row (`deleted_at`) then best-effort `storage.from('study-materials').remove([storage_path])`.
- `POST /api/quizzes` — `{ materialId }` → Gemini → insert quiz/questions/options → `{ quizId }`. `GET /api/quizzes` — list own quizzes. `GET /api/quizzes/[id]` — quiz + questions with options **without** `is_correct`. `POST /api/quizzes/[id]` — 410 stub (`Deprecated: submit quizzes via POST /api/submissions`); never scores.
- `POST /api/submissions` — `{ quizId, answers }` (map or `[{questionId,optionId}]`) → score → `quiz_results` + `user_answers` → pending→confirmed/failed `token_distributions` + SPL transfer when `score >= 70`.
- `GET /api/submissions/claim` — list own non-`confirmed` distributions. `POST /api/submissions/claim` — `{ resultId }` → re-run SPL transfer, `503` when rewards unconfigured.
- `POST /api/ai/chat` — `{ materialId, message, history? }` → Gemini with material text as system prompt → `{ reply }`. `503` when AI unconfigured.
- `GET /api/profile` — own profile (`id/privyId/phantomWallet/email/name/totalTokensEarned`); auto-creates `temp-<privyId>` row on first call.
- `GET /api/health` — `{ status: "ok" }`, no auth.

## Folder structure

```
src/app/            Next.js routes. (auth)/ = public (login/signup, no MaterialsProvider).
                    (protected)/ = behind LayoutWrapper (MaterialsProvider + Sidebar/Chat/Studio chrome).
                    api/ = server route handlers. layout.tsx mounts Privy providers. page.tsx is the splash.
src/components/     auth/ (Privy bridge + buttons), dashboard/ (Navbar/Sidebar/ChatArea/StudioPanel/LayoutWrapper/MobileBottomTabs),
                    quiz/ (QuizContainer/QuizResults), ui/ (Button/Card/Input/Modal/Spinner/Toast/Tooltip/Badge/ProgressBar),
                    upload/ (FileDropZone).
src/lib/            auth.ts (JWKS verify), gemini.ts (quiz gen + configured-guards), solana.ts (address validation + SPL payout),
                    validators.ts (zod schemas), supabase/{client,server}.ts, utils.ts (cn()).
src/context/        MaterialsContext.tsx — materials list, selection, refresh, delete, upload-modal state.
src/hooks/          useUser.ts — thin usePrivySafe selector (ready/authenticated/user/walletAddress/userId).
src/types/          database.ts (User/Material), quiz.ts (Quiz/Question/Option/SubmissionResult/ChatMessage), index.ts re-export.
src/middleware.ts   Root-level passthrough (NextResponse.next()). NOTE: NOT src/app/middleware.ts (that path was deleted).
src/styles/         globals.css.
supabase/migrations/ 001 users → 002 materials → 003 quizzes/questions/options → 004 results/answers/distributions → 005 RLS enable+policies.
```

Reasoning: `(auth)` vs `(protected)` separates the logged-out Privy entry points (centered cards, no app chrome) from the logged-in 3-panel workspace (`Sidebar` sources | `ChatArea` | `StudioPanel`, with `MobileBottomTabs` under 1024 px). `lib/` holds every external-service secret (never import these from client components — they read `process.env` server-side). `validators.ts` is the single validation source so client and server agree on shapes. `context/` owns cross-panel state (selected material) so `/dashboard`, `/chat`, and `/quiz/[id]` stay in sync.

## Current project status

### Working and verified (read in this pass, 2026-09-14)

- Login, signup, settings, chat pages render real UI (login/signup 62 lines, settings 249, chat 56 + 221-line `ChatArea`).
- Quiz take flow (`quiz/[id]` + `QuizContainer` + `QuizResults`) posts to the single scorer `POST /api/submissions`; deprecated `POST /api/quizzes/[id]` returns 410.
- Zero static `from '@privy-io/react-auth'` imports; only dynamic `import()` in `PrivyProvider.tsx` + `PrivySafeProvider.tsx`; all consumers use `usePrivySafe`.
- EXB scaling reads `getMint(...).decimals` dynamically; wallet check is `bs58.decode` + 32-byte + `PublicKey`.
- `DELETE /api/materials/[id]` soft-deletes *and* removes the Storage object (best-effort).
- Dead files gone from disk (`quiz/ProgressBar`, `QuizQuestion`, `ResultsCard`, `dashboard/ChatMessage`, `hooks/useResponsive`, `app/middleware.ts`); `tsconfig.tsbuildinfo` gitignored + untracked.
- `tsc --noEmit` clean (exit 0). Fresh `pnpm dev` → Ready ~14 s on port 3000, `GET /` 200, `GET /api/health` 200.

### Built but untested (blocked on API keys — blocking key in parens)

- Privy login → JWT verify → profile auto-provision (`NEXT_PUBLIC_PRIVY_APP_ID`).
- Upload → Supabase Storage + `pdf-parse` text (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Quiz generation + AI chat (`GOOGLE_GEMINI_API_KEY` — `.env.local` historically used `GEMINI_API_KEY`, which the code ignores).
- SPL payout + claim retry on devnet (`NEXT_PUBLIC_SOLANA_RPC`, `NEXT_PUBLIC_EXB_MINT_ADDRESS`, `SOLANA_PRIVATE_KEY` — `.env.local` historically used `..._RPC_URL` / `SOLANA_EXB_MINT` / `SOLANA_TREASURY_SECRET`, all ignored).
- Scoring math (`score>=70 → tokensEarned=score`) and Explorer-link display — needs seeded quiz data, no key required but no browser session was run in this pass.

### Not yet started / known-broken (do not mistake for done)

- `src/app/(protected)/dashboard/page.tsx` is `return null`. Visible only because `LayoutWrapper` falls back to `<ChatArea/>`. Needs a real dashboard or explicit removal.
- `pnpm build` fails at “Collecting page data”: `Next.js build worker exited with code: 3221225794`. `tsc` is clean, so this is a prerender/worker crash, not a type error. Production is currently unshippable; dev is unaffected.
- Upload-response shape bug (new in this audit): `POST /api/materials` returns camelCase `{materialId,fileName,…}` but `FileDropZone` types it as `Material` (snake_case) and feeds it to `setSelectedMaterial`. First-click select/delete after upload will misbehave until refetch.
- Studio outputs beyond Quiz (Flashcards, Mind Map, Slide Deck/BETA, Reports, Data Table) are `coming soon!` toasts in `StudioPanel.tsx`, not features.
- `src/middleware.ts` is a passthrough; no edge auth. `BigInt` totals are written straight to Supabase (serializer-dependent). Internal links use `<a href>` (full reloads) and quiz/delete flows use `alert`/`confirm` instead of the existing `Toast`/`Modal`.
- Nothing in this working tree is committed or pushed (`git status` 41 paths; `origin/main..HEAD` empty). The repair exists only on disk.

## Known limitations / accepted trade-offs

- **RLS bypassed via service-role.** `005_enable_rls.sql` enables RLS + owner policies (`current_user_id()` mapping `privy_id`/`auth.uid()`), but every API route uses `createAdminClient()` (service-role) and enforces `users.privy_id = token.sub` manually. Deliberate (Privy JWTs are not Supabase Auth JWTs, so RLS `auth.*` claims don’t apply). Future: mint Supabase Auth sessions from Privy identities or move checks into RLS with a custom JWT claim.
- **No on-chain Anchor program.** Rewards are direct SPL transfers from a treasury keypair (`SOLANA_PRIVATE_KEY`), not a program escrow. Treasury key compromise = fund loss; key rotation is manual.
- **Benign Privy dependency warnings.** `ox/.../virtualMasterPool.js — Critical dependency: the request of a dependency is an expression` (via `viem` → `@privy-io/react-auth`) appears in both `pnpm dev` and `pnpm build` through `PrivyProvider.tsx`. Upstream dynamic-require pattern; safe to ignore unless it becomes an error.
- **Images have no text.** Only PDFs get `extracted_text`; image uploads store the file with empty text and quiz generation correctly rejects them (400). OCR is out of scope.
- **Package name drift.** `package.json` `name` is `saveme` (v0.1.0, private) while the product is ExamChain. Cosmetic; rename only with a lockfile refresh.

## License

License unspecified — no `LICENSE` / `LICENCE` file exists in the repo. Confirm with the project owner before publishing or accepting external contributions.
