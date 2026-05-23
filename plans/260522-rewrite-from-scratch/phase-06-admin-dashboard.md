---
phase: 06
title: Admin Dashboard — CRUD UIs for all resources
status: in_progress
effort: L (7-10 days)
blocks: [07, 09]
depends_on: [02, 03, 04, 05]
---

# Phase 06 — Admin Dashboard

## Context Links
- [Audit § Admin Dashboards](research/researcher-current-state-audit.md)
- [Phase 03 schema](phase-03-data-model.md)
- [Phase 05 bracket/scoring](phase-05-bracket-and-scoring.md)

## Overview
**Priority:** P2
**Status:** pending
Admin UI for every resource. shadcn DataTable + RHF + zod + server actions. CSV import/export for athletes/registrations. Payment verification queue. Bracket+scoring integration. Sponsors + gallery. Notifications dashboard. Role-aware (admin sees all; club_manager scoped).

## Key Insights
- Current admin sprawls across 15+ pages — DRY by extracting a generic CRUD scaffold.
- Most resources share shape: list → filter → create → edit → soft-delete.
- Payment verification is the heaviest UX — needs side-by-side proof preview + verify/reject.
- CSV import is bug-prone — provide template + dry-run preview.

## Requirements

### Functional
- `/admin` dashboard landing: KPIs (registrations today, pending payments, matches in progress).
- Resources: tournaments, events, athletes, clubs, registrations, payments, matches, courts, schedule, sponsors, gallery, notifications, users (grants).
- Generic resource page: list (search, filter, sort, paginate) + drawer/dialog form for create/edit + delete confirm.
- Tournament settings page: name, dates, venue, payment QR upload, rules (Tiptap), prize structure, payment info text, Zalo group URL.
- Payment verification page: queue of `payment_status='pending'`, image viewer, verify/reject buttons.
- CSV import (athletes, registrations): upload → preview → confirm.
- CSV export (any resource): server action streams CSV.
- Bracket page per event: regenerate, view, scoring shortcuts.
- Live scoring shortcut from any in-progress match.
- Role gates: only `admin` sees grants page; club_manager sees own club only.

### Non-Functional
- Every list paginated (50/page default).
- Server actions return typed results (Result<T, E>).
- Optimistic UI on mutations via TanStack Query.

## Architecture

```
src/app/admin/layout.tsx                 ← shell, sidebar, auth guard
src/app/admin/page.tsx                   ← KPIs (RSC, no realtime)
src/app/admin/tournaments/page.tsx       ← list
src/app/admin/tournaments/new/page.tsx   ← create
src/app/admin/tournaments/[id]/page.tsx  ← detail tabs (settings, events, sponsors, gallery, brackets)
src/app/admin/payments/page.tsx          ← verification queue
src/app/admin/users/page.tsx             ← grants management
…

Generic scaffold:
src/components/admin/resource-table.tsx  ← shadcn Table + TanStack Table
src/components/admin/resource-form.tsx   ← generic RHF wrapper

Server actions per resource:
src/server/admin/tournaments.ts          ← createTournament, updateTournament, archiveTournament
src/server/admin/payments.ts             ← verifyPayment, rejectPayment
…
```

## Related Code Files (to create — abridged; see structure above)

| Path | Purpose |
|---|---|
| `src/app/admin/layout.tsx` | auth guard, sidebar |
| `src/app/admin/page.tsx` | KPIs |
| `src/app/admin/tournaments/...` | CRUD + nested tabs |
| `src/app/admin/events/...` | CRUD scoped per tournament |
| `src/app/admin/athletes/...` | list + CSV import/export |
| `src/app/admin/clubs/...` | CRUD |
| `src/app/admin/registrations/...` | list, filter, manual create |
| `src/app/admin/payments/...` | verification queue |
| `src/app/admin/matches/...` | list, scoring shortcut |
| `src/app/admin/courts/...` | CRUD |
| `src/app/admin/schedule/...` | breaks, schedule planner |
| `src/app/admin/sponsors/...` | CRUD |
| `src/app/admin/gallery/...` | upload, list |
| `src/app/admin/notifications/...` | view |
| `src/app/admin/users/...` | grants (admin-only) |
| `src/components/admin/sidebar.tsx` | nav |
| `src/components/admin/resource-table.tsx` | generic table |
| `src/components/admin/resource-form.tsx` | generic form |
| `src/components/admin/tiptap-editor.tsx` | rules editor (StarterKit only) |
| `src/components/admin/csv-import-dialog.tsx` | upload + preview |
| `src/server/admin/<resource>.ts` | per-resource actions |
| `src/lib/csv/parse.ts` | CSV parser (no deps if simple, or `papaparse`) |
| `tests/e2e/admin-*.spec.ts` | Playwright per major flow |

## Implementation Steps
1. Build `src/app/admin/layout.tsx` — checks `shared.has_role('thethaomammo','admin')` or `club_manager`; else 403.
2. Build sidebar with grouped nav.
3. Build generic `resource-table.tsx` (TanStack Table v8) + `resource-form.tsx` wrapper.
4. Tournament settings tabs: General | Events | Sponsors | Gallery | Brackets.
   - General: form w/ Tiptap rules editor (StarterKit only; sanitize via DOMPurify on save).
   - Events: nested CRUD.
   - Brackets: links to Phase 05 bracket pages.
