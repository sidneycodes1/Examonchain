# Contributing to ExamChain

This is the guardrail file. Read it and `README.md` fully before changing anything — human or AI agent. When in doubt about scope, do less and report back.

## Non-negotiable rules

1. **Never install `@supabase/auth-helpers-nextjs` alongside `@supabase/ssr`.** Reason: the helpers package is deprecated and registers a conflicting cookie/auth client; this repo standardizes on `createServerClient` / `createBrowserClient` / `createClient` from `@supabase/ssr` + `@supabase/supabase-js` (see `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`).
2. **All `@privy-io/react-auth` access goes through the dynamic-import bridge.** Reason: the SDK (via `viem`/`ox`) uses dynamic `require()` expressions that Next 14’s server bundler cannot statically analyze; a static top-level import poisons the server bundle. Reference implementation: `src/components/auth/PrivySafeProvider.tsx` (client-only `import('@privy-io/react-auth')` inside `useEffect`, `usePrivy()` called unconditionally inside a hidden `Caller` component, consumers use `usePrivySafe()`). `src/components/auth/PrivyProvider.tsx` (`next/dynamic(..., { ssr: false })`) is the only other sanctioned touchpoint. Never add `import … from '@privy-io/react-auth'` anywhere else — CI greps for it.
3. **`pdf-parse` stays `const pdf = require('pdf-parse')`, never `import`.** Reason: same bundling issue as above; the `require` call lives inside `POST /api/materials` in `src/app/api/materials/route.ts:42` with an eslint-disable for `@typescript-eslint/no-require-imports`. Do not “clean it up.”
4. **`privy_id` is the only identity key for ownership checks.** Reason: Supabase rows key off `users.privy_id` (TEXT, unique); the Privy JWT `sub` is a `did:privy:…` DID, not a UUID and not an email/wallet. Every API route pattern is: `verifyPrivyToken(header)` → `claims.sub` → `users WHERE privy_id = sub → id` → `… WHERE user_id = dbUser.id`. Never substitute `email`, `phantom_wallet`, or `auth.uid()`.
5. **pnpm only.** Reason: `pnpm-lock.yaml` is the single lockfile; `package-lock.json` / `yarn.lock` must never appear. Install with `pnpm install`, run with `pnpm dev` / `pnpm build`.
6. **Never commit real secrets; keep `.env.example` in sync (names only, no values).** Reason: `.env.local` is gitignored; `.env.example` lists the eight canonical names the code reads (`NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SOLANA_RPC`, `NEXT_PUBLIC_EXB_MINT_ADDRESS`, `GOOGLE_GEMINI_API_KEY`, `SOLANA_PRIVATE_KEY`). If you add a `process.env.X`, add `X=` plus its comment to `.env.example` in the same commit.
7. **Do not touch `src/app/(protected)/dashboard/page.tsx`’s stub status silently.** Reason: it is currently `return null` and only looks alive via the `LayoutWrapper` fallback. Either implement it properly or delete it explicitly — never leave a new stub without flagging it in the PR.

## Coding conventions (observed, not invented — follow them)

- **Client auth:** `'use client'` components read `import { usePrivySafe as usePrivy } from '@/components/auth/PrivySafeProvider'` (see `ChatArea.tsx:4`, `QuizContainer.tsx:4`, `MaterialsContext.tsx:4`, `useUser.ts:3`). Gate with `ready` → `Spinner`, `!authenticated` → `router.push('/login')`, 401 from API → `logout()` + redirect. Bearer header is always `` `Bearer ${await getAccessToken()}` ``.
- **Route validation:** every mutating API route starts with `verifyPrivyToken(req.headers.get('Authorization'))` then `SomeSchema.safeParse(await req.json())` from `src/lib/validators.ts`, returning the first zod issue as 400. Form-data routes (`POST /api/materials`) validate type/extension/size inline (50 MB, pdf/png/jpg/jpeg/gif).
- **Response shapes:** success is `{ success: true, data?: …, quizId?/resultId?/reply?/txHash? }`; failure is `{ error: string }` (see `submissions/route.ts:202-208`, `claim/route.ts:146-149`, `quizzes/route.ts:133-137`). Status codes in this codebase: `400` validation/ownership-input, `401` missing-or-invalid Privy JWT (`isAuthErrorMessage` maps exactly `Missing or invalid Authorization header` / `Invalid or expired token`), `404` not-found-or-not-yours (deliberately merged to avoid oracle), `410` the deprecated quiz-submit stub, `500` genuine server failure, `503` “not configured yet” (Gemini/Solana guards).
- **Components:** default-exported function components, `Props` interface above, Tailwind dark tokens (`bg-[#0D0D0D]`, `bg-[#1A1A1A]`, `border-[#2A2A2A]`, `text-[#F5F5F7]`/`#A0A0A0`, accent `#00C896`), shared primitives from `src/components/ui/` (`Button variant primary|secondary size small|medium|large`, `Card`, `Spinner size small|medium|large`, `Toast`, `Modal`). Icons are inline SVGs. `console.error/warn` for server-side observability is the norm (56 sites) — keep them, don’t convert to a logger without discussion. Do NOT add new `alert()`/`confirm()` calls (legacy in `QuizContainer`, `Sidebar`, `settings/page.tsx` — use `Toast`/`Modal` instead).
- **Naming:** files `PascalCase.tsx` for components, `route.ts` for handlers, `camelCase` locals, `snake_case` DB columns mapped explicitly (`phantom_wallet` ↔ `phantomWallet` in `profile/route.ts:49-56`). Path alias `@/* → ./src/*` (`tsconfig.json`).

