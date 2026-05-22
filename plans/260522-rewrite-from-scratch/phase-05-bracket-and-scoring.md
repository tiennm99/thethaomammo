---
phase: 05
title: Bracket Generation + Live Scoring
status: pending
effort: L (7-10 days)
blocks: [06, 07]
depends_on: [03, 04]
---

# Phase 05 — Bracket + Scoring

## Context Links
- [Audit § Matches & Live Scoring](research/researcher-current-state-audit.md)
- [Audit § Risk: Bracket complexity](research/researcher-current-state-audit.md)

## Overview
**Priority:** P1 (highest behavioral risk after schema)
**Status:** pending
Generate single-elimination brackets from confirmed registrations. Auto-cascade winners + losers (third-place match for SF losers). Live realtime score updates via Supabase Realtime. Pure SQL where feasible; thin TS service layer.

## Key Insights
- Current cascade logic split across RPC + trigger + service code — DRY violation. Consolidate to ONE RPC per concern.
- Third-place match: losers of SF auto-advance. Trigger on match `status = completed` checks SF status and inserts third-place match if both SF done.
- Byes: when registrant count not power of 2, top seeds get byes — first round has fewer matches.
- Realtime saturation risk: `/live` page subscribes broadly. Scope subscription to single tournament+event.
- Withdrawal mid-tournament: auto-advance opponent. Out-of-scope MVP? Decide at planning — defer.

## Requirements

### Functional
- Admin clicks "Generate bracket" on event → matches created.
- Seeding: random for MVP (configurable later).
- Byes handled when count not power of 2.
- Winner auto-advances to next round match.
- SF losers auto-create third-place match when both SF complete.
- Referee enters set scores via admin UI → match status updates.
- Live page (`/live`) shows all in-progress matches across tournament.
- Live page updates within 2s of score change.
- Print bracket view available.

### Non-Functional
- Bracket gen RPC < 1s for ≤ 64 athletes.
- Realtime channel: 1 per tournament+event, not per match.
- Cascade trigger idempotent (re-applying same final state = no-op).

## Architecture

```
Admin UI "Generate bracket"
   │
   ▼
RPC thethaomammo.generate_event_bracket(event_id, seed text default 'random')
   │
   ├─ select confirmed registrations → array
   ├─ shuffle (deterministic by seed text)
   ├─ compute rounds = ceil(log2(n))
   ├─ insert N-1 matches across rounds (R1 has matches w/ participants; later rounds empty pending advancement)
   ├─ insert match_participants for R1 (byes if any)
   └─ return bracket_id summary

Referee enters score:
INSERT INTO match_scores …

Trigger after_match_score_insert():
   recompute totals; if 2-of-3 sets won → set matches.status='completed', winner_participant_id
   IF round = SF AND third_place not yet → INSERT third-place match w/ losers
   IF next_round_match exists → UPDATE match_participants for next round w/ winner

Live page subscribes:
supabase.channel('tournament:<id>')
  .on('postgres_changes', { event: '*', schema:'thethaomammo', table:'matches', filter:`tournament_id=eq.<id>` })
  .on('postgres_changes', { event: 'INSERT', schema:'thethaomammo', table:'match_scores', filter:`match_id=in.(…)` })
```

## Related Code Files (to create)

| Path | Purpose |
|---|---|
| `supabase/migrations/000013_bracket_rpc.sql` | `generate_event_bracket` + helpers |
| `supabase/migrations/000014_match_cascade.sql` | trigger `_match_cascade_on_score()` + third-place logic |
| `supabase/migrations/000015_rollback_rpc.sql` | `cascade_rollback_match(match_id)` admin escape hatch |
| `src/lib/bracket/seeding.ts` | (optional) host-side seeding util if SQL too gnarly |
| `src/app/admin/tournaments/[id]/events/[eid]/bracket/page.tsx` | bracket admin UI |
| `src/app/admin/tournaments/[id]/events/[eid]/bracket/generate-action.ts` | server action calling RPC |
| `src/app/admin/matches/[id]/scoring/page.tsx` | referee scoring UI |
| `src/app/admin/matches/[id]/scoring/score-action.ts` | server action: insert score |
| `src/app/live/page.tsx` | RSC shell, list tournaments |
| `src/app/live/[tournamentId]/page.tsx` | live page (client component for realtime) |
| `src/components/live/matches-realtime.tsx` | subscribes to channel |
| `src/components/bracket/bracket-tree.tsx` | render bracket SVG/HTML |
| `tests/unit/bracket/cascade-rules.test.ts` | rule tests via SQL fixture |
| `tests/e2e/scoring.spec.ts` | Playwright score → realtime update |

## Implementation Steps
1. Migration `000013_bracket_rpc.sql`:
   - `generate_event_bracket(p_event_id uuid, p_seed text default 'random') returns jsonb`
   - Validates: no existing matches for event, ≥ 2 registrations.
   - Shuffles via `setseed(hashtext(p_seed) % 1.0)`.
   - Inserts matches w/ `round` 1..R, `slot` per round.
   - R1 match_participants filled; later rounds NULL.
