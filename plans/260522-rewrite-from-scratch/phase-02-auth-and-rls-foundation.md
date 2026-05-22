---
phase: 02
title: Auth + RLS Foundation — Supabase Auth, app_grants, RLS helpers
status: pending
effort: M (3-4 days)
blocks: [03, 04, 05, 06, 07]
depends_on: [01]
---

# Phase 02 — Auth + RLS Foundation

## Context Links
- [Current audit § Auth & Access](research/researcher-current-state-audit.md)
- [Stack proposal § 6 Auth](research/brainstormer-final-stack-proposal.md)

## Overview
**Priority:** P1
**Status:** pending
Wire Supabase Auth (email/password + Google OAuth). Define cross-app `shared.app_grants` (per-user role per app) so the same Supabase project safely hosts multiple apps. Build RLS helper functions + a tiny set of policies on `shared.*`. Defer table-level policies to Phase 03 alongside each table.

## Key Insights
- Current repo's RLS history (16+ migrations rewriting policies) = nightmare. Lock helper API early; never inline `auth.uid()` checks in app policies.
- `shared.app_grants(user_id, app_slug, role)` decouples auth from app schemas. Each app's RLS asks "does this user have role X in app Y?" via helper.
- Supabase Auth lives in `auth.*` (managed). Never write to `auth.users` directly — use Auth Admin API or trigger.
- Roles: `admin`, `club_manager`, `referee`, `athlete`. Map to current schema 1:1.

## Requirements

### Functional
- User signs up via email/password.
- User signs in via Google OAuth (provider configured in Supabase dashboard).
- Password reset flow works (Supabase magic link to reset).
- Session persists across page loads (cookies via `@supabase/ssr`).
- Server can read `shared.current_grants()` for the requesting user.
- Helpers: `shared.is_admin(app_slug text)`, `shared.has_role(app_slug text, role text)`, `shared.user_club_id(app_slug text)`.
- Admin can grant roles via SQL (UI in Phase 06).

### Non-Functional
- Helpers `STABLE` + `SECURITY DEFINER` where safe; no recursive RLS.
- Auth pages SSR'd — no flash of unauth content.

## Architecture

```
Browser  ──(login form)──▶  Server action  ──▶  Supabase Auth API
                                                       │
                                                       ▼
                                              auth.users (managed)
                                                       │
                              (trigger: handle_new_user) on user create
                                                       │
                                                       ▼
                                       shared.profiles (display name, etc.)
                                       shared.app_grants (role per app)

App query path:
RSC  ──▶  createServerClient (cookies)  ──▶  Postgres
            policy: USING (shared.has_role('thethaomammo','admin'))
```

`shared.app_grants` schema:
```sql
create table shared.app_grants (
  user_id uuid references auth.users(id) on delete cascade,
  app_slug text not null,
  role text not null check (role in ('admin','club_manager','referee','athlete')),
  scope_id uuid,           -- e.g. club_id for club_manager
  created_at timestamptz default now(),
  primary key (user_id, app_slug, role, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
```

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `supabase/migrations/000002_shared_auth.sql` | `shared.profiles`, `shared.app_grants`, helpers, trigger |
| `supabase/migrations/000003_shared_rls.sql` | RLS on `shared.*` |
| `src/app/(auth)/login/page.tsx` | login form |
| `src/app/(auth)/signup/page.tsx` | signup form |
| `src/app/(auth)/reset-password/page.tsx` | reset flow |
| `src/app/(auth)/callback/route.ts` | OAuth code exchange (Next 16 route handler) |
| `src/app/(auth)/logout/route.ts` | sign-out POST handler |
| `src/server/auth/actions.ts` | server actions: signIn, signUp, resetPassword |
| `src/lib/auth/grants.ts` | `getCurrentGrants()` server util |
| `src/middleware.ts` | Supabase session refresh (per `@supabase/ssr` docs) |
| `src/components/auth/login-form.tsx` | RHF + zod |
| `tests/unit/auth/grants.test.ts` | helper coverage |

## Implementation Steps
1. Migration `000002_shared_auth.sql`:
   - `create schema if not exists shared`
   - `shared.profiles (user_id pk, display_name, avatar_url, created_at)`
   - `shared.app_grants` (see schema above)
   - Trigger `handle_new_user()` → inserts `shared.profiles` on `auth.users` insert.
   - Helpers:
     - `shared.has_role(app text, role text) returns bool` — `select exists(... from shared.app_grants where user_id = auth.uid() and app_slug = app and role = role)`. `STABLE`.
     - `shared.is_admin(app text) returns bool` — calls `has_role(app, 'admin')`.
     - `shared.user_scope(app text, role text) returns uuid` — returns `scope_id` for first matching grant.
