---
phase: 10
title: Data Migration — OPTIONAL, easy tables only
status: skipped
effort: M (4-6 days) — skip entirely is also valid
blocks: []
depends_on: [02, 03, 09]
note: Fresh-start path chosen for v1.0 launch — empty DB, admin CRUD via Phase 06. Old project preserved read-only for 30 days. This phase's scripts are not run; document retained as reference for any future partial-import need.
---

# Phase 10 — Data Migration (OPTIONAL)

## Context Links
- [Data migration audit](research/researcher-data-migration-audit.md) — full schema map (this phase migrates a subset).
- [Phase 02 — `shared.app_grants`](phase-02-auth-and-rls-foundation.md)
- [Phase 03 — schema target](phase-03-data-model.md)
- [Phase 09 — launch checklist (cutover gate)](phase-09-polish-and-launch.md)
- Upstream source-of-truth: `/config/workspace/minhtrungus/tournament-app/supabase/migrations/`.

## Overview
**Priority:** P3 (optional).
**Status:** pending.
**This entire phase is optional.** Fresh-start path is fully supported: admin can CRUD everything from scratch via [Phase 06](phase-06-admin-dashboard.md), users sign up fresh, no legacy data needed. Run this phase only if preserving historical accounts + athlete profiles + tournament/event metadata is desired; otherwise skip the entire phase and launch with an empty database.

When run: migrate only "easy" tables. Per-user data keyed by email (old `auth.users.email`); global/admin data bulk-copied wholesale. Old project stays read-only for 30 days as historical archive — users can still view skipped data (matches, scores, payments, photos) there.

## Fresh-Start Alternative (default if this phase skipped)
- Launch new project with empty DB. Admin uses [Phase 06](phase-06-admin-dashboard.md) UI to create tournaments, events, sponsors, courts, etc. from scratch.
- Users sign up fresh (new accounts, new athlete profiles, new registrations).
- Old project preserved read-only for 30 days so users can reference past data manually.
- Pre-launch Zalo announcement explains the fresh-start model.
- Zero scripts to run, zero migration risk. The remainder of this document applies only if migration is chosen.

## What IS Migrated (easy)

| Table | Strategy | Why easy |
|---|---|---|
| `auth.users` | per-email; Admin API `createUser` w/ preserved UUID | Admin API handles this directly |
| `shared.app_grants` | per migrated user; default role `athlete` (or from old `users.role` if present) | Composite PK + idempotent insert |
| `thethaomammo.athletes` | per migrated user (where `claim_user_id = old.user.id`) | Single table, FKs only to auth.users |
| `thethaomammo.tournaments` | bulk-copy all | Pure CRUD shape, no derived data |
| `thethaomammo.events` | bulk-copy all | FK only to tournaments |
| `thethaomammo.registrations` | per migrated user (where `user_id` matches); `payment_proof_url` nulled | Simple FK to event + athlete; status field carries final state |
| `thethaomammo.sponsors` | bulk-copy all | Small global table |
| `thethaomammo.age_categories` | bulk-copy all | Config-like, ≤ 20 rows |
| `thethaomammo.site_settings` | bulk-copy all | Single-row or k/v |
| `thethaomammo.courts` | bulk-copy all | Small per-venue config |
| `thethaomammo.tournament_breaks` | bulk-copy all | Small per-tournament config |

## What is NOT Migrated (hard — skipped, listed for user awareness)

