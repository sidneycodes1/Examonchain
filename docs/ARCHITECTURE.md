# ExamChain Architecture

Technical companion to `README.md` and `CONTRIBUTING.md`. All paths, columns, and status codes below were verified against the working tree on 2026-09-14. If code and this doc disagree, the code wins — open a docs fix PR.

## Core flows (ASCII)

### (a) Upload → quiz generation → submission → reward

```
[Browser: FileDropZone.tsx]
  │ FormData(file, walletAddress?, email?, name?) + Bearer Privy JWT (XHR, progress %)
  ▼
POST /api/materials (app/api/materials/route.ts)
  │ verifyPrivyToken → users[privy_id] (auto-create temp-<privyId>)
  │ validate type/ext/size (50 MB) → pdf-parse require() → extracted_text
  │ storage study-materials: uploads/<privyId>/<materialId>/<filename>
  │ INSERT materials → 200 { materialId, title, fileName, … }  ← NOTE: camelCase, NOT the Material type (see §Known quirks)
  ▼
[Browser: StudioPanel.tsx → POST /api/quizzes { materialId }]
  │ verify → ownership materials[user_id] → reject empty extracted_text (400)
  │ generateQuizFromText() (lib/gemini.ts → gemini-1.5-flash JSON mode → zod QuizSchema)
  │ INSERT quizzes → questions → options → 200 { quizId }
  ▼
[Browser: /quiz/[id] → QuizContainer.tsx → POST /api/submissions { quizId, answers }]
  │ verify → normalize answers (Record | [{questionId,optionId}]) → score = round(correct/total*100)
  │ tokensEarned = score>=70 ? score : 0
  │ INSERT quiz_results + user_answers (always)
  │ IF tokensEarned>0: INSERT token_distributions(pending)
  │   → isValidSolanaAddress(phantom_wallet)? getMint.decimals → SPL transfer (treasury→user ATA, create ATA if missing)
  │   → confirmed(tx_signature)+users.total_tokens_earned  ELSE failed
  │ 200 { resultId, score, tokensEarned, txHash|null }
  ▼
[Retry: QuizResults.tsx / settings/page.tsx → POST /api/submissions/claim { resultId }]
    verify → wallet check → distributions[quiz_result_id] (skip if confirmed)
    → distributeTokens() → confirmed + totals  |  503 if unconfigured, 400 if no wallet
```

### (b) Authentication → session → protected access

```
[Browser: login|signup/page.tsx → usePrivySafe().login()]
  │ Privy modal (email/Google/Phantom) — SDK loaded ONLY via PrivySafeProvider dynamic import() (client, useEffect)
  │ usePrivy() runs inside hidden Caller component → snapshot → PrivySafeContext { ready, authenticated, user, getAccessToken, … }
  ▼
[Client gate: ready? Spinner : authenticated? content : router.push('/login')]
  │ API calls attach `Authorization: Bearer <await getAccessToken()>`
  │ 401 from API → logout() + push('/login') (ChatArea, MaterialsContext, LayoutWrapper, quiz/[id], settings)
  ▼
[Edge: src/middleware.ts] — passthrough (NextResponse.next()), NO auth. All enforcement is per-route.
  ▼
[API route: verifyPrivyToken(header) (lib/auth.ts)]
  │ jose jwtVerify(token, JWKS https://auth.privy.io/api/v1/apps/<appId>/jwks.json, { issuer:'privy.io', audience:appId })
  │ claims.sub = did:privy:… → users WHERE privy_id=sub → id (uuid) → scoped queries (.eq('user_id', id), .is('deleted_at',null))
  │ auth errors → isAuthErrorMessage() → 401 { error }  (never 500 for bad tokens)
  ▼
[(protected)/layout.tsx → MaterialsProvider → LayoutWrapper(Sidebar|children||ChatArea|StudioPanel)]
```

## Database schema (from `supabase/migrations/*.sql` — columns verbatim)

