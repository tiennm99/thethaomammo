# Code Review — Session Audit (8 commits, v1.0.0 cut)

**Date:** 2026-05-23
**Reviewer:** code-reviewer (read-only)
**Scope:** commits `f346edb..fc1b7a6` — Phase 07 print views, Phase 08 notification pipeline, Phase 09 polish slice, status sync, v1.0.0.

---

## 1. Summary

| Sev | Count |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 6 |
| Low | 5 |
| Nit | 6 |

Net assessment: code is shippable but has one production-affecting auth-bypass risk (qstash verify), one unbounded N+1 loop in the daily cron, and a duplicated template module that will silently drift. Print views are safer than feared — PII columns are not selected. Plan claims "Phases 01-09 complete" hold up under spot-check.

---

## 2. Critical / High

| Sev | Finding | File:line | Why it matters | Suggested action |
|---|---|---|---|---|
| **Critical** | `verifyQstash` returns `true` when `QSTASH_CURRENT_SIGNING_KEY` is unset. No environment check guards this against prod. If the secret is missing in Supabase secrets at deploy, both edge fns silently accept any unsigned POST — anyone with the function URL can dispatch emails (Gmail budget burn) or insert reminder rows. | `supabase/functions/_shared/qstash-verify.ts:9` | Webhook auth bypass. Function URLs are guessable (`https://<project>.supabase.co/functions/v1/dispatch-notifications`). Single misconfigured `secrets set` ships an open endpoint. Comment "local dev only" is not enforced. | Refuse to start (return 500) when secret is unset AND `Deno.env.get("ENV")` / `DENO_DEPLOYMENT_ID` indicates prod; or require an explicit `ALLOW_UNSIGNED=true` toggle. Cite: deployment-guide checklist alone is not a code-level safeguard. |
| **High** | N+1 athlete lookup inside reminder loop. `enqueue-reminders` iterates over matches → over participants → per-athlete `await supabase.from("athletes").select("claim_user_id").eq("id", athleteId).maybeSingle()`. For 50 matches × 2 athletes the cron runs ~100 sequential round-trips. | `supabase/functions/enqueue-reminders/index.ts:106-110` | Cron timeout / Supabase egress budget. Edge fn execution time scales linearly with bracket size. Free-tier ceiling concern is called out in `phase-08`. | Collect all `athleteId`s into a `Set`, run one `.in("id", [...])` query, build a `Map<id, claim_user_id>` lookup. |
| **High** | Duck-typed producer accepts wrong-schema clients silently. `NotificationsCapableClient` only checks `.from("notifications").insert(...)`. If a caller hands in a Supabase client whose `db.schema` is `public` or `shared` (or unset → defaults to `public`), the insert hits a non-existent table and Supabase returns an error like `relation "public.notifications" does not exist`. The producer treats the error message as a generic failure (not `23505`) and returns it — the caller in `payments.ts:79` `await`s but doesn't read the return value. The notification is silently dropped. | `src/server/notifications/produce.ts:14-17`, `src/server/admin/payments.ts:79,118` | Notifications can vanish on schema misconfig. The test mocks fully bypass schema. There's no integration test that proves the producer hits `thethaomammo.notifications`. | (a) Have `enqueueNotification` return a richer result and have call sites log/swallow; (b) optionally accept an explicit `schema` parameter and assert; (c) integration test against local Supabase that asserts the row lands in `thethaomammo.notifications`. |
| **High** | Producer return value discarded at call site. `await enqueueNotification(supabase, {...})` in `verifyPaymentAction` / `rejectPaymentAction`, but the returned `{ error?: string }` is unused. Any non-23505 failure (Postgres permission, schema typo, network flake, missing user_id, malformed payload) is silently swallowed; the action returns `{ ok: true }` and the user gets no email. | `src/server/admin/payments.ts:79-88`, `:118-128` | Silent notification loss after payment is verified — exactly the case operators most want to know about. Producer was carefully designed to return errors and the call sites throw that signal away. | At minimum `console.error` the error string. Better: log + still return `{ ok: true }` so the action doesn't fail, but include the error in server logs for triage. |
| **High** | `enqueue-reminders` payment query is missing a top-level `is_legacy=false` filter. The PostgREST embed `event:event_id!inner ( tournament:tournament_id!inner ( ... is_legacy ) )` with `!inner` only enforces *existence* of the joined row, not a value predicate — the `is_legacy` column is **selected** but not **filtered**. The runtime guard `if (!t \|\| t.is_legacy) continue;` (line 75/98) does filter, but only **after** all rows have been pulled out of the DB. | `supabase/functions/enqueue-reminders/index.ts:33-39`, `:42-51` | Correctness OK (runtime guard catches it), but performance/cost: every legacy tournament's pending registrations get pulled into the edge fn just to be discarded. With a multi-season app this grows unbounded. | Add `.eq("event.tournament.is_legacy", false)` to both `.select()` chains (the same pattern is used at `src/app/athlete/[id]/page.tsx:76,91` — proven to work). |