2. Migration `000014_match_cascade.sql`:
   - Function `_match_cascade()` `returns trigger`:
     - On `match_scores` insert OR update: recompute sets won per slot.
     - If best-of-3 decided (one slot has ≥ 2 wins): update `matches.status='completed'`, `winner_participant_id`.
     - Find next-round match (same event, round+1, slot = floor(this.slot/2)); update its `match_participants` for slot `this.slot % 2`.
     - If `this.round = R-1` (SF) AND other SF also completed AND no third-place yet: insert third-place match w/ both SF losers (`third_place=true`).
   - Trigger on `match_scores` after insert/update.
3. Migration `000015_rollback_rpc.sql`:
   - `cascade_rollback_match(match_id)` — undo a completed match: clear winner, clear downstream participants if downstream not started.
4. Bracket admin UI:
   - "Generate" button → call RPC → re-render.
   - "Regenerate" button → confirm dialog → soft-delete existing matches → re-call RPC.
5. Scoring UI:
   - Pick match → show 2 participants → 3 set inputs → "Save set" inserts match_scores row.
   - Show derived match status.
6. Live page:
   - RSC fetches initial matches.
   - Client component subscribes to channel scoped by `tournament_id`.
   - Optimistic UI: on event, refetch affected match.
7. Bracket tree component: HTML/CSS grid (start simple, no SVG).
8. Print view `/print/bracket/[eventId]` — server-rendered HTML, `@media print` CSS.
9. Tests:
   - Unit: insert fixture (4 athletes, 1 event) → generate → assert 3 matches.
   - Integration: complete R1 matches → assert R2 participants populated.
   - Integration: complete SF → assert third-place match exists.
   - E2E: enter score in admin → live page reflects within 3s.

## Todo List
- [ ] `000013` bracket RPC applied
- [ ] `000014` cascade trigger applied
- [ ] `000015` rollback RPC applied
- [ ] Generate works for 2, 3, 4, 5, 8 athletes
- [ ] Byes correct for non-power-of-2
- [ ] Winner advances correctly
- [ ] Third-place created on SF completion
- [ ] Rollback restores prior state
- [ ] Realtime channel scoped per tournament
- [ ] Live page renders < 2s after score
- [ ] Print view paginates
- [ ] Tests cover cascade rules

## Success Criteria
- Bracket for 8 athletes: 7 matches across 3 rounds + 1 third-place.
- Bracket for 5 athletes: 3 byes, 4 matches across 3 rounds + 1 third-place.
- Score insertion triggers exactly the right downstream updates (assertions in test).
- Live page p95 update latency < 3s.
- Rollback restores match + clears downstream cleanly.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cascade trigger infinite loop | M | H | Guard: trigger only on `status` change to completed, never updates `match_scores` |
| Race: 2 referees score same match | M | M | Optimistic concurrency via `match_scores.recorded_at` check or row lock |
| Third-place duplicated | M | M | Unique partial index `(event_id, third_place) where third_place = true` |
| Realtime saturation | M | M | Scope channel by tournament; throttle UI refetch (debounce 500ms) |
| Bracket gen on already-generated event | M | M | RPC checks `count(matches) = 0` precondition |
| Off-by-one in rounds/slots | H | M | Property tests: for n ∈ {2..32}, total matches = n-1 (single elim) |
| Withdrawal mid-tournament not handled | H | L | Document as known limitation; admin can manually advance |

## Backwards Compatibility / Migration
- [Phase 10](phase-10-data-migration.md) does NOT import matches/scores/bracket data — scope is auth.users + athletes only. No skip-replay or GUC mechanism needed.
- Bracket gen RPC MUST refuse to run on events that already have matches (`count(matches) = 0` precondition).

## Rollback
- `drop trigger _match_cascade_on_score on match_scores;`
- `drop function generate_event_bracket;` then reapply prior.
- Per-match: `cascade_rollback_match(id)`.

## Test Matrix
- Unit: pure helpers (slot math) — vitest.
- DB integration: pgTAP-style or raw SQL tests in `tests/db/bracket.spec.ts` via vitest + pg.
- E2E: Playwright score → live page assertion.

## Security
- Only `referee` (event-scoped) or `admin` can insert `match_scores`. RLS enforces.
- Realtime channel: Supabase respects RLS for `postgres_changes`. Verify referee scoping does not leak other tournaments.
- Rollback RPC: admin-only. RLS via `shared.has_role('thethaomammo','admin')`.

## Next Steps
Phase 06 admin UI consumes RPCs. Phase 07 public live page polished.

## Unresolved Questions
- Best-of-3 vs best-of-1 vs best-of-5 — configurable per event? (Default: best-of-3 fixed.)
- Walkover handling? (Default: admin marks via `cascade_rollback_match` + manual status set; revisit if needed.)
- Double elimination bracket support? (Default: out-of-scope MVP.)
- Group stage + knockout? (Default: out-of-scope MVP.)