- `users` (`001`): `id uuid PK gen_random_uuid()`, `privy_id text UNIQUE NOT NULL`, `phantom_wallet text UNIQUE NOT NULL`, `email text`, `name text`, `total_tokens_earned bigint DEFAULT 0`, `created_at/updated_at`. Index `idx_users_privy_id`. Identity root: every other table reaches a user via `privy_id → id`.
- `materials` (`002`): `id uuid PK`, `user_id uuid → users(id) CASCADE`, `title/file_name/storage_path TEXT NOT NULL`, `file_size_bytes int`, `file_type text`, `extracted_text text`, `uploaded_at`, `deleted_at` (soft-delete flag; `GET` filters `.is('deleted_at', null)`). Index on `user_id`. File bytes live in Storage, not here.
- `quizzes` + `questions` + `options` (`003`): `quizzes(id, material_id→materials CASCADE, user_id→users CASCADE, title, created/updated)`. `questions(id, quiz_id→quizzes CASCADE, question_text, question_type DEFAULT 'multiple-choice', …)`. `options(id, question_id→options CASCADE, option_text, is_correct bool DEFAULT FALSE, …)`. Indexes on all FKs. `GET /api/quizzes/[id]` intentionally omits `is_correct`.
- `quiz_results` + `user_answers` + `token_distributions` (`004`): `quiz_results(id, quiz_id→quizzes CASCADE, user_id→users CASCADE, score int, total_questions int, completed_at)`. `user_answers(id, quiz_result_id→results CASCADE, question_id→questions CASCADE, selected_option_id→options CASCADE NULLABLE, is_correct bool, …)`. `token_distributions(id, user_id→users CASCADE, quiz_result_id→results SET NULL, amount bigint DEFAULT 0, tx_signature text, status text DEFAULT 'pending', distributed_at)`. `status ∈ {pending, confirmed, failed}` by convention (no CHECK constraint).
- RLS (`005`): `ENABLE ROW LEVEL SECURITY` on all 8 tables + `current_user_id()` helper (`users WHERE privy_id = auth.jwt()->>'sub' OR id = auth.uid()`) + one `FOR ALL USING (user_id = current_user_id())`-style policy per table (questions/options/user_answers via sub-selects through their parents).

## Privy dynamic-import bridge (why it exists)

`@privy-io/react-auth` pulls `viem` → `ox`, and `ox/_esm/tempo/internal/virtualMasterPool.js` uses a dynamic `require(expr)` that webpack/Next 14 cannot statically analyze (`Critical dependency: the request of a dependency is an expression` — visible in every `dev`/`build` log through `src/components/auth/PrivyProvider.tsx`). A static `import … from '@privy-io/react-auth'` in any server-included module drags that chain into the server bundle.

The bridge (`src/components/auth/PrivySafeProvider.tsx`, 143 lines — the reference implementation):

1. Module top-level never imports the SDK (only a comment names it).
2. `PrivySafeProvider` mounts children immediately with a `loadingApi` (`ready:false`, no-op fns).
3. `useEffect` (client-only) runs `import('@privy-io/react-auth')`, reads `mod.usePrivy`, and constructs a hidden `PrivyHookCaller` component that calls `usePrivy()` unconditionally in its own body (hooks-safe) and pushes `{ ready, authenticated, user, getAccessToken, login, logout, linkWallet, unlinkWallet, connectWallet }` snapshots into context via `fnsRef` (avoids effect churn).
4. Consumers call `usePrivySafe()` — a plain context read with zero SDK imports (see `useUser.ts`, `MaterialsContext.tsx`, `ChatArea.tsx`, `QuizContainer.tsx`).

`src/components/auth/PrivyProvider.tsx` is the second sanctioned touchpoint: `next/dynamic(() => import('@privy-io/react-auth').then(m => m.PrivyProvider), { ssr:false })` wrapping the app in `src/app/layout.tsx`. Both mounts are dynamic (verified: zero static `from '@privy-io/react-auth'` in `src/`), but the double mount is redundant — see quirks.

## RLS-bypass-via-admin-client (current state and path to real RLS)

