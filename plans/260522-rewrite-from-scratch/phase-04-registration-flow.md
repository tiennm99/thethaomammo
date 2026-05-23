---
phase: 04
title: Registration Flow — RHF+zod, payment proof, dedup RPC
status: complete
effort: L (5-6 days)
blocks: [06, 07, 08]
depends_on: [02, 03]
---

# Phase 04 — Registration Flow

## Context Links
- [Audit § Registration & Athletes](research/researcher-current-state-audit.md)
- [Stack § 10 Forms](research/brainstormer-final-stack-proposal.md)
- [Phase 03 schema](phase-03-data-model.md)

## Overview
**Priority:** P1
**Status:** pending
Public registration form (singles + doubles). React Hook Form + zod end-to-end. Atomic `register_athlete_transaction` RPC (athlete upsert + registration + team binding + payment record). Payment proof to Supabase Storage. Dedup via name+DOB+club. Email confirmation enqueued (Phase 08 sends).

## Key Insights
- Current `/dang-ky` and `/register` are duplicates — collapse to one route.
- Atomic RPC critical: partial state on failure leaves orphaned athletes (current code has bugs here).
- Doubles bundling: 2 athletes, 1 team, 1 payment for two registrations. Use `teams.payment_group_key` to bundle.
- Anon must be able to upload proof (current setup allows; preserve).
- Dedup: same name + same DOB + same club ⇒ same athlete. Surface "is this you?" claim UX.

## Requirements

### Functional
- Form per tournament/event at `/giai/[slug]/dang-ky`.
- Singles: 1 athlete form + payment proof.
- Doubles/Mixed: 2 athlete forms + 1 payment proof (1 group key).
- Anon submission works (no login required).
- Dedup: if athlete matches existing, prompt "claim" or "different person".
- Payment proof upload → Storage `payment-proofs/{tournament_id}/{registration_id}-{ts}.{ext}`.
- On success: registration row(s) created with `status='registered'`, `payment_status='pending'`.
- Notification row created (Phase 08 dispatches email).
- Validation client-side AND server-side via same zod schema.

### Non-Functional
- Form must be usable on mid-tier Android (Chrome, 3G).
- Upload progress visible.
- RPC < 2s end-to-end at p95.
- Failed RPC = zero side effects (transactional).

## Architecture

```
Browser (RHF + zod)
   │ submit
   ▼
Server Action  /giai/[slug]/register-action
   │
   ├─▶ Storage upload (signed URL or server-side put)
   │     bucket: payment-proofs (anon insert allowed via RLS)
   │
   └─▶ RPC thethaomammo.register_athlete_transaction(payload jsonb)
            │
            ├─ upsert athletes (dedup by name+dob+club_id)
            ├─ (doubles) insert teams
            ├─ insert registrations (1 or 2)
            ├─ insert registration_payments stub
            ├─ insert notifications row
            └─ return { registration_ids[], athlete_ids[], team_id? }
```

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `supabase/migrations/000011_register_rpc.sql` | `register_athlete_transaction(payload jsonb)` + dedup helper |
| `supabase/migrations/000012_storage_payment_proofs.sql` | bucket + RLS policy (anon insert, admin select) |
| `src/lib/schemas/registration.ts` | zod schema (singles + doubles variants, discriminated union) |
| `src/app/giai/[slug]/dang-ky/page.tsx` | RSC: load tournament + events |
| `src/app/giai/[slug]/dang-ky/registration-form.tsx` | client component, RHF |
| `src/app/giai/[slug]/dang-ky/actions.ts` | server action: upload + RPC |
| `src/components/registration/athlete-fields.tsx` | reusable athlete fieldset |
| `src/components/registration/payment-proof-uploader.tsx` | client uploader w/ progress |
| `src/components/registration/dedup-confirm-dialog.tsx` | claim/new dialog |
| `src/server/storage/payment-proof.ts` | upload helper |
| `tests/unit/schemas/registration.test.ts` | zod parse coverage |
| `tests/e2e/registration.spec.ts` | Playwright happy path |

## Implementation Steps
1. Migration `000011_register_rpc.sql`:
   - Helper `_thethaomammo_find_or_create_athlete(name, dob, club_id, gender) returns athletes`.
   - Main `register_athlete_transaction(payload jsonb) returns jsonb`:
     - parse payload (event_id, athletes[], payment_proof_path, group_key?).
     - call helper per athlete (dedup).
     - if doubles → insert teams w/ payment_group_key.
     - insert registrations w/ team_id if doubles.
     - check unique `(event_id, athlete_id) where deleted_at is null` — fail fast on dupe.
     - insert registration_payments stub (`amount_vnd` from `events.entry_fee_vnd`).
     - insert notifications row(s).
     - return jsonb with IDs.
   - `SECURITY DEFINER` + `search_path = thethaomammo, public`.
   - Grant `execute` to `anon` + `authenticated`.
2. Migration `000012_storage_payment_proofs.sql`:
   - `insert into storage.buckets … payment-proofs`
   - policies: anon `insert` allowed if `bucket_id = 'payment-proofs'`; `select` for admin only.
