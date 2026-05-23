# Deployment Guide

Locked stack: **Vercel** (web) + **Supabase** (DB, auth, storage, edge fns) + **Upstash** (Redis, QStash).

## 1. Environment variables

### Vercel (Production)

| Key | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | service role JWT — **never** import client-side |
| `NEXT_PUBLIC_SITE_URL` | canonical origin, e.g. `https://thethaomammo.com` |
| `UPSTASH_REDIS_REST_URL` | rate-limit + idempotency |
| `UPSTASH_REDIS_REST_TOKEN` | |

### Supabase Edge Function secrets

```sh
supabase secrets set \
  GMAIL_USER=...@gmail.com \
  GMAIL_APP_PASSWORD=... \
  MAIL_FROM='"Thể Thao Mầm Mơ" <...@gmail.com>' \
  QSTASH_CURRENT_SIGNING_KEY=... \
  QSTASH_NEXT_SIGNING_KEY=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected at runtime.

## 2. Database

```sh
supabase db push           # apply migrations
supabase db seed --file supabase/seed.sql   # optional
```

After first deploy, manually verify in Supabase Studio:

- All `thethaomammo.*` tables have RLS enabled.
- `v_*_public` views exist and `select` is granted to `anon, authenticated`.

## 3. Edge functions

```sh
supabase functions deploy dispatch-notifications
supabase functions deploy enqueue-reminders
```

## 4. QStash schedules (Upstash console → Schedules)

| Cron (UTC) | Endpoint | Purpose |
|---|---|---|
| `*/5 * * * *` | `https://<project>.supabase.co/functions/v1/dispatch-notifications` | Send queued emails |
| `0 1 * * *`   | `https://<project>.supabase.co/functions/v1/enqueue-reminders`     | 08:00 ICT daily reminders |

Add the QStash signing key into edge fn secrets above so verification succeeds.

## 5. Vercel

- Framework preset: Next.js
- Build command: `pnpm build`
- Output: default
- Node 24+ (set in `package.json` engines)

## 6. Domain + SSL

- Point CNAME → `cname.vercel-dns.com`
- Vercel issues SSL automatically.

## 7. Post-deploy smoke

Manual workflow:

```
gh workflow run smoke.yml -f base_url=https://thethaomammo.vercel.app
```

Or auto-triggered by `deployment_status` event (already configured).

## 8. Pre-launch checklist

- [ ] All Supabase migrations applied to prod
- [ ] All Vercel env vars present
- [ ] Edge fns deployed (`dispatch-notifications`, `enqueue-reminders`)
- [ ] QStash schedules active
- [ ] Gmail app password tested (smoke send to admin)
- [ ] Sample tournament + admin account seeded
- [ ] DNS records pointed; SSL active
- [ ] Lighthouse ≥ 90 on home + detail (manual)
- [ ] Smoke workflow green
- [ ] `v1.0.0` tag cut

## 9. Backup

R2 dropped per locked stack. Current backup options (pick one, document in `infra/`):

- Encrypted artifact in GH Actions (cap ~2GB)
- Backblaze B2 / user-supplied S3 bucket
- Accept Supabase 1-day PITR only (acceptable for MVP)

## 10. Rollback

- Vercel: redeploy previous deployment from dashboard.
- DB: forward-fix migrations; rollback via `*_down.sql` only if migration is destructive.
- Edge fn: redeploy prior commit.
