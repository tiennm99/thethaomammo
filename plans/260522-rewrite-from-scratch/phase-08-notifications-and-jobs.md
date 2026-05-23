---
phase: 08
title: Notifications + Jobs — Gmail SMTP edge fn, QStash schedules, reminders
status: in_progress
effort: M (4-6 days)
blocks: [09]
depends_on: [03, 04, 06]
---

# Phase 08 — Notifications + Jobs

## Context Links
- [Audit § Notifications](research/researcher-current-state-audit.md)
- [Stack § 13 Notifications](research/brainstormer-final-stack-proposal.md)
- [Upstash integration § 3.3 Email queue, § 3.6 Background jobs](research/brainstormer-upstash-integration.md)

## Overview
**Priority:** P2
**Status:** pending
Implement email-only notifications via Supabase Edge Function → Gmail SMTP (app password). Persist notifications in DB; cron via Upstash QStash (or Vercel cron) for reminders. Zalo via deep-link only (no API). Optional Upstash Redis dedup + rate-limit.

## Key Insights
- Locked stack drops Resend → Gmail SMTP via edge fn. Free, but Gmail throttles ~500/day per account.
- Edge Function deployable via `supabase functions deploy` — runs Deno, has fetch SMTP libs.
- QStash REST API: HTTP webhook scheduler, queues, retries. **1,000 messages/day, 10 schedules free** (verified 2026-05-22 in upstash brainstorm § 1).
- Notifications table in Phase 03 already exists; this phase wires producers + dispatcher.
- Dedup key (idempotency) via Upstash Redis SETNX with TTL.

## Requirements

### Functional
- Producer: on registration success → row in `notifications` (type='registration_success').
- Producer: on payment verified → row (type='payment_verified').
- Producer: on bracket generated → row per registered athlete (type='bracket_generated').
- Producer: on match completed → row to participants (type='match_result').
- Dispatcher edge function: reads unsent notifications, sends email via Gmail SMTP, marks sent.
- Schedule: dispatcher invoked every 5 min via QStash (or Vercel cron).
- Reminders: 24h before tournament start (`payment_reminder` if unpaid, `match_reminder` for next-day matches).
- Idempotency: each notification has dedup_key; dispatcher Redis-locks per key.
- Zalo: tournament detail surfaces "Tham gia nhóm Zalo" deep-link button — no API call.

### Non-Functional
- Email send p95 < 5s per email (Gmail SMTP latency).
- Dispatcher batch size 20 per invocation.
- Retries on Gmail 4xx (transient): exponential backoff via QStash retry config or in-function retry.
- Daily Gmail volume budget: ≤ 400 (leave headroom under 500).

## Architecture

```
Producer (server action or trigger)
   │
   ▼
notifications (status='queued', dedup_key, payload jsonb)

QStash cron every 5min
   │ HTTP POST
   ▼
Edge Function: dispatch-notifications
   │
   ├─ select 20 oldest queued
   ├─ for each:
   │    Redis SETNX lock(dedup_key, ttl=10min)
   │    render template (vietnamese)
   │    smtp.send via nodemailer / deno smtp
   │    update notifications.status='sent', sent_at=now()
   └─ return summary

Reminder cron (daily 08:00 ICT)
   │ HTTP POST
   ▼
Edge Function: enqueue-reminders
   │
   └─ scan tournaments starting within 24h
      insert notifications rows (type='match_reminder' etc.)
```

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `supabase/migrations/000016_notifications_state.sql` | add `status enum(queued,sent,failed)`, `dedup_key`, `sent_at`, indexes |
| `supabase/functions/dispatch-notifications/index.ts` | edge fn: dequeue + send |
| `supabase/functions/enqueue-reminders/index.ts` | edge fn: scheduled producer |
| `supabase/functions/_shared/smtp.ts` | nodemailer-like wrapper for Deno |
| `supabase/functions/_shared/templates/registration-success.ts` | template |
| `supabase/functions/_shared/templates/payment-verified.ts` | template |
| `supabase/functions/_shared/templates/match-reminder.ts` | template |
| `supabase/functions/_shared/templates/match-result.ts` | template |
| `supabase/functions/_shared/templates/payment-reminder.ts` | template |
| `src/server/notifications/produce.ts` | helper called from actions/triggers |
| `src/lib/upstash/qstash.ts` | optional QStash client (for ad-hoc enqueues) |
| `infra/qstash-schedules.md` | one-shot setup doc for QStash cron URLs |
| `tests/unit/notifications/templates.test.ts` | snapshot tests |

## Implementation Steps
1. Migration `000016`:
   - `alter table thethaomammo.notifications add column status text default 'queued', dedup_key text, sent_at timestamptz, error text;`
   - `create unique index on thethaomammo.notifications(dedup_key) where dedup_key is not null;`
   - `create index on thethaomammo.notifications(status) where status = 'queued';`
2. Configure Gmail app password (user-provided); store in Supabase Edge Function secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM`.
3. Build SMTP wrapper using Deno-compatible lib (`https://deno.land/x/denomailer` or similar).
4. Build templates as TS functions returning `{ subject, html, text }` from payload.
5. Build `dispatch-notifications` edge fn:
   - HMAC-verify request (signed by QStash).
   - Service-role Supabase client (bypasses RLS for system work).
   - Select 20 oldest queued; for each, redis SETNX lock; render; smtp.send; on success mark sent; on fail mark failed + error text.
