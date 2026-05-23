# Codebase Summary

Tournament management app — Next.js 16 (App Router) + Supabase (Postgres + Auth + Storage + Edge Functions) + Upstash (Redis + QStash). Free-tier focused.

## Top-level layout

```
src/
├── app/                       Next.js App Router routes
│   ├── (auth)/                login, signup, reset-password
│   ├── admin/                 admin dashboards (auth-guarded)
│   ├── athlete/[id]/          public athlete profile
│   ├── club/[slug]/           public club info
│   ├── gallery/[tournamentId] tournament gallery
│   ├── giai/[slug]/           public tournament detail + dang-ky
│   ├── live/                  realtime scoring views
│   ├── print/                 printable views (athlete, bracket, record)
│   ├── api/health/            uptime probe
│   ├── manifest.ts            PWA manifest
│   ├── robots.ts              robots.txt (blocks admin + print)
│   ├── sitemap.ts             dynamic sitemap
│   ├── error.tsx, not-found.tsx
│   └── layout.tsx, page.tsx
├── components/
│   ├── admin/                 admin UI shells (sidebar, table, form helpers)
│   ├── auth/, registration/, live/, public/, print/
│   └── ui/                    shadcn primitives
├── lib/
│   ├── auth/grants.ts         isAdmin / role helpers (shared.has_role)
│   ├── format/date-range.ts
│   ├── notifications/         email templates + escape
│   ├── sanitize/rules-html.ts DOMPurify wrapper
│   ├── storage/public-asset-url.ts
│   └── supabase/{server,browser}.ts
└── server/
    ├── admin/                 server actions per resource
    └── notifications/produce.ts enqueueNotification helper

supabase/
├── migrations/                ~18 numbered SQL files (clean v1 schema)
└── functions/
    ├── dispatch-notifications/ Gmail SMTP dequeue (5-min cron)
    ├── enqueue-reminders/     payment + match reminders (daily)
    └── _shared/               templates, smtp, qstash-verify

tests/
├── e2e/                       Playwright local
└── smoke/                     post-deploy smoke (5 routes)
```

## Key modules

| Concern | Module |
|---|---|
| Auth + role gates | `src/lib/auth/grants.ts`, `shared.has_role(app,role)` RPC |
| RLS helpers | migration `000003_shared_rls.sql` + `000008_thethaomammo_rls.sql` |
| Public reads | views `v_*_public` (security_invoker, strip PII) |
| Registration | server action `src/app/giai/[slug]/dang-ky/actions.ts` + `register_athlete` RPC |
| Bracket gen | `src/server/admin/bracket-actions.ts` + `generate_bracket` RPC |
| Match cascade | trigger in `000014_match_cascade.sql` |
| Notifications | `enqueueNotification` (DB insert) → edge fn dispatch (SMTP) |
| Realtime | `v_matches_live` + supabase channels (`live-matches.tsx`) |

## Conventions

- File naming: kebab-case TS/TSX; framework filenames (`page.tsx`, `not-found.tsx`, `route.ts`, etc.) follow Next.js conventions.
- ≤200 LOC per file; modularize when exceeded.
- Migrations: `NNN_domain_slug.sql` — no phase numbers in names.
- Server actions return `{ ok?: true; error?: string }`.
- Comments explain invariants and surprises only; no plan/phase refs.
- All public reads go through `v_*_public` views to strip PII.
