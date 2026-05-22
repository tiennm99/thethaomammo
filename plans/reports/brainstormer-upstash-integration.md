# Upstash Integration — Stack Gap Analysis

**Date:** 2026-05-22
**Trigger:** User added Upstash via Vercel Marketplace to the locked stack.
**Scope:** Decide which Upstash services fill the previously-SKIPPED gaps. Honor existing locks (Vercel Hobby, Supabase Free multi-schema, Gmail SMTP, Vercel logs/analytics).

---

## 1. Verified Upstash free-tier numbers (2026)

Source: `upstash.com/pricing` + per-product pricing docs, fetched 2026-05-22.

| Product | Free limit (the ones that matter here) |
|---|---|
| **Redis** | 256 MB store · **500K commands/month** · 10 GB bandwidth/mo · 1 DB · 10 MB request · 100 MB record · persistence on |
| **QStash** | **1,000 messages/day** · 10 active schedules · 7-day max delay · 1 MB max msg · 50 GB bw/mo · 10 queues · parallelism 2 · DLQ + logs 3 days |
| **Vector** | 10K queries/day · max 1,536 dims · 100 namespaces · 1 GB total metadata · 99.9% SLA |
| **Search** | 200K docs · **20K requests/month** · 1 GB store · 10 indexes · 4,096 chars/doc |

> Note: user's prompt cited "10k commands/day" for Redis and "500/day" for QStash. Verified numbers are **500K/month Redis** (~16K/day) and **1,000/day QStash**. Both materially better than the prompt assumed. Calling this out so plans don't sandbag the headroom.

---

## 2. Expected load model

App scale assumption from current-state audit:
- ~5 tournaments / month
- ~200 registrations each = ~1,000 reg events / mo
- 3 emails per reg (confirmation, payment reminder, match reminder) = ~3,000 emails / mo
- Public reads: home + tournament detail + live page. RSC + revalidate makes server reads bursty but cacheable. Estimate ~50k public page views / mo at MVP.
- Admin operations: low (5–10 admin users).

This load is **well under every Upstash free ceiling**. Upstash is not the constraint — Supabase 5 GB egress and Gmail SMTP 500/day are.

---

## 3. Gap-by-gap decision

### 3.1 Anti-pause cron (Supabase pauses after 7 days idle)
- **Fill with QStash.** 1 schedule (free up to 10), POST daily to a Next route that runs `select 1` against Supabase.
- **Replaces:** the GH-Actions cron alternative — QStash gives you visible logs in the dashboard and DLQ if the route 500s. No GH minutes burned.
- **Example use case:** schedule `https://thethaomammo.vn/api/cron/keepalive` daily 03:00 ICT. Route hits each schema (`thethaomammo.*`, future apps) with a cheap query.
- **Verdict:** UN-SKIP. **Pick QStash.**

### 3.2 Rate limiting (anon abuse on /register, /claim, /api/upload-proof)
- **Fill with Upstash Redis** + `@upstash/ratelimit` SDK (sliding window). 
- **Load check:** 5 reg/min/IP cap → at 1k reg/mo = ~3k commands/mo. Negligible vs 500K budget.
- **Example use case:**
  - `/api/upload-proof`: 3/min/IP (proof uploads are the abuse vector — 2 MB files can burn R2 writes).
  - `/dang-ky` POST: 5/min/IP.
  - `/api/send-registration-email`: 10/hour/email (Gmail SMTP protection — see 3.3).
- **Without it:** anyone can spam 200 fake registrations and you eat Gmail SMTP daily cap before real users sign up.
- **Verdict:** UN-SKIP. **Pick Redis.**

### 3.3 Email queueing (Gmail SMTP 500/day cap)
- **Fill with QStash.** This is the strongest QStash use case here. Edge Function → Gmail SMTP at 500/day is fragile: any burst (200 registrations open at 10 AM) drops mail or 429s.
- **Pattern:**
  - App enqueues to QStash → QStash drips messages to `/api/email-worker` with throttling (1 msg / ~3 sec = ~28k/day safely under Gmail 500/day if you cap upstream).
  - On `/api/email-worker` 5xx → QStash retries with exponential backoff + DLQ after N attempts → admin alert.
