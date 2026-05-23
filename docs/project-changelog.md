# Changelog

## Unreleased

### Added
- Print views for athlete card, bracket, and Vietnamese match-record (BIÊN BẢN THI ĐẤU) under `/print/*`. Shared `print.css` with `@media print` rules for A4 output.
- Notification pipeline (Phase 08):
  - 7 Vietnamese email templates with HTML-escaped payload fields (`src/lib/notifications/templates.ts`).
  - `enqueueNotification` server helper; payment verify/reject migrated to it.
  - `dispatch-notifications` edge function: dequeue 20 oldest queued, Gmail SMTP via denomailer, mark sent/failed.
  - `enqueue-reminders` edge function: payment + match reminders within 24h, dedup_key-guarded.
  - Functions README with secrets and cron schedule documentation.
- Phase 09 polish slice 1:
  - Root `not-found.tsx` + `error.tsx` with Vietnamese copy.
  - Scoped 404 for `/giai/[slug]`.
  - `/api/health` uptime probe.
  - PWA manifest (`app/manifest.ts`) with theme-color.
  - OpenGraph + Twitter Card meta on tournament detail.
  - Smoke test workflow (`tests/smoke/production.spec.ts` + GH Actions `smoke.yml`).
- Initial docs: `codebase-summary.md`, `deployment-guide.md`, `development-roadmap.md`, this changelog.

### Changed
- `payments.ts` server actions now use the shared `enqueueNotification` helper instead of inline insert (DRY).
- `tsconfig.json` excludes `supabase/functions` (Deno runtime, separate type-check).

## v1.0.0 — 2026-05-23

Greenfield rewrite complete (all 9 implementation phases shipped; Phase 10 data migration skipped — fresh-start path chosen). See `plans/260522-rewrite-from-scratch/`.

### Verification

- Build: `pnpm build` clean (Next.js 16, all routes registered)
- Unit tests: 62 passing across 8 files
- Smoke (local): 5/5 passing against `pnpm dev` — home, live, /api/health, sitemap.xml, robots.txt
- Lighthouse: deferred to first prod deploy (Chrome libs unavailable in local sandbox); rerun via `pnpm dlx lighthouse <prod-url>` after deploy

### Pending operator setup (documented)

- Gmail app password (Supabase edge fn secret) — see `supabase/functions/README.md`
- Upstash QStash schedules (2 cron) — see `supabase/functions/README.md`
- Custom domain + DNS — see `docs/deployment-guide.md`