## How to add a new feature safely

Adding a new Studio panel output type (e.g. Flashcards):

1. Add the tile to `studioOutputs` in `src/components/dashboard/StudioPanel.tsx` and route its click to either the existing `POST /api/quizzes` pattern or a new `POST /api/<thing>` handler that mirrors `quizzes/route.ts` (verify → `safeParse` → ownership select → Gemini call with 503 guard → inserts → `{ success: true, … }`).
2. Add the zod schema to `src/lib/validators.ts` and reuse it in both client pre-check and server `safeParse`.
3. Keep token-gated side effects (if any) in the `token_distributions`-style pending→confirmed/failed pattern, never inline in the scoring insert.
4. Update `README.md` route map + status lists and `docs/ARCHITECTURE.md` flows in the same PR.

Adding a new API route:

1. Copy `src/app/api/health/route.ts` (public) or `src/app/api/profile/route.ts` (authenticated minimal) as the skeleton — never `quizzes/[id]/route.ts`’s 410 stub.
2. `verifyPrivyToken` → `privy_id → users.id` → scoped queries with `.eq('user_id', dbUser.id)` / `.is('deleted_at', null)` where applicable.
3. Return the shared `{ success }` / `{ error }` shapes and the status-code meanings above; add the 503-configured guard if you touch Gemini/Solana.
4. Register the client call with `getAccessToken()` Bearer + 401→logout→`/login`, and document the endpoint in `README.md`.

## Verification protocol (must pass before any PR)

1. `npx tsc --noEmit` — must exit 0 with no output (strict mode).
2. `pnpm build` — must pass clean. Known-good dev output includes only the benign `ox/.../virtualMasterPool.js — Critical dependency` warnings via `PrivyProvider.tsx`; any new warning is a regression until proven otherwise. NOTE (2026-09-14): production build currently crashes at “Collecting page data” (`worker exited 3221225794`) — do not claim “build passes” until that is resolved; report your `pnpm build` log verbatim.
3. `pnpm dev` smoke per touched route: `/`, `/login`, `/signup`, `/dashboard`, `/chat`, `/settings`, `/quiz/<seededId>`, plus `GET /api/health` → `{"status":"ok"}` and one authenticated `curl` per touched API with both missing-token (expect 401) and placeholder-token (expect 401, never 500) cases.
4. `grep -rn "from ['\"]@privy-io/react-auth['\"]" src` — must return only the comment in `PrivySafeProvider.tsx:17`.
5. `git status --short` — docs (`.md`, `.env.example`) only unless the PR explicitly owns code changes; never commit `.env.local`, `node_modules`, `.next`, or `*.tsbuildinfo`.

## If you’re an AI coding agent working on this repo

- Read `README.md`, this file, and `docs/ARCHITECTURE.md` fully before touching anything. Re-verify every file path and env var you cite — paths here were checked 2026-09-14 and code may have moved since.
- Reproduce the relevant audit grep before claiming a pattern holds (`process.env.*`, Privy imports, `submit`, dangling imports of deleted files).
- Prefer the smallest diff that fixes the reported issue; do not “modernize” unrelated files, rename the `saveme` package, or migrate the package manager.
- Documentation accuracy beats consistency with old reports: if you find a route documented as working that isn’t (e.g. the `dashboard/page.tsx` stub), say so in the PR instead of preserving the old claim.
- Never print secret values in logs, diffs, or docs. Redact tokens, keys, and wallet seeds.

## Git workflow

Solo project pushing to `https://github.com/sidneycodes1/Examonchain.git` (`main`, remote `origin`) for the first time — the entire repair currently sits uncommitted on disk (`git status` 41 paths, `origin/main..HEAD` empty). Going forward:

- Branch: small `feat/<slug>` / `fix/<slug>` / `docs/<slug>` branches off `main`; PRs back to `main` even when solo, so the 410-stub, env, and RLS decisions stay reviewable.
- Commits: continue the existing conventional style observed in `git log` (`feat: …`, `fix: …`, `chore: …` — e.g. `fix: resolve duplicate UI panels, jwks path, and pdf-parse import`). One logical change per commit; docs-only commits as `docs: …`.
- First push after this docs pass should be a single `docs:` commit (README + CONTRIBUTING + ARCHITECTURE + `.env.example`) on top of a separate repair commit — do not squash the repair and docs together, or the 41-file audit trail is lost.
- Owner preference on license, branch protection, and release tagging is currently unspecified — confirm with Sidney before accepting external PRs or cutting a release.