5. Athletes list: search by name/display_id, filter by club, soft-delete toggle.
6. Athletes CSV import: upload → parse → preview (10 rows) → "Confirm import" → bulk insert via RPC `bulk_create_athletes(payload jsonb[])`.
7. Athletes CSV export: server action streams CSV with `Content-Type: text/csv`.
8. Registrations: filter by event/status; manual create form re-uses Phase 04 schema.
9. Payments verification:
   - Queue: `payment_status='pending'`.
   - Detail: side-by-side image + form (amount, note, verify/reject).
   - On verify: update `payment_status='paid'`, insert `registration_payments.verified_by = auth.uid()`, set `registrations.status='confirmed'`.
   - On reject: `payment_status='rejected'`, insert notification.
10. Courts CRUD; schedule planner = drag-drop list (simple: edit `matches.scheduled_at` + `court_id`).
11. Sponsors: tier dropdown (gold/silver/bronze/partner), logo upload to `tournament-assets` bucket.
12. Gallery: multi-upload to `gallery` bucket, list w/ thumbs.
13. Notifications dashboard: list w/ filter by type; mark all read.
14. Users grants page (admin-only): list users w/ their grants for this app; assign role / scope_id.
15. KPIs queries on dashboard landing — cached 30s.

## Todo List
- [x] Admin layout + auth guard (slice 1: any-grant layout, isAdmin per-page)
- [ ] Generic resource-table + resource-form (deferred — risk note says build concrete first)
- [x] Tournament settings — General tab only (Events/Sponsors/Gallery/Brackets tabs pending)
- [x] Events CRUD nested under tournament (slice 2)
- [x] Athletes list + edit + soft-delete/restore (slice 3 — CSV import/export still pending)
- [x] Clubs CRUD (basic — no logo upload yet)
- [x] Registrations admin — list + filter (manual create still pending) (slice 3)
- [x] Payments verification queue (slice 2)
- [x] Matches list + scoring shortcuts (slice 3)
- [x] Courts CRUD (slice 3)
- [x] Schedule edit per match (slice 4 — drag-drop planner not in scope)
- [x] Sponsors CRUD + logo upload (slice 5 — bucket migration 000016)
- [x] Gallery multi-upload (slice 5)
- [x] Notifications dashboard (slice 4)
- [x] Users grants page (slice 4)
- [x] KPIs on landing (registrations today, pending payments, matches in progress)
- [ ] Role gates verified (club_manager scoped)
- [ ] Playwright per major flow

## Success Criteria
- Admin can fully CRUD every resource without SQL access.
- Club manager session sees only own club's data on athletes/registrations pages.
- Payment verification flow: pending → verify → registration confirmed (verified end-to-end).
- CSV import of 50 athletes succeeds; bad row surfaces error w/ line number.
- Tournament rules saved/loaded via Tiptap.
- All admin pages < 1.5s TTFB on Vercel preview.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Generic scaffold over-engineered → slow build | M | M | Build 2-3 concrete pages first, extract pattern after |
| RLS holes via service-role abuse in actions | M | H | Server actions use user-scoped client; service-role only for `bulk_create_athletes` w/ explicit role check inside action |
| CSV silent data loss | H | M | Dry-run preview mandatory; reject whole batch on any error |
| Tiptap XSS via paste | M | H | DOMPurify sanitize on save AND on render |
| Club_manager sees other clubs | M | H | RLS in Phase 03 enforces; add e2e test asserting 404 on cross-club URL |
| Payment image preview burns bandwidth | M | L | Use Supabase signed URL w/ resize transform |
| Concurrent edits clobber each other | M | M | Add `updated_at` optimistic concurrency on tournament/event forms |

## Backwards Compatibility / Migration
- Generic resource scaffold avoids hard-coupling — future resources easy to add.
- CSV format documented in `docs/csv-templates/` so users can prep files.
- **Fresh-start path (default):** admin uses this dashboard to CRUD every resource from scratch — no migration dependency. All success criteria below must pass starting from an empty DB.
- **If [Phase 10](phase-10-data-migration.md) (optional) runs:** imported tournaments + events arrive with `is_legacy=true`. Admin tournament list shows a "Legacy" badge for these; admin can edit metadata but bracket generation button is hidden and match/payment management is disabled (no migrated matches; old payment data lives read-only on old project).
- `admin_audit` log starts at cutover; pre-cutover history (if any) lives only on old project — do NOT backfill audit rows.

## Rollback
- Disable `/admin` routes (return 404) — public site continues.
- Per-resource: revert specific page file.

## Test Matrix
- Unit: CSV parser, KPI queries, role gate util.
- Integration: server actions with mock supabase client.
- E2E: per major flow (Tournament create → publish → registrations → verify payment → bracket → score → completed).

## Security
- Every admin action server-side checks `shared.has_role('thethaomammo','admin')` OR `club_manager` scoped.
- DOMPurify on Tiptap output before insert.
- Signed URLs for payment proof preview (10 min TTL); never embed direct storage URLs.
- Audit log table `thethaomammo.admin_audit(user_id, action, resource_id, before jsonb, after jsonb, at)` — write on every mutation (helper wraps actions).

## Next Steps
Phase 07 public pages. Phase 08 notifications wire-up.

## Unresolved Questions
- Schedule planner depth: drag-drop calendar or simple form? (Default: form per match for MVP.)
- Multi-club admin (admin manages multiple clubs)? (Default: admin sees all; club_manager scoped.)
- Audit log retention? (Default: forever — small data.)
- Bulk import via CSV beyond athletes (registrations, sponsors)? (Default: athletes only MVP.)