2. Migration `000003_shared_rls.sql`:
   - `alter table shared.profiles enable row level security`
   - profiles: select self OR same-app admin; update self only.
   - `alter table shared.app_grants enable row level security`
   - app_grants: select self OR app admin; insert/update/delete app admin only.
3. Configure Supabase dashboard: enable Email provider + Google OAuth, set redirect URI `https://<vercel>/auth/callback`.
4. Configure Supabase Auth SMTP → Gmail (Phase 08 may revisit). For now, use Supabase default SMTP for sign-up confirmations.
5. Build `src/middleware.ts` per `@supabase/ssr` v0.10 cookies API.
6. Build server actions in `src/server/auth/actions.ts` — RHF posts to server action, returns typed error.
7. Build login/signup/reset/callback routes + UI components.
8. Write helper `getCurrentGrants()` — RSC util returning `{role, scope_id}[]` for app `'thethaomammo'`.
9. Vitest: mock supabase client, assert helper returns expected shape.
10. Manual: sign up → confirm email arrives via Supabase default SMTP → log in → log out.

## Todo List
- [ ] `000002_shared_auth.sql` applied
- [ ] `000003_shared_rls.sql` applied
- [ ] Google OAuth configured in dashboard
- [ ] `middleware.ts` refreshes session
- [ ] Login/Signup/Reset pages work
- [ ] `handle_new_user` trigger seeds `shared.profiles`
- [ ] `getCurrentGrants()` returns correct grants
- [ ] Unit tests for helpers
- [ ] RLS smoke test: anon cannot read `shared.app_grants`

## Success Criteria
- Anon user CANNOT select from `shared.app_grants`.
- Authenticated user CAN select own grants only.
- Sign-up → trigger creates profile row → callback redirects → session cookie set.
- Google OAuth round-trip works in preview deploy.
- `shared.has_role('thethaomammo','admin')` returns expected bool.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Recursive RLS via helper calling helper | M | H | Helpers `STABLE`, do not query tables w/ RLS that re-checks via same helper; mark `SECURITY DEFINER` w/ `search_path = ''` |
| Trigger fires before profile row schema ready | L | M | `000002` ordering: create table THEN trigger |
| OAuth redirect URI mismatch | M | M | Document all redirect URIs in `.env.example` |
| Mixing service role + RLS in client code | M | H | `service_role` server-only; lint rule banning import in `'use client'` files |
| Multi-app collision in app_grants | L | M | Composite PK includes `app_slug`; grants table is the boundary |

## Backwards Compatibility / Migration
- [Phase 10](phase-10-data-migration.md) creates new `auth.users` rows via Admin API with **preserved old UUIDs** so existing FKs (`athletes.claim_user_id`) keep working without remap.
- `shared.app_grants` composite PK `(user_id, app_slug)` makes `INSERT ... ON CONFLICT DO NOTHING` safe → Phase 10 backfill is naturally idempotent.

## Rollback
- `drop schema shared cascade` then re-apply prior migration.
- Vercel revert deploy to phase-01 tag.

## Test Matrix
- Unit: helper return shapes (vitest, mocked supabase)
- Integration: spin local Supabase, run SQL: anon select on `app_grants` → 0 rows; auth select → own rows.
- E2E: Playwright login → see protected page.

## Security
- `auth.uid()` only inside `STABLE` helpers — never expose service_role to client.
- RLS deny-by-default; explicit grant per role.
- Password reset uses Supabase magic link (rate-limited by Supabase).
- Google OAuth: restrict to verified emails; reject `email_verified=false`.
- Audit: log every grant change (Phase 06 admin UI writes to `shared.audit_log`).

## Next Steps
Phase 03 — define `thethaomammo` schema, table-level RLS using `shared.has_role('thethaomammo', …)`.

## Unresolved Questions
- Do we want passwordless / magic link as fallback? (Stack proposal says password primary.)
- Should `referee` grants be tournament-scoped (`scope_id = tournament_id`) or global? Default global; revisit if needed.
- Audit log table now or Phase 06? (Default: Phase 06.)