---

## 3. Medium / Low

| Sev | Finding | File:line | Why it matters | Suggested action |
|---|---|---|---|---|
| Medium | Duplicate template module (`src/lib/notifications/templates.ts` 163 LOC vs `supabase/functions/_shared/templates.ts` 124 LOC). Two implementations of the same render function with subtle differences (TS uses per-type functions + RENDERERS map; Deno version uses a switch). Header comment says "Keep in sync" — no test enforces that. | `src/lib/notifications/templates.ts`, `supabase/functions/_shared/templates.ts:1` | Drift risk. A future template change (subject line, footer) will land in one file, ship to production, and the other channel will render stale content. | Option A: use a `deno.json` import-map to import the TS module directly (avoids the `@/` alias by re-pathing). Option B: add a parity test that imports both and compares output for a fixed payload. |
| Medium | `escape-html.ts` does NOT escape backtick `` ` `` or `/`. HTML5 allows unquoted attributes — backticks can break out of some legacy parsers; forward-slash is benign in standard HTML5 but recommended by OWASP for defense-in-depth. More importantly: the templates always put escaped values inside **double-quoted** or **text** context (never unquoted attr / JS / CSS / URL), so practical risk is low. | `src/lib/notifications/escape-html.ts:1-12` | Defense-in-depth gap, not an immediate exploit. Email clients are conservative parsers. | Add `` ` `` and `/` to MAP; or use a vetted lib (he/escape-html). Not blocking. |
| Medium | `payment_reminder` cron never fires for `payment_status='unpaid'` (the default). It only matches `pending`. Users who registered but never uploaded a proof get no reminder. | `supabase/functions/enqueue-reminders/index.ts:38` | Functional gap — the whole point of payment reminders is to nudge unpaid users. `unpaid` is more common than `pending` for unclaimed accounts. | Either widen filter to `.in("payment_status", ["unpaid","pending"])` or document this is intentional in the phase-08 plan. |
| Medium | `payment_reminder` payload omits `athlete_name` and `event_name`, but the template (`paymentReminder`) only consumes `tournament_name` — so the resulting email is generic ("Bạn còn khoản chưa thanh toán cho giải X"). User with multiple registrations across events can't tell which one is unpaid. | `supabase/functions/enqueue-reminders/index.ts:80-83`, `src/lib/notifications/templates.ts:80-91` | UX gap, not bug. May confuse multi-event registrants. | Include `event_name`/`athlete_name` in payload + update template, OR include a link. |
| Medium | `match_reminder` payload sends `scheduled_at` as raw ISO string, escaped and placed verbatim in email. Vietnamese users will see e.g. "Thời gian: 2026-05-25T08:00:00.000Z" — not localized. | `supabase/functions/enqueue-reminders/index.ts:120`, `src/lib/notifications/templates.ts:98-105` | UX. Inconsistent with site formatting (uses `formatDate` elsewhere). | Format with a small Vietnamese date helper inside the edge fn (no need for `formatDate` import — Intl.DateTimeFormat with `vi-VN` is fine in Deno). |
| Medium | `dispatch-notifications` updates `notifications` rows individually inside the loop after each send. 20 sequential updates per invocation. Combined with per-row `auth.admin.getUserById` lookup (also sequential), the function does up to 40 round-trips per batch. Not strictly N+1 (bounded by BATCH), but each invocation is ~5-10s minimum. | `supabase/functions/dispatch-notifications/index.ts:55-90` | Performance / function timeout on slow days. | Acceptable for MVP at 5-min cadence. Mark as known. If/when Gmail goes async, batch the status updates. |
| Low | Print views allow direct anonymous access to bracket and match-record pages. RLS does block `athletes` reads for anon, so PII is not leaked, but **match metadata** (court, scheduled_at, score, status) is exposed even before a tournament is publicly published. There is no `is_legacy` or `status='published'` guard. | `src/app/print/bracket/[eventId]/page.tsx:77-87`, `src/app/print/record/[matchId]/page.tsx:66-117` | Operational leak: brackets in `draft` status are printable by URL guess if the eventId is known. | Add `.eq("status", ...)` or join check on parent tournament status. Or accept (URLs are uuid-guarded). Not a hard PII leak. |
| Low | `escape-html.ts` import path collision risk. The producer/templates are now in **two** locations (`src/lib/notifications` and `supabase/functions/_shared`), and `templates.test.ts` only imports the TS version. If a contributor edits the Deno version expecting the test to catch them, it won't. | `src/lib/notifications/templates.test.ts:2` | Test coverage illusion. | Mirror parity test in `supabase/functions/.../templates_test.ts` (Deno test). |
| Low | `metadata: themeColor` is set in `src/app/layout.tsx:37` as a top-level `Metadata` field. Next.js 14+ has deprecated this and requires `viewport` export instead. Will produce a build-time warning but not break. | `src/app/layout.tsx:37` | Warning noise; future Next will drop. | Move to `export const viewport = { themeColor: "#0a0a0a" }`. |
| Low | `tsconfig.json` change (3 lines) not reviewed inline — verify it didn't loosen strictness. | `tsconfig.json` (per diff stat) | TS strictness regression risk. | Spot-check the diff. |
| Low | `/api/health` returns `{ ok: true, ts: Date.now() }` with no DB or downstream check. A green health doesn't prove Supabase reachable. | `src/app/api/health/route.ts:3-5` | Smoke test might pass while Supabase is down. | Optionally probe `from("site_settings").select("key").limit(1)` — but this adds an external dep. Accept current scope as "process up" check; document. |

