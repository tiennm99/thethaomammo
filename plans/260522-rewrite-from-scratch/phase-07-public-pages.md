---
phase: 07
title: Public Pages — list/detail/live/gallery/sponsors/print
status: pending
effort: M (5-7 days)
blocks: [09]
depends_on: [03, 05]
---

# Phase 07 — Public Pages

## Context Links
- [Audit § Public Pages](research/researcher-current-state-audit.md)
- [Audit § Routing Map](research/researcher-current-state-audit.md)
- [Stack § 11 RSC vs TanStack Query](research/brainstormer-final-stack-proposal.md)

## Overview
**Priority:** P2
**Status:** pending
Build user-facing surfaces: home (tournament list, athlete search, sponsor carousel), tournament detail, live scoring page, athlete profile, club info, gallery, print views. RSC by default; client components only where interactivity required.

## Key Insights
- Read-mostly → RSC + cache via `revalidate`. Saves egress + transforms.
- Live page is the one realtime surface — bound subscription scope tight.
- Print views need `@media print` CSS; no JS interactivity required.
- Vietnamese-first; URL slugs Vietnamese-friendly (`/giai/[slug]`).

## Requirements

### Functional
- `/` home: list upcoming tournaments (status='published', starts_at >= today), athlete search box, sponsor grid, marquee.
- `/giai/[slug]` tournament detail: name, dates, venue, rules (Tiptap HTML), prize structure, events list, sponsors, gallery preview, Zalo group link, register CTA.
- `/giai/[slug]/dang-ky` — registration form (Phase 04).
- `/live` — index of in-progress tournaments.
- `/live/[tournamentId]` — live matches grid w/ realtime.
- `/athlete/[id]` — public athlete profile (name, club, tournaments participated, recent matches).
- `/club/[slug]` — club info page.
- `/gallery/[tournamentId]` — full gallery.
- `/print/athlete/[id]` — printable card.
- `/print/bracket/[eventId]` — printable bracket.
- `/print/record/[matchId]` — printable match record (Vietnamese "BIÊN BẢN THI ĐẤU" form).
- `robots.txt` + `sitemap.xml` auto-generated.

### Non-Functional
- LCP < 2.5s on 3G.
- TTFB < 800ms on Vercel.
- Images served via `next/image` with custom loader to Supabase Storage (no on-the-fly Vercel transforms for user uploads; pre-resized variants at upload time).

## Architecture

```
src/app/
├── page.tsx                              ← home (RSC, revalidate 5min)
├── giai/[slug]/page.tsx                  ← detail (RSC, revalidate 1min)
├── giai/[slug]/dang-ky/                  ← Phase 04
├── live/page.tsx                         ← list (RSC)
├── live/[tournamentId]/page.tsx          ← realtime client component
├── athlete/[id]/page.tsx                 ← (RSC)
├── club/[slug]/page.tsx                  ← (RSC)
├── gallery/[tournamentId]/page.tsx       ← (RSC)
├── print/athlete/[id]/page.tsx           ← print CSS
├── print/bracket/[eventId]/page.tsx      ← print CSS
├── print/record/[matchId]/page.tsx       ← print CSS
├── sitemap.ts                            ← dynamic sitemap
└── robots.ts                             ← robots.txt
```

Data flow:
- All public reads via service-invoker views (`v_tournaments_public`, etc.) — RLS still applies.
- Image loader hits Supabase Storage public URL directly (no Vercel transform).
- Live page uses Phase 05 realtime channel pattern.

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `src/app/page.tsx` | home RSC |
| `src/app/giai/[slug]/page.tsx` | detail RSC |
| `src/app/live/page.tsx` | live index |
| `src/app/live/[tournamentId]/page.tsx` | client wrapper |
| `src/app/athlete/[id]/page.tsx` | athlete profile |
| `src/app/club/[slug]/page.tsx` | club info |
| `src/app/gallery/[tournamentId]/page.tsx` | gallery |
| `src/app/print/athlete/[id]/page.tsx` | print card |
| `src/app/print/bracket/[eventId]/page.tsx` | print bracket |
| `src/app/print/record/[matchId]/page.tsx` | print record |
| `src/app/sitemap.ts` | sitemap |
| `src/app/robots.ts` | robots |
| `src/components/public/tournament-card.tsx` | reusable |
| `src/components/public/athlete-search.tsx` | client component |
| `src/components/public/sponsor-grid.tsx` | static |
| `src/components/public/marquee.tsx` | sponsor marquee |
| `src/components/public/bracket-tree-public.tsx` | reusable from Phase 05 |
| `src/components/public/print-record-form.tsx` | matches printed form |
| `src/lib/image/loader.ts` | next/image custom loader for Supabase Storage |
| `tests/e2e/public-pages.spec.ts` | Playwright LCP + key flows |

