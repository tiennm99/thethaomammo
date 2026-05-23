# Edge Functions

Two Deno-based functions for the notification pipeline.

## Deploy

```sh
supabase functions deploy dispatch-notifications
supabase functions deploy enqueue-reminders
```

## Required secrets

Set per project once:

```sh
supabase secrets set \
  GMAIL_USER=...@gmail.com \
  GMAIL_APP_PASSWORD=... \
  MAIL_FROM='"Thể Thao Mầm Mơ" <...@gmail.com>' \
  QSTASH_CURRENT_SIGNING_KEY=... \
  QSTASH_NEXT_SIGNING_KEY=...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.

## Schedules (Upstash QStash)

| Cron | Endpoint | Purpose |
|---|---|---|
| `*/5 * * * *` | `https://<project>.supabase.co/functions/v1/dispatch-notifications` | Send queued emails (batch 20) |
| `0 1 * * *` | `https://<project>.supabase.co/functions/v1/enqueue-reminders` | Insert reminders for tournaments within 24h (08:00 ICT) |

Configure both schedules in the Upstash console after deploy.

## Local testing

```sh
supabase functions serve dispatch-notifications --env-file ./supabase/.env.local
curl -X POST http://localhost:54321/functions/v1/dispatch-notifications -d '{}'
```

QStash verification is skipped when `QSTASH_CURRENT_SIGNING_KEY` is unset (local dev only).