Current: every API handler calls `createAdminClient()` (`src/lib/supabase/server.ts:31-39`, service-role key, server-only guard) and enforces ownership in application code (`users WHERE privy_id = claims.sub`, then `.eq('user_id', dbUser.id)`). The `005` RLS policies never evaluate because service-role bypasses RLS by design. This is deliberate, not accidental: Privy JWTs are not Supabase Auth JWTs, so `auth.jwt()->>'sub'` / `auth.uid()` carry no Privy identity and RLS `USING` clauses would reject everyone.

To enforce RLS properly in the future (all three required, in order):

1. Bridge identity: after `verifyPrivyToken`, mint a Supabase Auth session for the `users.id` (custom JWT with `sub = users.id` signed by the Supabase JWT secret, or Supabase Auth admin `createUser` + `signIn`), and use the anon-key client with that token instead of service-role for row reads/writes.
2. Align `current_user_id()`: keep the `privy_id` fallback during migration, then tighten to `id = auth.uid()` once all sessions are Supabase-issued.
3. Add storage RLS: the `study-materials` bucket is currently public with service-role uploads; add bucket policies mirroring `materials.user_id` once user-scoped tokens exist. Until then, do not expose service-role to the client and do not “fix” RLS by weakening `005` policies.

## API error-handling conventions (this codebase’s dialect)

- Envelope: success `{ success: true, data?/quizId?/resultId?/reply?/txHash?… }`, failure `{ error: string }`. No `{ message }`, no error codes, no stack traces to the client (stacks stay in `console.error` server logs — 56 sites).
- `400` — zod `safeParse` failure (first issue message), bad shapes (`quizId`/`resultId`/`materialId` must be UUID; `message` 1–4000 chars; `history` ≤ 50), empty-text quiz gen, already-claimed retry, no-wallet claim, unsupported type / >50 MB upload.
- `401` — exactly the two `isAuthErrorMessage` strings (`Missing or invalid Authorization header`, `Invalid or expired token`), plus `Unauthorized profile` when the JWT is valid but no `users` row matches (except routes that auto-provision: `POST /api/materials`, `GET /api/profile`). Bad tokens fail closed, never empty-list.
- `404` — “not found or access denied” merged (materials/quizzes/questions) to avoid ownership oracle.
- `410` — only `POST /api/quizzes/[id]`: `Deprecated: submit quizzes via POST /api/submissions`.
- `500` — DB/storage/Gemini-throw catch-alls (message forwarded, logged with context prefix e.g. `POST quiz submissions route error:`).
- `503` — configured-guard rejections with stable strings clients match on: `AI quiz generation is not configured yet` (`quizzes/route.ts:62`), `AI chat is not configured yet` (`ai/chat/route.ts:27`), `Token rewards are not configured yet` (`solana.ts:29`, `claim/route.ts:112`).
- Validation lives in `src/lib/validators.ts` (`SubmissionsPostSchema` accepts map OR array answers; `ClaimPostSchema`/`QuizzesPostSchema` UUID-only; `ChatPostSchema` caps message/history lengths). Auth lives in `src/lib/auth.ts`. Money movement lives only in `src/lib/solana.ts:distributeTokens`.

## Known quirks (carried from the 2026-09-14 audit — fix with code PRs, not docs edits)

1. `dashboard/page.tsx` is `return null`; the workspace renders via `LayoutWrapper`’s `children || <ChatArea/>` fallback.
2. `POST /api/materials` returns camelCase `{ materialId, fileName, fileSizeBytes, … }` while `FileDropZone.tsx` types it as snake_case `Material` and feeds it to `setSelectedMaterial` — first post-upload selection is misshapen until refetch.
3. `users.total_tokens_earned` updated with native `BigInt` (`submissions/route.ts`, `claim/route.ts`) — serializer-dependent; prefer `Number`/string.
4. `src/middleware.ts` is a passthrough; `pnpm build` crashes at “Collecting page data” (`3221225794`) while `tsc --noEmit` is clean.
