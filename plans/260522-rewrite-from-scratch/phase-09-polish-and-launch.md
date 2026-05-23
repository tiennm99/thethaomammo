---
phase: 09
title: Polish + Launch — SEO, perf, error budget, deploy checklist
status: in_progress
effort: S (3-5 days)
blocks: [10]
depends_on: [01, 02, 03, 04, 05, 06, 07, 08]
---

# Phase 09 — Polish + Launch

## Context Links
- [Stack § Free-tier ceilings](research/brainstormer-final-stack-proposal.md)
- [Audit § Tech debt flags](research/researcher-current-state-audit.md)

## Overview
**Priority:** P2
**Status:** pending
Lighthouse pass, SEO meta, error pages, deploy checklist, docs update. No new features. Final guardrails before opening registration.

## Key Insights
- Free tier ceilings: 5GB egress (Supabase), 100GB bandwidth (Vercel), 5k transforms — measure baseline before launch.
- No Sentry → custom error logging via `console.error` + Vercel log drain (free).
- `docs/` must reflect final state (codebase-summary, deployment-guide, system-architecture).

## Requirements

### Functional
- Lighthouse Performance + Accessibility + Best Practices + SEO ≥ 90 on home + tournament detail.
- Proper 404 + error.tsx on every segment.
- OpenGraph + Twitter Card meta on tournament pages.
- Favicon, manifest, theme-color.
- `docs/codebase-summary.md`, `docs/deployment-guide.md`, `docs/system-architecture.md`, `docs/code-standards.md` updated.
- `docs/development-roadmap.md` lists post-MVP items (data import, payment gateway, Zalo OA, double elim).
- Smoke test on production deploy.

### Non-Functional
- Production deploy succeeds; smoke runs green.
- Backup script (pg_dump via GH Actions → ??? destination) — DEFERRED (R2 dropped per locked stack; alternative TBD or skip).

## Architecture

```
Smoke flow on production:
  /              → 200
  /giai/<slug>   → 200
  /live          → 200
  /admin (anon)  → 302/403
  /api/health    → 200 (new tiny endpoint)
  sitemap.xml    → 200
  robots.txt     → 200
```

## Related Code Files (to create / update)

| Path | Purpose |
|---|---|
| `src/app/not-found.tsx` | global 404 |
| `src/app/error.tsx` | global error boundary |
| `src/app/giai/[slug]/not-found.tsx` | scoped 404 |
| `src/app/giai/[slug]/error.tsx` | scoped error |
| `src/app/api/health/route.ts` | tiny ping endpoint |
| `src/lib/seo/og.ts` | OG meta builder |
| `public/manifest.webmanifest` | PWA-lite |
| `public/favicon.ico` + icons | branding |
| `docs/codebase-summary.md` | updated |
| `docs/deployment-guide.md` | updated |
| `docs/system-architecture.md` | updated |
| `docs/code-standards.md` | updated |
| `docs/development-roadmap.md` | post-MVP items |
| `docs/project-changelog.md` | v1.0 entry |
| `.github/workflows/smoke.yml` | post-deploy smoke |
| `tests/smoke/production.spec.ts` | playwright smoke |

## Implementation Steps
1. Add `not-found.tsx` + `error.tsx` at root + key segments.
2. Build `src/lib/seo/og.ts` — `buildOgImageUrl(tournament)` returns static placeholder URL (skip dynamic OG MVP).
3. Add metadata exports per route.
4. Add manifest + favicons.
5. Lighthouse pass:
   - Home, detail, live, athlete profile.
   - Fix: defer non-critical JS, preload LCP image, font-display swap, image dimensions set.