- **Daily math:** 3,000 emails/mo ≈ 100/day average. Bursts during reg-open are the problem QStash solves. 1,000 msg/day free covers ~10x current load.
- **Second-order:** QStash adds visible delivery state (was the email sent?). Resolves the audit's "Email delivery not tested end-to-end" risk.
- **Verdict:** UN-SKIP. **Pick QStash** (already picked in 3.1, same DB).

### 3.4 Cache for hot reads (the Supabase egress story)
- **Fill with Redis.** Supabase's hard ceiling is **5 GB egress / mo**. Tournament-detail pages and home page are the hot reads.
- **What to cache:**
  - Public tournament list (home page) — TTL 60s
  - `/giai/[slug]` (tournament detail) — TTL 30–60s
  - Bracket JSON for `/print/bracket/[eventId]` — TTL 5 min, invalidate on match score update
  - Sponsor list, marquee ads — TTL 5 min
- **Do NOT cache:** `/live` (realtime channel is the right tool), admin writes, anything RLS-scoped per user (cache key explosion).
- **Honest pushback:** Next.js's own `fetch` cache + `revalidate` already does this at the framework level. **Question to user:** is Redis cache layered on top of Next cache duplication? Recommended split:
  - **Next data cache (free, built-in):** RSC `fetch` with `next: { revalidate: 60 }` for static-ish pages.
  - **Upstash Redis (added):** for queries Next can't cache cleanly (Supabase SDK calls, computed bracket trees, multi-tournament aggregates).
- **Load check:** 50k page views/mo × avg 3 cache hits = 150K commands/mo. Inside 500K budget but worth monitoring.
- **Verdict:** UN-SKIP but **scoped**. Use Redis for Supabase-SDK results and computed payloads only. Do not double-cache `fetch()`.

### 3.5 Session / auth cache
- **Verdict: SKIP.** Supabase Auth uses signed JWT cookies — no DB roundtrip per request. Caching session adds invalidation hell (revoke / role change) for zero benefit. **Do not introduce.**

### 3.6 Background jobs (cleanup, reminder emails before match start)
- **Fill with QStash schedules.** Free tier gives 10 schedules. Concrete jobs:
  1. Daily keepalive (3.1).
  2. Daily payment-reminder sweep at 09:00 ICT (find unpaid regs > 24h old → enqueue email).
  3. Hourly match-reminder sweep (find matches starting in 1 hour → enqueue email/Zalo deep-link).
  4. Weekly stale-cart cleanup (incomplete athlete claims > 7 days).
  5. Daily soft-deleted-row purge (`deleted_at < now - 30 days`).
- **Why QStash over Supabase pg_cron:** pg_cron lives inside Supabase. It runs even when project is paused only after wake — not reliable as keepalive. QStash is external, hits HTTP, surfaces failures.
- **Combined view:** keep pg_cron for in-DB jobs (vacuum, partition maintenance if needed). QStash for HTTP-triggered domain workflows. Both layers complementary, not redundant.
- **Verdict:** UN-SKIP. **QStash for HTTP workflows; pg_cron for DB-only jobs.**

### 3.7 Full-text search
- **Existing code (`src/lib/search-classify.ts`, 18 lines):** classifies query as `athlete_id` / `phone` / `name`. **Not a search engine** — just a regex router that decides which Postgres column to ILIKE against.
- **Real search use cases here:**
  - Athlete search on home page (name fuzzy match, ~hundreds to low-thousands of rows).
  - Tournament search (~10s of rows).
