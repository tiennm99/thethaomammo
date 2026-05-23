# Development Roadmap

## v1.0 — Greenfield Rewrite (current)

Plan: [`plans/260522-rewrite-from-scratch/plan.md`](../plans/260522-rewrite-from-scratch/plan.md)

| Phase | Status |
|---|---|
| 01 — Foundation | complete |
| 02 — Auth + RLS | complete |
| 03 — Data model | complete |
| 04 — Registration flow | complete |
| 05 — Bracket + scoring | complete |
| 06 — Admin dashboard | complete |
| 07 — Public pages | complete |
| 08 — Notifications + jobs | complete |
| 09 — Polish + launch | complete |
| 10 — Data migration | skipped (fresh-start path chosen) |

## Launch gates (run on first prod deploy)

These items in Phase 09 are deferred to deploy time:

- **Lighthouse ≥ 90** — measure home + detail on deployed URL
- **Production smoke** — `gh workflow run smoke.yml -f base_url=<prod>`
- **`v1.0.0` git tag** — cut after smoke is green
- **Manual ops** — Gmail app password + QStash schedules (see `docs/deployment-guide.md`)

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