6. `/api/health` returns `{ ok: true, ts: Date.now() }` — for uptime checks.
7. Update docs:
   - `codebase-summary.md`: directory map + module responsibilities.
   - `system-architecture.md`: data flow diagram (mermaid).
   - `deployment-guide.md`: Vercel + Supabase + Upstash setup steps + env vars.
   - `code-standards.md`: file naming, RLS pattern, server-action pattern, RHF+zod pattern.
   - `development-roadmap.md`: post-MVP (payment gateway, Zalo OA, double-elim, etc.). Data migration is Phase 10, NOT post-MVP.
   - `project-changelog.md`: `## v1.0.0 (2026-XX-XX)` with feature list.
8. Smoke workflow on Vercel `deployment_status` event → runs playwright smoke.
9. Pre-launch checklist (manual, document in `docs/deployment-guide.md`):
   - [ ] All Supabase migrations applied to prod
   - [ ] All Vercel env vars present
   - [ ] Edge fns deployed (dispatch, reminders)
   - [ ] QStash schedules active
   - [ ] Gmail app password tested
   - [ ] Sample tournament + admin account seeded
   - [ ] DNS A/CNAME records pointed
   - [ ] SSL active
   - [ ] Lighthouse ≥ 90
   - [ ] Smoke green
10. Cut `v1.0.0` tag.

## Todo List
- [x] 404 + error pages (slice 1: root + /giai/[slug] scoped)
- [x] OG / meta on tournament detail (slice 1)
- [x] Manifest + theme-color (slice 1; favicon binary deferred)
- [x] `/api/health` endpoint (slice 1)
- [ ] Lighthouse ≥ 90 on home + detail (defer — perf measurement)
- [ ] All `docs/*.md` updated
- [ ] Changelog v1.0 entry
- [ ] Roadmap post-MVP listed
- [ ] Smoke test workflow + tests
- [ ] Deploy checklist documented
- [ ] Production smoke green
- [ ] v1.0.0 tagged

## Success Criteria
- Production smoke green.
- Lighthouse ≥ 90 four metrics on home + detail (mobile, throttled).
- All docs updated and reflect current state (verified by reading them).
- Tagged release.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-tier overrun day 1 (viral launch) | L | H | Vercel + Supabase usage dashboards monitored; manual scale-up if needed |
| Backup gap (no R2 destination) | H | M | Document risk; rely on Supabase 1-day PITR; user task to choose backup destination |
| Lighthouse < 90 on slower routes | M | L | Iterate; not blocker if home + detail pass |
| Docs drift week 1 | M | L | Phase 09 acceptance includes reading docs end-to-end |
| Smoke test brittle | M | L | Keep smoke to 5 routes; non-flaky |

## Backwards Compatibility / Migration
- N/A (launch phase).

## Rollback
- Revert Vercel deploy to last known-good in dashboard.
- Supabase migration rollback only if breaking — usually forward-fix.

## Test Matrix
- E2E smoke: 5 routes return expected status.
- Lighthouse CI: optional, recommended.

## Security
- Final pass: no service-role key in client bundles (grep + `next build` analyzer).
- Verify RLS on every base table (`select … from pg_tables` cross-ref pg_policies).
- Confirm `robots.txt` blocks `/admin`, `/print`.
- Confirm OG images don't leak private data.

## Next Steps
- [Phase 10 — Data Migration](phase-10-data-migration.md): one-shot import from old prod. Phase 09 smoke must be green before cutover; the launch checklist above is also the pre-cutover gate for Phase 10.

Post-MVP:
- Payment gateway (Stripe/Payos) if needed.
- Zalo OA API integration.
- Backup destination (R2 alt, e.g. Cloudflare Workers KV, github-encrypted artifacts, user S3).
- Sentry or alternative.

## Unresolved Questions
- Backup destination unresolved (R2 dropped per locked stack). Options: encrypted artifact in GH Actions (cap ~2GB), B2, user-supplied S3 bucket, manual `pg_dump` on schedule, or accept Supabase 1-day PITR only.
- Custom domain ready by launch? (User task.)
- Launch communication channel (Zalo announcement)? (User task.)