- **Postgres tsvector is enough.** At <10k athletes, `pg_trgm` + GIN index gives sub-50ms search with diacritic-insensitive Vietnamese (use `unaccent`). Zero new vendor.
- **Upstash Search trade-off:**
  - Pros: faster relevance ranking, no DB load.
  - Cons: 20K req/mo cap is tight (one busy public day = 5k searches). Data sync (athletes table → Upstash) adds a write path. Stale data risk.
- **Verdict: SKIP Upstash Search.** Use Postgres `pg_trgm` + tsvector. Reconsider only if athlete count >50k or DB egress hits ceiling from search queries specifically.

### 3.8 Upstash Vector
- **No semantic-search requirement** in current feature inventory. No AI features. Skipping.
- **Verdict: SKIP.** Unless you add "find similar athletes" or "natural-language tournament search" later, this stays off.

---

## 4. Multi-project / multi-app strategy

Supabase setup uses one project with per-app schemas (`thethaomammo.*`, `shared.*`, `auth.*`). Should Upstash mirror this?

### Option A — Single Redis DB + key prefixes (RECOMMENDED)
```
thethaomammo:rl:ip:1.2.3.4
thethaomammo:cache:tournament:slug-2026
thethaomammo:queue:email:reg-confirm
shared:rl:global:5.6.7.8
```
- **Pros:** Matches Supabase pattern. 1 connection string in env. 500K commands budget shared but easy to monitor with `SCAN MATCH thethaomammo:*`. Free tier limits **1 DB only** anyway.
- **Cons:** Noisy-neighbor risk (one app's hot key can warm out cache for another). Mitigate with TTLs per prefix.

### Option B — One Redis DB per app
- **Blocked by free tier (max 1 DB).** Would force paid plan immediately.
- Not viable until paid.

### QStash multi-app
- Single QStash account. Each schedule + endpoint URL is app-scoped naturally (`thethaomammo.vn/api/cron/keepalive` vs `app2.vn/api/cron/keepalive`). 10-schedule cap is the real constraint — budget across apps.

**Verdict:** Single Redis DB with prefix `{app}:{purpose}:{key}`. Document the prefix convention in `docs/system-architecture.md`.

---

## 5. Updated stack table (Upstash deltas only)

| # | Area | Previous | New (with Upstash) | Free limit headroom |
|---|---|---|---|---|
| 13b | Anti-pause cron | SKIPPED | **QStash schedule** | 1 of 10 schedules used |
| 13c | Background jobs | SKIPPED | **QStash schedules** | ~5 of 10 schedules used |
| 13d | Rate limiting | SKIPPED | **Upstash Redis + @upstash/ratelimit** | ~10K cmd/mo of 500K |
| 13e | Email queue | Direct SMTP (fragile) | **QStash → /api/email-worker → Gmail SMTP** | 100 msg/day of 1,000 |
| 13f | Hot-read cache | SKIPPED | **Upstash Redis** (Supabase SDK results, computed payloads) | ~150K cmd/mo of 500K |
| 13g | Session cache | n/a | **SKIPPED (intentional)** — JWT cookies already stateless | — |
| 13h | Full-text search | tsvector (planned) | **SKIPPED Upstash Search** — Postgres `pg_trgm`+`unaccent` enough | — |
| 13i | Vector / semantic | n/a | **SKIPPED Upstash Vector** — no AI use case | — |

Items that **stay SKIPPED even with Upstash available:**
- **Backups (section 14 in prior proposal):** Upstash doesn't solve this. Still no off-platform DB backup. User accepted this risk.
- **Image optimization:** still original images per user decision. Upstash doesn't help with media.
- **Push / SMS / Zalo OA:** unchanged. QStash could deliver them but the upstream providers themselves are skipped.
- **Sentry-style error tracking:** Vercel logs remain. Upstash is not a logging product.

---

## 6. Simplest viable subset (KISS lens)

If you only enable **two** Upstash services and ignore the rest, get:
1. **Redis** — rate limit + cache. Solves abuse + Supabase egress.
2. **QStash** — keepalive + email queue + background jobs. Solves pause risk + Gmail cap + reminders.

**Skip Vector and Search entirely.** They're tempting because they're free, but each new service is a new SDK, new env var, new failure mode, new bill if it grows.

This is the recommended floor. Everything else from the gap analysis maps to these two.

---

## 7. Second-order effects (be honest about cost)

### Cache invalidation bugs
Adding Redis cache for tournament-detail pages means score updates from `/live` must invalidate the cache key. Wire `match-cascade.ts` and admin score-update endpoints to call `redis.del('thethaomammo:cache:bracket:{eventId}')`. Forgetting this → stale brackets visible publicly while live page shows new score. **High-likelihood bug source.** Mitigation: every write path that touches `matches`, `tournaments`, `events` lists which Redis keys it invalidates, documented in a single file (`src/lib/cache-keys.ts`).

### Vendor count creeps up
Stack now: Vercel + Supabase + Cloudflare DNS + Upstash + Gmail. 5 vendors with credentials. Onboarding doc becomes mandatory. Each vendor is one more place an outage degrades the site.

### QStash → Gmail SMTP coupling
If Gmail flags the sender (volume spike, bad content), QStash retries make it worse — 5 retries × spike = SMTP block for 24h. Mitigation: implement circuit-breaker in `/api/email-worker` — if last 10 sends 4xx'd, ack QStash with 200 and write to a `failed_emails` table instead of letting it retry forever.

### Rate limit on legit users
Sliding window 5/min on `/dang-ky` is fine until a family signs up 6 kids from one IP. Decide policy: per-IP vs per-email vs per-phone. Recommendation: per-phone (E.164 normalized) for registration, per-IP for upload. Document in `src/lib/ratelimit.ts`.

### Edge function cold + Redis round-trip latency
Vercel Edge runtime → Upstash Redis HTTPS REST API adds ~30-80ms per call. Don't put Redis on the critical path of every public read. Use it for: rate-limit gate (one call), explicit cached values (one call). If a request makes 5 Redis calls, you've lost the cache savings.

### Free-tier headroom math (sanity check)
- Redis: 150K cache + 10K rate-limit + 5K misc = 165K / 500K cmd/mo. **3x headroom.**
- QStash: 100 emails/day + 5 schedules × ~1 invoke/day = ~105 / 1,000 msg/day. **10x headroom.**
- Both have room for a second small app on the same account.

---

## 8. Open / unresolved questions

1. **Cache strategy split:** are you OK with Redis being **only** for Supabase SDK results and computed payloads, while Next `fetch()` cache handles RSC data? Or do you want all caching consolidated into Redis (more uniform, more code)?
2. **Rate-limit policy units:** per-IP vs per-phone vs per-email for registration endpoints — which one matches the abuse model you're worried about?
3. **Email queue cutover:** keep direct Supabase Edge → SMTP for transactional (password reset, OTP — low volume, latency-sensitive), QStash only for bulk (registration confirm, reminders)? Or all email through QStash?
4. **QStash → keep pg_cron?** Or move all schedules to QStash for one place to look? My recommendation: QStash for HTTP, pg_cron for in-DB only. Confirm.
5. **Naming prefix:** confirm `thethaomammo:*` as the Redis key prefix, or prefer `tt:*` short form for byte-saving?
6. **Multi-app future:** which apps are coming next? Affects QStash 10-schedule budget split now.

---

## TL;DR

Enable **Upstash Redis + QStash only**. Skip Vector and Search. Use Redis for rate-limit + cache (Supabase-SDK results, not Next `fetch()` duplication). Use QStash for keepalive, email queue (Gmail SMTP 500/day buffer), and background reminders. Single Redis DB with `{app}:{purpose}:{key}` prefixes. Free-tier headroom is comfortable (~3x on Redis, ~10x on QStash). Biggest new risk: cache invalidation bugs in score/bracket flows — centralize cache keys in one file.