| Skipped item | Why skipped | What user sees |
|---|---|---|
| `matches`, `match_scores`, `match_history` | Polymorphic FKs (`team1_id`/`team2_id`) need normalization to `match_participants` — non-trivial transform | Migrated tournaments show "Lịch sử trận đấu xem ở hệ thống cũ" link → old project read-only |
| `match_participants` | Derived table; old schema doesn't have it | Same as above |
| `teams` | Tightly coupled with matches; without match data, teams have no purpose | Doubles registrations show solo athletes only; admin re-creates teams for new tournaments |
| `payments`, `event_payments`, `registration_payments` | 3-way table consolidation needed; payment proof images depend on storage migration (also skipped) | Migrated registrations show `payment_status='unknown'`; admin reconciles manually for active tournaments |
| `notifications` | Transient data + risk of re-sending historical emails on import | Migrated users start with empty notification inbox |
| `gallery_photos` | FK to storage; without bytes transferred, links break | Galleries on migrated tournaments empty; admin re-uploads if wanted |
| `storage.objects` + bucket bytes (payment-proofs, gallery, tournament-assets) | Byte-level transfer cost + signed URL signing keys differ between projects | Old image URLs left intact for read-only viewing on old project; new project starts empty |
| OAuth refresh tokens | Provider tokens don't survive cross-project transfer | Google-sign-in users re-link Google on first new-project login |
| Clubs normalization (`athletes.club_name TEXT` → new `clubs` table dedup) | Dedup logic + back-reference rewrite | New schema keeps `athletes.club_name TEXT` field; `club_id` nullable; admin/users can normalize over time |
| RLS policies | Old schema has 6+ rewrites; rebuilt fresh in Phase 02 | N/A — internal |

## Key Insights
- **Email is the join key.** Old + new `auth.users.email` is the only stable identifier across projects.
- **Preserve UUIDs.** All migrated rows keep their old IDs → no FK remap needed.
- **Password hashes skipped.** Forced password reset via Supabase recovery email; OAuth users re-link on first login.
- **Two-pass model.** Pass 1: bulk-copy global tables (tournaments, events, sponsors, config). Pass 2: per-user filter (auth.users → athletes → registrations → app_grants).
- **Migrated tournaments flagged.** New column `is_legacy bool default false` on `tournaments` — set `true` for imports. UI uses this to hide "Live" / "Print bracket" actions on legacy tournaments.
- **Re-runnable.** Every loader uses `ON CONFLICT (id) DO NOTHING` (data tables) or Admin API upsert (auth).

## Requirements

### Functional
- Bulk-copy global tables (tournaments, events, sponsors, age_categories, site_settings, courts, tournament_breaks) with `ON CONFLICT (id) DO NOTHING`.
- Set `is_legacy=true` on all imported tournaments.
- Migrate `auth.users` per email via Admin API, preserving UUIDs and triggering recovery email.
- Migrate each user's athletes + registrations.
- Backfill `shared.app_grants(user_id, 'thethaomammo', role)`.
- Skip soft-deleted rows everywhere (`deleted_at is not null`).
- Null out `payment_proof_url` and any avatar URL columns at import (storage not migrated).
- Output `migration-report.json` per-table counts + per-email status (created / skipped / failed).

### Non-Functional
- Wall-clock < 20 min for ≤ 5k users + typical tournament count.
- Idempotent: re-run is safe; uses `ON CONFLICT` everywhere.
- Zero PII in stdout logs (emails masked); full data only in gitignored `migration-report.json`.
- Service-role keys in `.env.migration`, never committed.

## Architecture

```
OLD PROD                                NEW PROD
┌──────────────────────┐                ┌────────────────────────────┐
│ auth.users           │                │ auth.users (created)       │
│ thethaomammo.* (old) │                │ thethaomammo.* (target)    │
│   tournaments         │  PASS 1       │ shared.app_grants          │
│   events              │  bulk copy ─▶ │                            │
│   sponsors            │  (no email)   │                            │
│   age_categories      │               │                            │
│   site_settings       │               │                            │
│   courts              │               │                            │
│   tournament_breaks   │               │                            │
│                       │               │                            │
│   athletes            │  PASS 2       │                            │
│   registrations       │  per email ─▶ │                            │
└──────────────────────┘                └────────────────────────────┘

Skipped: matches, match_scores, teams, payments*, notifications,
         gallery_photos, storage objects, OAuth tokens, clubs dedup.
```

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `scripts/migration/run.ts` | orchestrator (`pnpm migrate`) |
| `scripts/migration/lib/old-client.ts` | service-role client → old project |
| `scripts/migration/lib/new-client.ts` | service-role client → new project |
| `scripts/migration/lib/mask.ts` | email masking for logs |
| `scripts/migration/pass1-global/index.ts` | bulk-copy global tables |
| `scripts/migration/pass1-global/tournaments.ts` | + sets `is_legacy=true` |
| `scripts/migration/pass1-global/events.ts` | |
| `scripts/migration/pass1-global/sponsors.ts` | |
| `scripts/migration/pass1-global/config.ts` | age_categories + site_settings + courts + tournament_breaks |
| `scripts/migration/pass2-users/index.ts` | per-email user loop |
| `scripts/migration/pass2-users/auth-user.ts` | Admin API createUser |
| `scripts/migration/pass2-users/athletes.ts` | copy athletes for user |
| `scripts/migration/pass2-users/registrations.ts` | copy registrations; null proof_url |
| `scripts/migration/pass2-users/grants.ts` | insert shared.app_grants |
| `scripts/migration/report.ts` | builds migration-report.json |
| `scripts/migration/README.md` | runbook |
| `.env.migration.example` | env keys (committed) |