3. Zod schema in `src/lib/schemas/registration.ts`:
   ```ts
   const Athlete = z.object({ fullName: z.string().min(2), dob: z.string().date(), gender: z.enum(['male','female']), clubId: z.string().uuid().nullable(), zaloPhone: z.string().regex(/^0\d{9}$/) });
   const Registration = z.discriminatedUnion('kind', [
     z.object({ kind: z.literal('singles'), eventId: z.uuid(), athlete: Athlete, paymentProofPath: z.string() }),
     z.object({ kind: z.literal('doubles'), eventId: z.uuid(), athletes: z.tuple([Athlete, Athlete]), paymentProofPath: z.string() }),
   ]);
   ```
4. Server action:
   - Validate via zod (server-side authoritative).
   - Upload file via service-role client to Storage (skip RLS for atomicity, since proof must exist before RPC).
   - Actually: anon client uploads BEFORE submit (browser side), action receives `paymentProofPath`. Cleaner.
   - Call RPC with payload.
   - Return result or typed error.
5. Build form:
   - Step 1: pick event (singles vs doubles surfaces).
   - Step 2: athlete field(s) — debounced lookup hits a read-only RPC `lookup_athlete(name, dob, club_id)` returning candidates → show dedup dialog.
   - Step 3: payment proof uploader (drag-drop, image preview).
   - Step 4: review + submit.
6. Toast on success; redirect to `/giai/[slug]/dang-ky/thanks?id=…`.
7. Unit tests: zod accepts/rejects representative inputs.
8. E2E: full singles registration + full doubles registration.

## Todo List
- [ ] `000011` RPC + dedup helper applied
- [ ] `000012` Storage bucket + policies applied
- [ ] Zod schema covers singles + doubles
- [ ] Server action + browser upload path works anon
- [ ] Dedup dialog shows candidates
- [ ] Unique `(event_id, athlete_id)` violation surfaces friendly error
- [ ] Payment proof renders preview before submit
- [ ] Notification row created
- [ ] Thanks page renders with registration ID
- [ ] Playwright covers singles + doubles
- [ ] Vitest covers zod schema

## Success Criteria
- Anon submits singles registration end-to-end on preview deploy.
- Anon submits doubles registration; both registrations share `team_id` and `payment_group_key`.
- Duplicate (same event + athlete) registration → friendly error, no DB write.
- Failed RPC mid-way → DB unchanged (transactional verified by induced FK error test).
- Storage object exists at `payment-proofs/…` after submit.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Orphaned storage on failed RPC | M | L | Tolerate orphans (cheap); GC job later, not MVP |
| Dedup false-positive merges 2 real people | M | H | Confirm dialog mandatory before merge; "different person" creates new athlete w/ disambiguator |
| Anon abuse (spam registrations) | M | M | Rate-limit via Upstash Ratelimit on server action (e.g. 5/hour per IP) |
| Large image uploads bust Vercel fn body limit | M | M | Browser-side upload direct to Supabase Storage; server action receives path only |
| Race: 2 anon users register same athlete | L | M | Advisory lock in RPC keyed on hash(name+dob+club) |
| RPC `SECURITY DEFINER` bypasses RLS | H | H | Strict `search_path`; explicit `set role authenticated` near critical writes |

## Backwards Compatibility / Migration
- [Phase 10](phase-10-data-migration.md) imports athletes with their original IDs. `display_id` trigger has `WHEN (NEW.display_id IS NULL)` guard so imported athletes keep their old IDs; new athletes get freshly generated ones.
- Dedup helper `_thethaomammo_find_or_create_athlete` matches on `(lower(full_name), dob, club_id)` so a returning user registering for a new event finds their imported athlete row instead of creating a duplicate.
- No payment, proof, registration, or notification migration — those concerns don't apply here.

## Rollback
- Disable form route (`return notFound()`).
- Drop RPC + bucket policies — but only if no real data yet.

## Test Matrix
- Unit: zod (every variant); helper SQL test inserts valid+invalid payloads.
- Integration: RPC called with mock payload → assert rows created; force unique violation → assert rollback.
- E2E: Playwright singles + doubles + duplicate-rejected.

## Security
- Anon `execute` on RPC: validate payload server-side strictly (zod + RPC `raise exception` on bad shape).
- Rate-limit anon writes via Upstash Ratelimit (Phase 01 client ready).
- Sanitize any rich-text athlete notes via DOMPurify (no notes in MVP — skip).
- Bucket `payment-proofs`: anon insert only into prefix `{tournament_id}/`; never select/list.
- Server action returns sanitized errors (never raw PG codes to client).

## Next Steps
Phase 05 — bracket from confirmed registrations. Phase 06 — admin verify payments.

## Unresolved Questions
- Captcha to prevent anon spam? (Default: skip MVP, rely on Upstash rate-limit.)
- Do we keep CSV bulk import in admin (Phase 06) or skip? (Default: keep — current users use it.)
- What if athlete DOB unknown (parent registers without exact date)? (Default: require DOB; current schema requires it.)
- Refund flow for withdrawals? (Default: out-of-scope MVP.)
