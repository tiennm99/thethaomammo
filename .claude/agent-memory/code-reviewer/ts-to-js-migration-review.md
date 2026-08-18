---
name: ts-to-js-migration-review
description: Review outcome and effective checks for the 2026-08 TS-to-JS migration branch; repo invariants to preserve
metadata:
  type: project
---

TS→JS migration (branch ts-to-js-migration, reviewed 2026-08-18) passed full review: zero behavioral drift across 146 renamed pairs.

**Why:** Migration used git mv + JSDoc annotation-only edits; an earlier interrupted run forced hand-conversion of 5 files (src/lib/auth/app-slug.js, grants.js, src/server/admin/match-schedule.js, notifications.js, payments.js) — all verified line-by-line equal to main's TS.

**How to apply:** Effective mechanical checks for this repo class: (1) `git diff main:<x>.ts branch:<x>.js` per pair, filter `^[-+][^-+]`; (2) control-flow fingerprint (await/if/return/throw counts via grep -oE + uniq -c) over all rename pairs; (3) directive counts ("use client"/"use server"); (4) directive/eslint-disable count parity.

Repo invariants:
- supabase/functions/** stays TypeScript (Deno edge) and is excluded from jsconfig AND eslint globalIgnores — do not flag.
- templates.parity.test.js reads templates.js + Deno templates.ts as text; its extractNotificationTypes parses both TS union and JSDoc typedef syntax. The `@typedef {([^}]+)}` regex breaks if the NotificationType typedef ever contains nested braces.
- src/lib/notifications/templates.test.js:37 `@ts-expect-error` is pre-existing from main, not migration-added.
- ci.yml calls only npm script names — never needs edits for file renames.
