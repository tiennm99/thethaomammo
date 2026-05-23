# Development Roadmap

## v1.0 — Greenfield Rewrite (current)

Plan: [`plans/260522-rewrite-from-scratch/plan.md`](../plans/260522-rewrite-from-scratch/plan.md)

| Phase | Status |
|---|---|
| 01 — Foundation | pending |
| 02 — Auth + RLS | pending |
| 03 — Data model | pending |
| 04 — Registration flow | pending |
| 05 — Bracket + scoring | pending |
| 06 — Admin dashboard | in_progress (most slices done) |
| 07 — Public pages | in_progress (print views shipped) |
| 08 — Notifications + jobs | in_progress (templates + edge fns shipped) |
| 09 — Polish + launch | in_progress (404 + manifest + health + smoke) |
| 10 — Data migration | optional |

Note: phases 01–05 are marked `pending` in their frontmatter but their artifacts (schema, RLS, registration, bracket) are in the repo. Status sync to be done at v1.0 tag.

## Post-MVP (not scoped for v1.0)

- **Payment gateway**: Stripe / Payos integration in place of QR-only display.
- **Zalo OA API**: programmatic announcements (currently deep-link only).
- **Double-elim brackets**: only single-elim shipped in v1.
- **Sentry / paid monitoring**: free `console.error` + Vercel logs in v1.
- **Backup destination**: pick from B2 / S3 / GH artifacts (see deployment-guide).
- **Lighthouse pass**: home + detail measured and tuned ≥ 90.
- **Generic admin scaffold**: deferred from Phase 06; reconsider after 3–5 more resources.
- **CSV import for registrations / sponsors**: only athletes shipped in v1.
- **Drag-drop schedule planner**: currently form-per-match only.
- **i18n**: Vietnamese only in v1.
- **SMS / web push**: out of scope.

## Known deferrals (tracked in phase files)

- Phase 07 custom image loader (`next/image` Supabase Storage loader)
- Phase 08 Redis idempotency lock (DB `dedup_key` unique already covers main case)
- Phase 08 bracket / match-completion notification triggers (wire when Phase 05 RPC is revisited)
- Phase 09 docs/code-standards.md, docs/system-architecture.md

## Unresolved questions

- Backup destination for `pg_dump`
- Custom domain readiness at launch
- Launch announcement channel