6. Build `enqueue-reminders` edge fn:
   - Query tournaments starting in 24h.
   - For each registration w/ payment unpaid → insert notification (`payment_reminder`, dedup_key=`payment_reminder:{reg_id}`).
   - For each match scheduled in next 24h → insert notification (`match_reminder`, dedup_key=`match_reminder:{match_id}:{athlete_id}`).
7. Wire producers in app:
   - `src/server/admin/payments.ts` verifyPayment → insert notification.
   - `src/app/giai/[slug]/dang-ky/actions.ts` already inserts (Phase 04).
   - Bracket gen RPC inserts notifications (extend Phase 05 RPC).
   - Cascade trigger inserts on match completion (extend Phase 05 trigger).
8. Configure QStash schedules:
   - `*/5 * * * *` → POST `https://<project>.supabase.co/functions/v1/dispatch-notifications`
   - `0 1 * * *` (08:00 ICT = 01:00 UTC) → POST `enqueue-reminders`
9. Document the two cron URLs in `infra/qstash-schedules.md` (one-shot manual setup in Upstash console).
10. Tournament detail page surfaces Zalo group deep-link button (Phase 07 already handles).
11. Tests: template snapshots; dispatch fn returns counts; dedup_key constraint rejects dupes.

## Todo List
- [x] Notifications state schema (already shipped in Phase 03 `000007`: status, dedup_key, sent_at, error)
- [ ] Gmail app password stored as edge fn secret (deploy task)
- [x] SMTP wrapper (denomailer Gmail) — slice 1
- [x] All 7 templates render Vietnamese correctly (slice 1, vitest)
- [x] dispatch-notifications fn handles batch (slice 1, batch=20)
- [ ] Redis idempotency locks (deferred — DB unique dedup_key already idempotent)
- [x] enqueue-reminders fn produces correct rows (slice 1: payment_reminder + match_reminder)
- [ ] QStash schedules created (documented in `supabase/functions/README.md` — manual setup)
- [ ] Bracket trigger inserts notifications (defer to Phase 05 RPC extension)
- [ ] Match completion trigger inserts notifications (defer to Phase 05 cascade)
- [x] Verify/reject payment action inserts notification (refactored to `enqueueNotification` helper)
- [ ] Gmail daily quota dashboard or counter (defer)
- [x] Zalo deep-link button on tournament detail (Phase 07 already handles)
- [x] Snapshot/unit tests for templates (5 vitest cases)

## Success Criteria
- Submit registration → email arrives in test inbox within 5min.
- Verify payment in admin → email arrives.
- Complete match → both athletes get email.
- 24h before tournament → reminder emails scheduled.
- Dedup: re-inserting same dedup_key returns existing notification.
- Daily Gmail volume stays < 400 (alert via counter when > 350).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gmail throttle / app password revoked | H | H | Monitor daily counter; document fallback (Brevo SMTP swap = change 1 secret) |
| Gmail flags as spam (Vietnamese subject + bulk) | H | M | SPF+DKIM via Gmail Workspace if available; otherwise accept "to spam" risk; advise users to whitelist |
| Edge fn cold start > 10s | M | M | Keep fn warm via QStash 5-min schedule (effectively warm) |
| QStash free tier exhausted | L | M | 1,000/day plenty (~100 needed); only burst risk is reminders fan-out |
| Reminder fan-out floods Gmail | M | H | Throttle: dispatcher 20/invocation, fn runs every 5 min = 240/hr max |
| Service-role exposure in edge fn | L | H | Edge fn secrets, not in source; HMAC verify QStash signature |
| Template injection (athlete names with HTML) | M | M | Escape HTML in templates; treat all payload values as untrusted strings |

## Backwards Compatibility / Migration
- Existing notifications table (Phase 03) extended via `000016` — no data loss (greenfield anyway).
- Producers added incrementally; missing producer = no email, no crash.
- [Phase 10](phase-10-data-migration.md) does NOT import notifications. No historical-email risk; no dispatcher safety belt or replay-mode needed.
- Recovery emails sent during the email-keyed migration go through the standard Supabase Auth recovery flow (not this dispatcher), so they're outside this phase's quota tracking.

## Rollback
- Disable QStash schedules → dispatcher stops.
- Producers continue inserting rows; queue grows harmlessly; resume when ready.
- Remove `000016` columns only as full schema reset.

## Test Matrix
- Unit: template snapshots (vitest).
- Integration: dispatch fn run locally w/ ethereal.email or mocked SMTP; assert status=sent + sent_at populated.
- E2E: register → wait → assert email row sent (Playwright skips actual SMTP — DB assertion only).

## Security
- HMAC verify QStash signature on every edge fn invocation.
- Gmail app password in Supabase secrets, never in repo.
- Templates HTML-escape user-supplied fields.
- Notifications RLS: user sees own; admin sees all.

## Next Steps
Phase 09 polish + launch.

## Unresolved Questions
- Anti-pause: QStash 5-min schedule hitting Supabase inherently pings DB → no extra keepalive cron needed (confirmed via upstash brainstorm § 3.1).
- Email queue scope: all email through QStash, or only bulk (registration confirm, reminders) with transactional direct? (See upstash brainstorm § 8 Q3.)
- SPF/DKIM setup for Gmail send-as: out-of-scope for engineering — user task.
- Email preferences page (unsubscribe)? (Default: skip MVP; transactional only.)
- Rate-limit unit for `/dang-ky`: per-IP vs per-phone (upstash brainstorm § 7 — recommend per-phone E.164).