## Implementation Steps
1. `next.config.ts`: register custom image loader for Supabase Storage hostname.
2. Build `src/lib/image/loader.ts` — accepts `{ src, width, quality }`, returns Supabase storage URL with `?width=...&quality=...` Supabase render params.
3. Home page:
   - RSC: fetch tournaments via `v_tournaments_public`.
   - Tournament cards (next/image w/ loader).
   - Athlete search (client component, debounced server action).
   - Sponsor grid + marquee (read sponsors w/ `tournament_id IS NULL` + per-tournament).
4. Tournament detail page:
   - RSC: fetch tournament + events + sponsors + gallery preview (first 6).
   - Render rules HTML (sanitized via DOMPurify on server).
   - Register CTA links to Phase 04 form.
5. Live page:
   - Index lists tournaments with at least 1 in-progress match.
   - Detail page = client component subscribing to Phase 05 channel.
6. Athlete profile:
   - RSC fetches athlete + recent registrations + matches.
   - Avoid leaking DOB / phone (public view strips them).
7. Club info page — simple.
8. Gallery — grid, lightbox optional (skip MVP — let browser tap-to-zoom).
9. Print views:
   - Server-render minimal HTML.
   - `@media print` CSS hides nav, removes margins.
   - `record` view replicates the existing `BIÊN BẢN THI ĐẤU.pdf` layout.
10. `sitemap.ts` — list published tournaments + events.
11. `robots.ts` — allow all except `/admin`, `/print`.
12. Performance pass: `next/image priority` on LCP image, font preload, defer client JS.

## Todo List
- [ ] Custom image loader
- [ ] Home page rendered
- [ ] Tournament detail page
- [ ] Live index + detail (realtime)
- [ ] Athlete profile
- [ ] Club info
- [ ] Gallery
- [ ] Print: athlete
- [ ] Print: bracket
- [ ] Print: match record
- [ ] sitemap.xml correct
- [ ] robots.txt blocks admin/print
- [ ] LCP < 2.5s on 3G (Lighthouse)
- [ ] No PII leaked in views

## Success Criteria
- Home Lighthouse Performance ≥ 90 (mobile, throttled).
- All pages render w/o JS for first paint (RSC works headless).
- Live page updates within 3s of score change.
- Print views print correctly (1 page, no nav, no clipped content).
- `curl /sitemap.xml` returns valid XML with all tournaments.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Custom image loader misconfigured → Vercel transforms run | H | M | Test: `next/image` requests must hit Supabase URL directly, not Vercel CDN transform |
| Supabase egress overrun (gallery images) | M | M | Pre-resize variants at upload (Phase 06); store thumbs separately |
| RSC + Tiptap HTML hydration mismatch | M | M | Tiptap rules HTML rendered server-side via `dangerouslySetInnerHTML` after DOMPurify; no client editor on public |
| Stale tournament data (revalidate cache) | M | L | `revalidate: 60` on detail; manual revalidate via tag on admin update |
| Print CSS wonky cross-browser | M | L | Test Chrome + Safari; accept Firefox quirks |
| Slug collision | L | L | Phase 03 unique constraint; admin form validates |

## Backwards Compatibility / Migration
- URLs match current scheme (`/giai/[slug]`, `/live`, `/athlete/[id]`) — no broken inbound links.
- 301 from `/dang-ky` (current) → `/giai/[slug]/dang-ky` if needed (or just leave as not-found post-launch).
- Image loader composes URLs from env `NEXT_PUBLIC_SUPABASE_URL` (not hardcoded) — standard practice.
- **Fresh-start path (default):** no legacy data; all `is_legacy=false`; nothing special to render.
- **If [Phase 10](phase-10-data-migration.md) (optional) runs:** when `tournaments.is_legacy=true`, tournament detail page shows a banner ("Giải đấu này có dữ liệu trận đấu trên hệ thống cũ, xem tại <link>") and hides Live / Print Bracket / Register actions. `/live` route filters out legacy tournaments. `/giai/[slug]/dang-ky` returns 404 for legacy tournaments.

## Rollback
- Revert specific page; public site continues from prior tag.

## Test Matrix
- Unit: image loader URL construction.
- E2E: Playwright LCP measurement + each major route returns 200 + admin / print blocked from robots.

## Security
- DOMPurify on every rendered Tiptap HTML server-side.
- Public views strip PII (`dob`, `zalo_phone`, `email`).
- `/print/*` not indexable (robots).
- Signed URLs unnecessary for public bucket assets.

## Next Steps
Phase 08 notifications. Phase 09 polish + launch.

## Unresolved Questions
- Athlete search: search by name only, or also `display_id`? (Default: both.)
- Tournament list filtering (by region, age group)? (Default: simple list MVP.)
- Gallery lightbox? (Default: skip; tap-to-zoom native.)
- OG / share images per tournament? (Default: skip MVP; use static OG.)
