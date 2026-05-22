---
phase: 01
title: Foundation — repo, env, Supabase shared, Vercel+Upstash
status: pending
effort: M (3-5 days)
blocks: [02, 03, 04, 05, 06, 07, 08, 09]
---

# Phase 01 — Foundation

## Context Links
- [Stack proposal](research/brainstormer-final-stack-proposal.md)
- [Current state audit](research/researcher-current-state-audit.md)
- [Plan overview](plan.md)

## Overview
**Priority:** P1 (blocks every other phase)
**Status:** pending
Greenfield repo init: Next 16, pnpm, TypeScript, Tailwind v4. Supabase project with multi-project schema layout (`thethaomammo` + `shared`). Vercel Marketplace hookup for Supabase + Upstash. Env discipline + lint/test scaffolding.

## Key Insights
- Next.js 16 + React 19 + Tailwind v4 is bleeding edge — bundle docs in `node_modules/next/dist/docs/` are source of truth (see repo AGENTS.md).
- Vercel Marketplace integration auto-injects env vars (`SUPABASE_*`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KV_*`) → never hand-paste keys.
- Schema-per-app pattern: each Vercel project's Supabase belongs to *one shared Supabase project*; isolation via Postgres schema + RLS, not separate projects (free-tier 2-project cap).
- Pre-commit hook + CI lint cheap insurance against drift.

## Requirements

### Functional
- New repo (or clean overwrite of current `src/`, `supabase/`, configs) with Next 16 + Tailwind v4 baseline rendering Hello World.
- Single Supabase project hosts multiple apps via per-app schema (`thethaomammo`, future siblings) plus shared `auth.*` and `shared.*`.
- Vercel project linked, Supabase + Upstash integrations enabled via Marketplace.
- Local dev: `pnpm dev` + `pnpm supabase start` works; cloud env mirrors via `.env.local`.
- CI: `pnpm lint && pnpm test` green on push.

### Non-Functional
- Cold start `pnpm install` < 90s on warm pnpm store.
- Build time on Vercel < 3 min.
- Zero secret in git (verify with `gh secret list`).

## Architecture

```
Repo root
├── src/app/                 # App Router (Next 16)
├── src/components/          # shadcn primitives + app components
├── src/lib/                 # supabase clients, upstash client, utils
├── src/server/              # server actions, edge fns
├── supabase/migrations/     # 000001_…_shared_schema.sql, 000002_…
├── supabase/functions/      # edge functions (email, qstash receivers)
├── .env.example             # documents every env var
├── pnpm-workspace.yaml      # allowBuilds map (Node 24)
└── .github/workflows/ci.yml
```

Data flow this phase:
- Browser → Next 16 RSC → `src/lib/supabase/server.ts` (server client, cookies)
- Edge / Route handler → `src/lib/upstash/redis.ts` (REST client)
- Vercel build → reads env from Marketplace; CI reads from GitHub secrets

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `package.json` | Next 16, React 19, Tailwind v4, shadcn, RHF, zod, TanStack Query, Tiptap StarterKit, @upstash/redis, @supabase/ssr |
| `tsconfig.json` | strict, paths `@/*` → `src/*` |
| `next.config.ts` | minimal; `experimental.ppr` off until verified |
| `eslint.config.mjs` | next + typescript-eslint |
| `tailwind.config.ts` | v4 + shadcn tokens |
| `postcss.config.mjs` | `@tailwindcss/postcss` |
| `pnpm-workspace.yaml` | `allowBuilds: { sharp: true, '@tailwindcss/oxide': true }` |
| `.env.example` | all keys with `# from Vercel Marketplace` comments |
| `.gitignore` | node_modules, .env*, .next, .vercel |
| `vitest.config.ts` | jsdom, paths from tsconfig |
| `playwright.config.ts` | local + CI projects |
| `.github/workflows/ci.yml` | Node 24, pnpm 11, lint+test, frozen lockfile |
| `src/app/layout.tsx` | root layout, fonts, theme |
| `src/app/page.tsx` | Hello placeholder |
| `src/lib/supabase/server.ts` | RSC client factory |
| `src/lib/supabase/browser.ts` | client component factory |
| `src/lib/upstash/redis.ts` | `Redis.fromEnv()` |
| `supabase/config.toml` | local stack config |
| `supabase/migrations/000001_shared_schema.sql` | `CREATE SCHEMA shared` + grants |

## Implementation Steps
1. Init repo (or wipe `src/`, `supabase/migrations/`, regenerate package.json) — keep `.git`, `docs/`, `plans/`.
2. `pnpm create next-app@latest .` with TS + Tailwind v4 + App Router + ESLint; manually overwrite `package.json` deps to match locked stack.
3. Install: `shadcn`, `@supabase/ssr @supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form zod @hookform/resolvers`, `@tiptap/react @tiptap/starter-kit`, `@upstash/redis`, `lucide-react sonner next-themes`, `dompurify`.
4. `pnpm dlx shadcn init` — pick Tailwind v4 + Slate.
5. Scaffold `src/lib/supabase/{server,browser}.ts` per latest `@supabase/ssr` cookies API.
6. Create `src/lib/upstash/redis.ts` using `Redis.fromEnv()`.
7. Write `000001_shared_schema.sql` — creates `shared` schema, grants `usage` to `authenticated`/`anon`, placeholder comment for future shared tables.
8. Link Vercel project: `vercel link`. Enable Supabase + Upstash via Marketplace UI — confirm env vars injected.
9. Run `pnpm supabase start` locally; `pnpm supabase db push` no-op verifies wiring.
10. Add GH Actions workflow (Node 24, pnpm 11, `--frozen-lockfile`).
11. Smoke: deploy to Vercel preview; verify `/` renders and Supabase server client init runs without error.
12. Commit; tag `v0.1.0-foundation`.

## Todo List
- [ ] Repo scaffolding clean (Next 16 + Tailwind v4)
- [ ] shadcn initialized
- [ ] Supabase server + browser clients
- [ ] Upstash Redis client
- [ ] `000001_shared_schema.sql` applied
- [ ] Vercel project linked, Marketplace integrations enabled
- [ ] `.env.example` documents every key
- [ ] CI green
- [ ] Preview deploy renders
- [ ] `engines.node: ">=24"` in package.json
- [ ] `pnpm-workspace.yaml` allowBuilds set

## Success Criteria
- `pnpm dev` boots, `/` renders.
- `pnpm build && pnpm start` succeeds.
- Vercel preview deploys auto on push.
- Supabase + Upstash env vars present in Vercel project.
- `supabase db push` applies `000001` without error.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Next 16 + React 19 SSR mismatch w/ Tiptap | M | M | `immediatelyRender: false`; defer Tiptap to Phase 06; verify bundle docs |
| Tailwind v4 breaking class on shadcn | M | L | Use shadcn's v4 templates; smoke test |
| Vercel Marketplace env mismatch local vs prod | M | M | `.env.example` audited; document `vercel env pull` |
| Supabase free tier 2-project cap surprises | L | M | Single project + schema-per-app from day 1 |
| pnpm 11 build script blocked | M | L | `allowBuilds` map set upfront for sharp + oxide |

## Backwards Compatibility / Migration
Greenfield: no migration. Old repo remains under `.git` history; new branch starts here. Optional one-shot import script lives in `scripts/import-from-old-db.ts` post-MVP.

## Rollback
Revert to commit prior to phase-01 tag. No DB to restore — only local + preview.

## Test Matrix
- Unit: client factories (mock cookie store) — vitest
- Integration: none this phase
- E2E: smoke Playwright `/` renders title — optional

## Security
- No secrets in repo; `.env.local` gitignored.
- Supabase service role key server-only (`SUPABASE_SERVICE_ROLE_KEY` never in `NEXT_PUBLIC_*`).
- `gh secret set` for CI; never echo secrets in workflow logs.

## Next Steps
Phase 02 — Auth + RLS foundation. Phase 03 — schema design.

## Unresolved Questions
- Use existing `.git` history or fresh init? (Assumed: keep history, overwrite tree.)
- License? (Memory says Apache-2.0 default — adopt unless user objects.)
- Public or private GH repo? (Affects CI minutes — public preferred.)