### Env vars (`.env.migration`, gitignored)
```
OLD_SUPABASE_URL=https://<old>.supabase.co
OLD_SERVICE_ROLE_KEY=...
NEW_SUPABASE_URL=https://<new>.supabase.co
NEW_SERVICE_ROLE_KEY=...
DRY_RUN=true|false
SEND_RECOVERY_EMAILS=true|false   # default false; gate operator action
```

## Implementation Steps

1. **Pre-flight** (`run.ts`):
   - Validate envs; ping both projects.
   - Confirm new schema applied (Phase 02 + 03).
   - Print plan: pass-1 table counts (old) → expected inserts; require `y` if not `DRY_RUN`.
2. **Pass 1 — bulk-copy global tables** (order matters for FKs):
   - `sponsors`, `age_categories`, `site_settings`, `tournament_breaks` (no inter-FKs) — copy in parallel.
   - `tournaments` — copy; set `is_legacy = true` on every row.
   - `events` — copy; FK to tournaments.
   - `courts` — copy; FK to tournaments.
   - All use `INSERT ... ON CONFLICT (id) DO NOTHING`.
   - Skip rows with `deleted_at is not null`.
3. **Pass 2 — per-user loop**:
   - List old `auth.users` via Admin API (paginate, perPage=200).
   - For each old user:
     - `createUser({ id, email, email_confirm: true, password: <random>, user_metadata: old.raw_user_meta_data })`.
     - Copy athletes (`where claim_user_id = $old_id and deleted_at is null`), `ON CONFLICT (id) DO NOTHING`. Null avatar URL columns. Set `club_id = NULL`; keep `club_name TEXT`.
     - Copy registrations (`where user_id = $old_id and deleted_at is null`), `ON CONFLICT (id) DO NOTHING`. Null `payment_proof_url`. Preserve `payment_status` enum as-is (or set `unknown` if old enum doesn't map cleanly).
     - Insert `shared.app_grants(user_id=$old_id, app_slug='thethaomammo', role)`. Role = old `public.users.role` if exists, else `athlete`.
     - Record outcome in report.
4. **Recovery email batch** (gated on `SEND_RECOVERY_EMAILS=true`):
   - For all users created in this run, generate recovery link via Admin API and send via Supabase Auth SMTP.
   - Throttle to respect Gmail SMTP daily cap.
5. **Report** (`report.ts`):
   - Write `scripts/migration/.runs/<timestamp>.json` (gitignored).
   - Stdout summary: per-table counts, migrated/skipped/failed users, total elapsed.
6. **Spot verification** (manual, ≤ 15 min):
   - Pick 3 old users (admin, club_manager, athlete). Confirm login + RLS sees their athletes + registrations + can view legacy tournaments.
   - Confirm legacy tournament page shows "Historical bracket on old site" notice.
7. **Cutover** (Phase 09 launch flow):
   - Old project set read-only (or paused).
   - Announce in Zalo: "Đăng nhập lại bằng email cũ; bấm 'Quên mật khẩu' để đặt mật khẩu mới. Dữ liệu trận đấu cũ vẫn xem được trên hệ thống cũ trong 30 ngày."

## Todo List
- [ ] `.env.migration.example` committed; `.env.migration` gitignored
- [ ] Pass-1 global table copy works on staging (counts match)
- [ ] `is_legacy` flag set on every imported tournament
- [ ] Pass-2 `createUser` w/ preserved id works
- [ ] Athletes + registrations copied with proof/avatar URLs nulled
- [ ] Grants backfill defaults to `athlete` when old role absent
- [ ] DRY_RUN mode prints intended ops without writes
- [ ] Staging run produces clean `migration-report.json`
- [ ] Recovery email batch verified on 3 test inboxes
- [ ] 3 manual login + RLS spot-checks green
- [ ] Legacy-tournament UI banner renders + hides Live/Print actions
- [ ] Cutover (old project read-only) executed

## Success Criteria
- All non-deleted rows in `tournaments / events / sponsors / age_categories / site_settings / courts / tournament_breaks` present in new schema.
- Every old user with non-null email has matching new `auth.users` row (same UUID).
- Each migrated user has their non-deleted athletes + registrations.
- Each migrated user has at least one `shared.app_grants` row for `app_slug='thethaomammo'`.
- 3 random users log in (post password reset) and see their data; legacy tournaments visibly flagged.
- `migration-report.json` shows `failures: 0` (or documented exceptions).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Old `registrations.payment_status` enum doesn't map | M | M | Add `unknown` to new enum; default to it on mismatch; admin reconciles for active tournaments |
| User confusion: "where are my old matches/payments?" | H | L | Pre-launch Zalo announcement explicitly lists what's migrated vs read-only on old site |
| Email collision with manual signups on new project | L | M | Lock signups on new project until migration done (`SIGNUPS_ENABLED=false` env) |
| Recovery email floods Gmail SMTP daily cap | M | M | Gate `SEND_RECOVERY_EMAILS`; batch throttle |
| Old `users.role` location varies | M | L | Default to `athlete`; admins re-granted manually post-cutover via SQL one-liner |
| RLS lockout post-cutover | L | H | Spot-check 3 sample users pre-announcement |
| `is_legacy` flag not respected by UI | M | M | Phase 06/07 acceptance tests must cover legacy-tournament rendering |
| Service-role key in shell history | M | H | Source from `.env.migration`; rotate post-migration |
| Avatar/proof URLs pointing at old bucket persisted in DB | L | L | Migration explicitly nulls these columns at import |

## Security
- `OLD_SERVICE_ROLE_KEY` + `NEW_SERVICE_ROLE_KEY` in `.env.migration` (gitignored).
- Run from workstation, not CI (CI for staging dry-runs only).
- Rotate both service-role keys post-migration.
- Logs: counts + UUIDs + masked emails only.
- Old project read-only for 30 days; do not delete sooner.

## Rollback
- New `auth.users`: `delete from auth.users where created_at >= '<run_start_ts>' and email in (<imported emails>)`.
- New `thethaomammo.athletes / registrations`: delete by imported IDs.
- New `thethaomammo.tournaments / events / sponsors / age_categories / site_settings / courts / tournament_breaks`: `truncate ... cascade` (pre-launch, no real data above the import).
- `shared.app_grants`: delete by `user_id` in imported set + `app_slug='thethaomammo'`.
- Old project untouched throughout.

## Test Matrix
- Unit: email-mask helper; role-default helper; legacy-flag helper.
- Integration: staging dry-run against old-prod snapshot → assert counts per table.
- Manual: 3 test users log in post-migration + view legacy tournament + new registration flow works.

## Next Steps
- Run migration in pre-cutover window (Phase 09 § cutover checklist).
- Zalo announcement template lists migrated tables vs skipped ones for user transparency.
- Old project retained read-only 30 days.

## Unresolved Questions
- **Old `public.users.role`** — confirm column exists or not. If absent: all default to `athlete`; admins re-granted via SQL one-liner post-cutover (need list of admin emails from operator).
- **Avatar URL columns on athletes** — confirm presence + null them at import (current default).
- **`registrations.payment_status` enum mapping** — old values vs new enum: confirm 1:1 or add `unknown` to new enum.
- **`is_legacy` UI behavior** — Phase 06/07 to decide exact banner copy + which actions hide.
- **Signup lock during migration** — confirm `SIGNUPS_ENABLED=false` switch in Phase 01 env handling (or use Supabase dashboard toggle manually).
- **Old admins list** — operator-provided list of emails that need `role='admin'` post-migration.
