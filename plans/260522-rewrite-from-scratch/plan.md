---
title: "thethaomammo — Greenfield Rewrite"
description: "Rebuild Vietnamese badminton tournament app on locked Vercel + Supabase + Upstash stack with clean schema and DRY architecture."
status: pending
priority: P1
effort: ~10 phases (target 6-10 weeks single-dev)
branch: main
tags: [rewrite, greenfield, nextjs16, supabase, tournament]
created: 2026-05-22
---

# Rewrite Plan — thethaomammo

Greenfield rewrite. Reference repo is read-only. Distill 66 messy migrations → ~5 clean v1 migrations. Drop Drive + @base-ui/react + Resend + Sentry + R2. Adopt Gmail SMTP via edge fn, Upstash Redis (+optional QStash), multi-project Supabase with `thethaomammo` schema + shared `auth.*`/`shared.*` schema. **Data migration is optional** — fresh-start with admin CRUD (Phase 06) is fully supported and is the default; Phase 10 covers the partial-migration path if desired. Old project preserved read-only for 30 days regardless.

## Phases

| # | Phase | File | Effort | Status |
|---|---|---|---|---|
| 01 | Foundation (repo, env, Supabase shared, Vercel+Upstash) | [phase-01-foundation.md](phase-01-foundation.md) | M | pending |
| 02 | Auth + RLS foundation (Supabase Auth, app_grants, helpers) | [phase-02-auth-and-rls-foundation.md](phase-02-auth-and-rls-foundation.md) | M | pending |
| 03 | Data model (clean v1 schema for thethaomammo) | [phase-03-data-model.md](phase-03-data-model.md) | L | pending |
| 04 | Registration flow (RHF+zod, payment proof, dedup RPC) | [phase-04-registration-flow.md](phase-04-registration-flow.md) | L | pending |
| 05 | Bracket + scoring (generation, cascade, realtime) | [phase-05-bracket-and-scoring.md](phase-05-bracket-and-scoring.md) | L | pending |
| 06 | Admin dashboard (CRUD UIs) | [phase-06-admin-dashboard.md](phase-06-admin-dashboard.md) | L | pending |
| 07 | Public pages (list/detail/live/gallery/sponsors/print) | [phase-07-public-pages.md](phase-07-public-pages.md) | M | pending |
| 08 | Notifications + jobs (Gmail SMTP edge fn, QStash schedules) | [phase-08-notifications-and-jobs.md](phase-08-notifications-and-jobs.md) | M | pending |
| 09 | Polish + launch (SEO, perf, deploy checklist) | [phase-09-polish-and-launch.md](phase-09-polish-and-launch.md) | S | pending |
| 10 | Data migration (OPTIONAL — easy tables only; fresh-start path also supported) | [phase-10-data-migration.md](phase-10-data-migration.md) | M | optional |

## Highest-Risk Phases
1. **Phase 03** — schema design locks downstream.
2. **Phase 02** — RLS bugs = silent data leak across multi-project shared auth.
3. **Phase 05** — bracket cascade + realtime: many edge cases (third-place, byes, withdrawal).

## Cross-Phase Dependencies
- 02 blocks 03 (RLS helpers needed by tables)
- 03 blocks 04, 05, 06, 07
- 02 + Supabase Storage bucket setup blocks 04 (payment proof)
- 03 + 05 blocks 06.matches/brackets UIs
- 08 depends on 03 (notification table) + 04 (triggers)
- 10 is **OPTIONAL** — fresh-start path (empty DB + admin CRUD) is fully supported and is the default if migration is skipped. When run, depends on 02 + 03; pass 1 bulk-copies global config + tournaments/events, pass 2 per-email copies user-owned athletes + registrations. Hard tables (matches, payments, storage, etc.) always skipped — see Phase 10 § What is NOT Migrated.

## Out of Scope (MVP)
- Stripe/Payos payment gateway (QR-only display)
- Zalo OA API (deep-link only)
- i18n (Vietnamese only)
- Sentry / paid monitoring
- SMS / web push
- Anti-pause cron beyond Upstash-resident jobs

## Conventions
- File naming: kebab-case, ≤200 LOC per file
- Migrations: `NNN_domain_slug.sql` — no phase numbers in filenames
- Code comments explain invariants, not plan refs
- All RLS on by default; deny-by-default policies
- Schema: `thethaomammo.*` for app, `shared.*` for cross-app, `auth.*` Supabase-managed