---

## 4. Nits

- `src/app/print/print.css:32-34` declares `.print-root .no-print { display: block; }` — global selector under `.print-root` is fine (scoped) but the `.no-print` utility could collide with any future content-area class.
- `src/app/print/record/[matchId]/page.tsx:14` puts `matchId.slice(0, 8)` in the document `<title>`. Fine, but consider including event/round for human-readable browser tabs.
- `src/components/print/print-actions.tsx:6-22` uses inline styles for a single button; could move into `print.css`.
- `src/lib/notifications/templates.ts:144-152` builds `RENDERERS` map but `renderEmail` then does a redundant `if (!renderer) throw` — TS already guarantees exhaustiveness for `NotificationType`. Harmless.
- `supabase/functions/dispatch-notifications/index.ts:31-34` re-creates the Supabase client per request — Deno-edge per-invocation is fine, but if cold-starts add up, a module-level singleton (with lazy init) shaves a few ms.
- `tests/smoke/production.spec.ts:13` `/live returns 200` — only the index. No detail/print smoke. Smoke is what you'd call "URL liveness", not regression. Documented as such.

---

## 5. Red-team coverage

| Angle | Result |
|---|---|
| HTML escape: every dangerous char in attribute/text context? | **Mostly safe.** `&<>"'` covered. ` ` ` and `/` not covered — defense-in-depth gap only (see Medium). All template interpolations sit inside quoted attrs or text nodes, never unquoted attr / `href=javascript:` / inline JS. **Confirmed safe for current call sites.** |
| HTML escape: double-escape risk? | **Confirmed safe.** `escapeHtml` is called exactly once on raw payload values; no template calls it again on already-escaped output. |
| `/print/*` PII exposure to anon | **Confirmed safe.** Athlete card uses `v_athletes_public` (sanitized columns: id, display_id, full_name, gender, club). No DOB/phone/email/claim_user_id. Record page joins `athletes` directly but selects only `full_name, display_id, club_name`. RLS denies anon SELECT on `athletes` → record page renders blank participant cells for anon (also true for non-existent matches — not great UX, but no leak). Authenticated users see the same fields they'd see via `v_athletes_public` anyway. |
| QStash bypass when key unset | **Confirmed issue (Critical).** No environment guard. `secrets set` omission ships an open endpoint. README mentions "local dev only" but it's not enforced in code. |
| `enqueue-reminders` `is_legacy=false` at top level | **Confirmed issue (High, perf-only).** PostgREST `!inner` enforces existence, not value. Runtime guard does catch it (so no spurious notifications), but rows are pulled from DB anyway. |
| Producer accepting wrong-schema client | **Confirmed issue (High).** Duck-type is structural-only; no schema assertion. Combined with call-site discarding the return value, schema mismatch → silent drop. |
| `print.css` global selector leakage | **Confirmed safe.** All `print.css` rules are scoped under `.print-root` or `@media print`. `@media print` does apply globally during print rendering on any page, but the rules are print-only and benign (`background: white !important`, `text-decoration: none` on anchors, `page-break-inside: avoid` on `tr`). The non-print rules (lines 3-34) are all `.print-root ...` prefixed — won't leak to non-print pages. The `import "./print.css"` is inside `src/app/print/layout.tsx`, so Next.js segment-scopes the CSS; even the `@media print` block only ships to `/print/*` route bundles. |
| Plan claim: "RLS enabled on every base table" | **Confirmed accurate.** `000003_shared_rls.sql` enables RLS on `shared.profiles`, `shared.app_grants`. `000008_thethaomammo_rls.sql:4-21` enables RLS on all 18 `thethaomammo.*` tables (age_categories, clubs, athletes, tournaments, events, teams, registrations, registration_payments, courts, schedule_breaks, matches, match_participants, match_scores, notifications, gallery_photos, sponsors, site_settings, tournament_breaks). Tables created in `000004-000007` = 18. Match. **Plan claim verified.** |
| Plan claim: "Phase 09 polish complete" | **Inconclusive.** Phase-09 file lists 11 todos; 8 checked, 3 unchecked (Lighthouse ≥ 90 on home + detail, production smoke green, v1.0.0 tagged). Last todo is now tagged locally per commit `fc1b7a6` but smoke against prod URL hasn't run (no green status surfaced). Plan top-line "complete" overstates by 2 outstanding launch-gated items. |
| OG meta injection via tournament name | **Confirmed safe.** `src/app/giai/[slug]/page.tsx:54-69` returns `data.name` inside a `Metadata` object — Next.js handles HTML escaping when serializing `<meta>` tags. No `dangerouslySetInnerHTML` of the name. The `description` field is interpolated directly into `Metadata.description` which Next escapes. **No injection surface.** |
| Manifest injection | **Confirmed safe.** `src/app/manifest.ts:3-22` returns a typed object literal; Next serializes as JSON. |
| Error/not-found PII leak | **Confirmed safe.** `error.tsx:23-27` prints only `error.digest` (Next-generated opaque ID, no PII or stack). `console.error(error)` runs client-side via useEffect — server stack stays server-side. Vietnamese-language message only. |
| `/api/health` cache-poisonable | **Safe-ish.** `export const dynamic = "force-dynamic"` prevents static caching. Body is `{ ok: true, ts: Date.now() }` — no cookies/headers reflected; not cache-poisonable. |

---

## 6. Unresolved questions

1. **QStash bypass severity** — does the user want hard-fail-in-prod, or accept the deployment-guide-as-safeguard? (Critical finding rests on this.)
2. **`payment_status='pending'` vs `'unpaid'` for reminders** — is the intent that users who never started payment get nudged, or only those who uploaded a proof? Behavior changes filter scope (Medium 3).
3. **Template-duplication strategy** — single-source via deno import-map, or maintain parity test only? Pick one.
4. **Match-record print access policy** — should anonymous users be able to print a published match's record (current behavior with empty participant cells), or should the route 403 for anon? Affects Low 1.
5. **Smoke depth** — current 5-route smoke is HTTP-200 only. Acceptable, or extend to render-assertion (e.g. `expect(text).toContain("Thể Thao Mầm Mơ")`)? Affects Nit / smoke posture.
6. **Plan top-line status** — should the plan be marked `complete` while Lighthouse measurement and production smoke are still pending? Or downgrade to `launch-ready` until both are green?

---

**Out-of-scope but worth noting for next sprint:**
- `bracket_generated` and `match_result` notification types are defined (enum + template + UI label) but no producer ever creates them. Either implement Phase 08's stated producers or remove from enum to avoid confusion.
- Edge fn dependencies pinned via `esm.sh` URL imports — no integrity check (no `lock.json`-equivalent for Deno here). Acceptable for Supabase edge but worth a `deno.lock`.
