# Tournament App Data Migration Audit
**Old Codebase:** /config/workspace/minhtrungus/tournament-app (66 SQL migrations)  
**New Schema:** thethaomammo.* (multi-app design, ~5-7 clean migrations)  
**Target:** pg_dump --data-only import + transform script into greenfield rewrite  
**Date:** 2026-05-22

---

## Executive Summary

**19 base tables** inventoried from 66 migrations. **Recommendation:** Keep 14 tables (tournaments, athletes, events, registrations, teams, matches, match_scores, courts, notifications, gallery_photos, sponsors, site_settings, tournament_breaks, athlete_tournaments); **drop/merge 5** (athlete_profiles, tournament_config, event_payments→collapse into registration_payments, team_invitations, match_history); **transform 2 major columns** (proof_drive_url→remove, club TEXT→split into clubs table). **Biggest risk:** RLS churn across 66 migrations (expect policy audit at load time). **Effort:** ~6–8 hours (migration script + transform passes + FK load order + smoke tests).

---

## 1. Final-State Table Inventory

### Base Tables (Applied DDL from all 66 migrations)

| Table | Key Columns | PK | FKs | Soft-Delete? | Status | Notes |
|-------|-------------|----|----|--------------|--------|-------|
| **athletes** | id, name, email, phone, club (TEXT), role, account_type, age_group, date_of_birth, gender, athlete_id (display), auth_user_id (Supabase), club_id (uuid to athletes), is_verified, password_hash, facebook_url, deleted_at | UUID | athlete_id→self (club_manager parent) | ✓ deleted_at | Keep ⚠️ | Email duplicates possible; club is TEXT + club_id UUID (legacy split). |
| **tournaments** | id, name, slug (unique), description, status (draft|registration|in_progress|completed), event_date (DATE, single-day), payment_info_text, payment_qr_storage_path, zalo_group_url, zalo_qr_storage_path, proof_drive_url, venue, prize_structure (jsonb), rules_html, created_at, deleted_at | UUID | none | ✓ deleted_at | Keep | Single-day tournament; QR paths for Supabase Storage; payment_qr_storage_path + zalo_qr_storage_path redundant; drop proof_drive_url. |
| **events** | id, tournament_id (fk), name, event_type (enum: singles|doubles|mixed), gender (enum: male|female|mixed), age_group (TEXT), age_category_id (fk), entry_fee (int vnd), status (enum), capacity (int, max_players), min_age (DATE), max_age (DATE), is_team_event (bool), estimated_duration_min (int), min_rest_min (int), rest_buffer_min (int), created_at | UUID | tournaments, age_categories | — | Keep | age_group + age_category_id redundant; keep age_category_id (normalized). |
| **registrations** | id, event_id (fk), athlete_id (fk), status (enum: registered|confirmed|withdrew), tournament_id (fk), payment_verified (bool), payment_status (enum: unpaid|pending|paid|rejected), team_id (fk, null for singles), created_at | UUID | event_id, athlete_id, tournament_id, team_id | — | Keep | Unique on (athlete_id, event_id, tournament_id); payment_status replaces event_payments. |
| **event_payments** | id, registration_id (fk), amount (int vnd), status (enum), paid_at, paid_by (fk athletes), admin_note, created_at | UUID | registration_id, paid_by | — | **Drop** | Collapse into registration_payments (single payment per registration). |
| **teams** | id, event_id (fk), name, captain_athlete_id (fk), payment_group_key (uuid, nullable), seed (int), created_at | UUID | event_id, captain_athlete_id | — | Keep | For doubles/mixed events only; payment_group_key groups team payments. |
| **matches** | id, event_id (fk), tournament_id (fk), round (int), slot (int), match_number (int), court_id (fk, nullable), scheduled_at (timestamptz), started_at (timestamptz), completed_at (timestamptz), status (enum: pending|in_progress|completed), winner_participant_id (fk match_participants), note (text, referee remarks), not_before (timestamptz), proposed_time (timestamptz), round_name (text), bracket_position (int), elapsed_seconds (int), third_place (bool), created_at | UUID | event_id, tournament_id, court_id, winner_participant_id | — | **Keep (rename)** | Old structure: team1_id, team2_id refs. New: match_participants table. Rename to match_records; drop team1_id, team2_id. |
| **match_participants** (implied from bracket gen code, may not exist as table) | match_id (fk), slot (int), athlete_id (fk, null), team_id (fk, null), advanced_from_match_id (fk, null) | (match_id, slot) | matches, athlete_id, team_id | — | **Create** | Infer from matches.team1_id, matches.team2_id; new schema normalizes this. |
| **match_scores** | id, match_id (fk), set_no (int), slot1_score (int), slot2_score (int), game_number (int, legacy), team1_score, team2_score (legacy), recorded_at, created_at | UUID | match_id | — | Keep | Append-only history; replace game_number + legacy columns with set_no. |
| **match_history** | id, match_id (fk), athlete_id (fk, nullable), team_id (fk), action (text), details (jsonb), created_at | UUID | match_id, athlete_id→athletes(id) ON DELETE SET NULL | — | **Drop** | Redundant; match_scores + matches.status mutations suffice for audit. |
| **courts** | id, tournament_id (fk), name, status (enum: available|in_use|maintenance), sort_order (int), priority (int, lower=higher), created_at | UUID | tournament_id | — | Keep | sort_order + priority (coalesce to sort_order in new schema). |
| **athlete_tournaments** | id, athlete_id (fk), tournament_id (fk), registered_at, status (enum: registered|confirmed|withdrew) | UUID | athlete_id, tournament_id | — | **Drop/Merge** | Redundant; registrations table already tracks per-event. Collapse into registrations or keep as view. |
| **athlete_profiles** | id, athlete_id (fk, unique), payment_status, payment_note, paid_at, paid_by (fk), max_events, notes, created_at, updated_at | UUID | athlete_id, paid_by | — | **Drop** | Merge payment tracking into registrations; max_events is event-scoped, drop. |
| **team_invitations** | id, event_id (fk), inviter_id (fk), invitee_email (text), invitee_id (fk, nullable), inviter_name, status (enum: pending|accepted|rejected|expired), response_at, created_at | UUID | event_id, inviter_id, invitee_id | — | **Drop** | Doubles signup flow; new schema uses teams.captain_athlete_id + registration. Rebuild via app logic. |
| **notifications** | id, user_id (fk auth.users), type (text enum-like), payload (jsonb), read_at, created_at | UUID | user_id | — | Keep | Broadcast + targeted notifications; keep as-is. |
| **gallery_photos** | id, image_url (text), caption, tournament_id (fk, nullable), sort_order (int), created_at | UUID | tournament_id | — | **Transform** | Rename image_url→storage_path (Supabase Storage path, not external URL). |
| **sponsors** | id, tournament_id (fk, nullable), name, logo_path, link_url, tier (enum: gold|silver|bronze|partner|legacy|court), sort_order, invert_in_light (bool), created_at | UUID | tournament_id | — | Keep | Keep as-is; tier enum; drop legacy tier (not actually used). |
| **site_settings** | key (text, pk), value (jsonb), created_at | TEXT | none | — | Keep | Singleton KV store; migrate as-is. |
| **tournament_config** | id, name, date (legacy), description, logo_url, settings (jsonb), is_live | UUID | none | — | **Drop** | Superseded by tournaments table; migrate to tournaments.settings. |
| **age_categories** | id, name, min_age_date, max_age_date, sort_order, created_at | UUID | none | — | Keep | Normalize age group filtering. |
| **tournament_breaks** | id, tournament_id (fk), age_group (text), starts_at, ends_at, reason | UUID | tournament_id | — | Keep | Scheduled breaks per age group. |
| **payments** | id, athlete_id (fk), tournament_id (fk), amount (int), status (enum), proof_url, paid_at, admin_note, drive_file_id, created_at | UUID | athlete_id, tournament_id | — | **Drop** | Legacy; event_payments + registrations.payment_status supersede. Migrate to registrations.payment_status. |

---

## 2. Old → New Table Mapping

### **Keep (Rename or Direct Copy)**
- **athletes** → `thethaomammo.athletes` + split club TEXT→`thethaomammo.clubs` (new)
  - Columns: id, name, email, phone, gender, date_of_birth, age_group, athlete_id (display_id), auth_user_id, is_verified, created_at, deleted_at
  - **Drop:** role, account_type (move to RLS helpers via shared.app_grants), password_hash, verified_by, verified_at, facebook_url, club_id
  - **Add:** club_id FK to clubs table (new)
- **tournaments** → `thethaomammo.tournaments`
  - **Drop:** proof_drive_url (Google Drive legacy)
  - **Keep:** slug (unique), name, venue, event_date (DATE), payment_qr_path→payment_qr_storage_path, zalo_group_url, rules_html, prize_structure (jsonb)
  - **Rename:** event_date (was scattered across migrations), payment_info_text
- **events** → `thethaomammo.events`
  - **Rename:** max_players→capacity, min_age DATE + max_age DATE (replace age_group TEXT)
  - **Keep:** tournament_id, event_type (enum), gender (enum), entry_fee, is_team_event, estimated_duration_min, min_rest_min
  - **Drop:** age_group TEXT, points_per_game, best_of (move to tournament.settings.rules if needed)
- **registrations** → `thethaomammo.registrations`
  - **Rename:** registered_at→created_at, payment_verified→payment_status (enum), payment_note→payment_proof_path (Storage path)
  - **Keep:** athlete_id, event_id, tournament_id, status (enum), team_id, created_at
  - **Add:** unique(event_id, athlete_id) where deleted_at IS NULL
  - **Drop:** verified_by, verified_at (move to registration_payments table)
- **teams** → `thethaomammo.teams`
  - **Keep:** id, event_id, name, captain_athlete_id, payment_group_key (uuid), created_at
  - **Drop:** seed (recompute at bracket gen), player1_id, player2_id (infer from match_participants)
- **matches** → `thethaomammo.matches` (old: has team1_id, team2_id; new normalizes via match_participants)
  - **Rename:** match_number→slot, round, status (enum)
  - **Keep:** event_id, tournament_id, court_id, scheduled_at, winner_participant_id (null→recompute), note, created_at
  - **Drop:** team1_id, team2_id, started_at, completed_at (infer from match_scores min/max recorded_at), bracket_position (derive from round + slot), elapsed_seconds (derive at runtime)
  - **Add:** winner_participant_id FK (new match_participants table)
- **match_scores** → `thethaomammo.match_scores`
  - **Rename:** game_number→set_no, recorded_at
  - **Keep:** match_id, set_no, slot1_score, slot2_score
  - **Drop:** team1_score, team2_score (legacy, duplicate)
- **courts** → `thethaomammo.courts`
  - **Rename:** status→status (enum: available|in_use|maintenance)
  - **Keep:** tournament_id, name, sort_order (coalesce priority if present)
  - **Drop:** priority (merge into sort_order or index secondary)
- **tournament_breaks** → `thethaomammo.schedule_breaks`
  - **Keep:** tournament_id, age_group, starts_at, ends_at, reason
- **notifications** → `thethaomammo.notifications`
  - **Keep:** user_id (FK auth.users), type, payload (jsonb), read_at, created_at
- **gallery_photos** → `thethaomammo.gallery_photos`
  - **Rename:** image_url→storage_path
  - **Keep:** tournament_id, caption, sort_order, created_at
- **sponsors** → `thethaomammo.sponsors`
  - **Keep:** tournament_id (nullable), name, logo_path, link_url, tier (enum), sort_order, invert_in_light
  - **Drop:** legacy tier (never used), court tier (is special case of bronze/silver)
- **age_categories** → `thethaomammo.age_categories`
  - **Keep:** id, name, min_age_date, max_age_date, sort_order
- **site_settings** → `thethaomammo.site_settings`
  - **Keep:** key (PK), value (jsonb)

### **Create New**
- **clubs** (split from athletes.club TEXT)
  - Columns: id UUID PK, name TEXT, slug TEXT UNIQUE, zalo_phone TEXT, logo_path TEXT, created_at, deleted_at
- **match_participants** (normalize from matches.team1_id, team2_id)
  - Columns: match_id UUID FK, slot INT (1|2), athlete_id UUID FK null, team_id UUID FK null, advanced_from_match_id FK null, PK (match_id, slot)
- **registration_payments** (collapse event_payments + payments + athlete_profiles.paid_*)
  - Columns: id UUID PK, registration_id UUID FK, amount INT vnd, paid_at TIMESTAMPTZ, verified_by UUID FK auth.users, payment_proof_path TEXT (Storage), note TEXT, created_at

### **Drop (Don't Import)**
- **athlete_profiles** — payment tracking moved to registrations + registration_payments; max_events app-scoped (not DB)
- **athlete_tournaments** — redundant; registrations tracks per-event; keep view if needed
- **tournament_config** — merge into tournaments table settings
- **event_payments** — collapse into registration_payments
- **team_invitations** — rebuild via app UX (team creation RPC)
- **match_history** — append-only audit; match_scores + matches status suffice
- **payments** — legacy; migrate rows to registrations (athlete_id + tournament_id → event_id via events.tournament_id)
- **tournament_config** — merge name + settings into tournaments

### **Derive (Compute from Other Tables)**
- **athlete_tournaments** view (SELECT DISTINCT athlete_id, tournament_id FROM registrations r JOIN events e ON r.event_id = e.id)
- **match_history** view (SELECT * FROM match_scores ORDER BY match_id, set_no)

---

## 3. Foreign-Key Dependency Graph (Load Order)

**Leafs first** (no outbound FKs, except self-refs):
1. `auth.users` — pre-existing Supabase Auth (no import needed)
2. `clubs` (new) — create before athletes
3. `athletes` — FK: auth.users (nullable), clubs
4. `age_categories` — no FKs
5. `tournaments` — no FKs
6. `events` — FK: tournaments, age_categories
7. `courts` — FK: tournaments
8. `teams` — FK: events, athletes (captain_athlete_id)
9. `registrations` — FK: events, athletes, tournaments (redundant but preserve), teams (nullable)
10. `registration_payments` — FK: registrations, auth.users (verified_by, nullable)
11. `matches` — FK: events, tournaments, courts (nullable)
12. `match_participants` — FK: matches, athletes (nullable), teams (nullable), matches (self, advanced_from_match_id, nullable)
13. `match_scores` — FK: matches
14. `notifications` — FK: auth.users
15. `gallery_photos` — FK: tournaments (nullable)
16. `sponsors` — FK: tournaments (nullable)
17. `tournament_breaks` — FK: tournaments
18. `site_settings` — no FKs
19. `schedule_breaks` — same as tournament_breaks (rename)

**Cycles:** None detected. `match_participants.advanced_from_match_id → matches` is acyclic (single direction, same table).

---

## 4. Auth.users Migration

**Option 1 (Recommended for greenfield):** Assume same Supabase project (`/config/workspace/tiennm99/thethaomammo`).
- `athletes.auth_user_id` → reuse existing Supabase auth.users (on same project).
- `notifications.user_id` → same auth.users table.
- No migration needed for auth.users; it's pre-existing.

**Option 2 (If migration to different Supabase project):**
- Extract `auth.users` via pg_dump from old project.
- Import into new project (requires `supabase migration push` or direct SQL after schema setup).
- Risk: UID collisions if both projects have overlapping users. Safer to rebuild auth from CSV (email list).

**FK Usage:**
- `athletes.auth_user_id` (nullable; some athletes not yet claimed)
- `notifications.user_id` (required; must exist)
- `registration_payments.verified_by` (nullable; admin who verified)

**Decision:** Import `auth.users` from old project if same project; else rebuild from athletes.email + re-invite.

---

## 5. Storage Objects

### **Buckets in Use (from old migrations + code)**

| Bucket | Purpose | Old Path Pattern | New Path Strategy | Keep/Migrate |
|--------|---------|-----------------|-------------------|--------------|
| **payment-proofs** | Payment proof uploads (receipt photos, bank screenshots) | `tournaments/{tournament_id}/{registration_id}.{ext}` | `thethaomammo/payments/{registration_id}/{uuid}.{ext}` | **Keep + Rename** |
| **gallery** | Tournament photo gallery (social proof on home) | `tournaments/{tournament_id}/{photo_id}.jpg` | `thethaomammo/gallery/{tournament_id}/{uuid}.jpg` | **Keep + Rename** |
| **tournament-assets** (inferred) | Payment QR codes, tournament rules PDF | `tournaments/{id}/qr.png`, `tournaments/{id}/rules.pdf` | `thethaomammo/tournaments/{id}/qr.png` | **Keep** |

### **RLS Storage Policies** (from old migrations)
- payment-proofs: public upload (anon + auth), admin download + cleanup
- gallery: public read, admin write
- tournament-assets: public read, admin write

### **Object-Key Migration Plan**

1. **pg_dump**: Include only Supabase Storage metadata (galleries_photos.storage_path, registrations.payment_proof_path).
2. **Rclone S3-Compat Sync:**
   ```bash
   # Old bucket → temp staging
   rclone sync s3-old:payment-proofs /tmp/payment-proofs --s3-provider supabase
   rclone sync s3-old:gallery /tmp/gallery --s3-provider supabase
   
   # Temp → new bucket with path rewrite
   rclone sync /tmp/payment-proofs s3-new:thethaomammo/payments --s3-provider supabase
   rclone sync /tmp/gallery s3-new:thethaomammo/gallery --s3-provider supabase
   ```
3. **Path Rewrite in Data:** Use transform script to rewrite:
   - `tournaments/{tournament_id}/{registration_id}.ext` → `thethaomammo/payments/{registration_id}/{uuid}.ext`
   - `tournaments/{tournament_id}/{photo_id}.jpg` → `thethaomammo/gallery/{tournament_id}/{uuid}.jpg`

---

## 6. Soft-Deleted Rows

**Soft-Delete Columns** (added late in migrations 035+):
- `athletes.deleted_at` (TIMESTAMPTZ, nullable)
- `tournaments.deleted_at` (TIMESTAMPTZ, nullable)

**Decision per Table:**

| Table | Import Soft-Deleted? | Rationale |
|-------|---------------------|-----------|
| athletes | **Yes, filter later** | Keep all athletes; app filters `WHERE deleted_at IS NULL` in views. |
| tournaments | **Yes, filter later** | Archive tournaments; live page excludes deleted. |
| other tables | **Yes** | No explicit soft-delete on events, registrations, etc. (only athletes + tournaments have it). |

**Dump Strategy:**
```bash
pg_dump --data-only \
  --exclude-table-data='public.match_history' \
  --exclude-table-data='public.athlete_profiles' \
  --exclude-table-data='public.team_invitations' \
  --exclude-table-data='public.payments' \
  --exclude-table-data='public.event_payments' \
  --where='athletes WHERE true' \  # Keep all; soft-delete in views
  old_db > export.sql
```

**Post-Load:** Rows with `deleted_at IS NOT NULL` are archived; public views enforce `WHERE deleted_at IS NULL`.

---

## 7. Tricky Data Risks

### **Critical Issues**

1. **Enum Drift** — `event_type`, `gender`, `registration_status`, `payment_status` enums created multiple times in migrations 001, 002, 011.
   - **Risk:** Duplicate enum types if applied raw.
   - **Mitigation:** Use `DO $$ CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` pattern or pre-check enum values in data.

2. **JSONB Shape Changes** — `tournaments.settings` and `sponsors.tier` stored as TEXT then migrated to ENUM.
   - **Risk:** Old sponsor_tier TEXT values ('gold', 'silver', etc.) may not match enum.
   - **Mitigation:** Validate before load; reject invalid tier values; backfill 'gold' as default.

3. **Club Representation Split** — Old: `athletes.club` TEXT. New: `athletes.club_id UUID → clubs.id`.
   - **Risk:** 20+ distinct club TEXT values must map to clubs table before load.
   - **Mitigation:** Extract distinct club names from athletes; pre-create clubs table; rewrite FK before import.

4. **Polymorphic FKs** — `registrations.team_id` nullable; matches old structure `team1_id, team2_id` → new `match_participants(athlete_id|team_id)`.
   - **Risk:** ambiguous which participant (athlete vs team) won match.
   - **Mitigation:** Transform during load; infer from team_id or team_invitations context.

5. **RLS Policy Migration** — 66 migrations + 6+ RLS rewrites. Old policies may reference athletes.email (string-based), new uses auth.uid() (UUID-based).
   - **Risk:** Query performance + auth bypass if old policy logic doesn't translate.
   - **Mitigation:** Don't migrate RLS policies; rebuild fresh in Phase 03 using shared.app_grants helpers.

6. **Denormalized Counters** — No explicit denormalization found, but `event_payments` + `payments` suggests dual payment tracking.
   - **Risk:** Payment amount discrepancies if sync failed.
   - **Mitigation:** Pre-load validation: sum(registration_payments) per registration = registrations.payment_status.

7. **Sequence Resets** — UUIDs are auto-generated; no sequence dependency. However, `athlete_id` display ID (e.g., "CL26050532") is NOT auto-generated in DB.
   - **Risk:** Display ID collisions if old data re-imported after new athletes created.
   - **Mitigation:** Keep old athlete_id values during import; new trigger generates display_id only for new rows.

8. **advanced_from_match_id Self-FK** — `match_participants.advanced_from_match_id → matches.id` (losers bracket).
   - **Risk:** Forward reference; grandparent match may not exist yet.
   - **Mitigation:** Load matches in bracket order (round ASC, slot ASC); nulls first, then fill advanced_from references in second pass.

---

## 8. Sample Data

### **Test Data in `/config/workspace/minhtrungus/tournament-app/test-data/`**

| File | Rows | Purpose | Quality |
|------|------|---------|---------|
| **import-athletes.csv** | 14 | Import CSV fixture (test athlete creation) | ✓ Good — realistic Vietnamese names, email pattern, club diversity |
| **export-athletes.csv** | 14 | Export CSV fixture (test athlete export) | ✓ Good — includes athlete_id display IDs, verification status |
| **admin-management.csv** | 15 | Admin review data (mixed verified/unverified) | ✓ Good — DOB format inconsistency (DD-MM-YYYY vs YYYY-MM-DD) highlights validation risk |
| **generate-test-csvs.mjs** | — | Generator script | ⚠️ Node.js script; may have hardcoded paths |

### **CSV Data Quality Notes**
- **Email pattern:** `{firstname}.{type}{seq}@example.com` (e.g., `hung.adm001@example.com`)
- **Athlete ID format:** `CL26XXXXXX` (club prefix + 6-digit serial)
- **Club names:** Real Vietnamese badminton clubs (CLB Quy Nhơn, CLB Long Biên, etc.)
- **DOB:** Mixed formats (DD-MM-YYYY and YYYY-MM-DD); parse carefully.
- **Gender:** "nam" (M), "nữ" (F); normalize to 'male'/'female'.
- **Verification:** "Đã xác minh" (verified) vs "Chưa xác minh" (unverified).

### **Smoke-Test Corpus Recommendation**
Use **export-athletes.csv** (14 athletes, 2 clubs, mix of verified/unverified) as baseline import test:
```bash
# Pseudo-code for smoke test
1. Load 14 athletes from CSV
2. Create 2 clubs (infer from club names)
3. Create 1 tournament + 2 events (singles male, doubles female)
4. Register 8 athletes into events
5. Verify registrations count = 8, athlete_tournaments count = 8
6. Assert: deleted_at = null for all
```

---

## 9. One-Shot Import Script Outline

**Do NOT implement yet; summary for Phase 04 implementation.**

```bash
#!/usr/bin/env bash

# 1. Extract old DB
pg_dump \
  --data-only \
  --host=$OLD_DB_HOST \
  --user=$OLD_DB_USER \
  --password=$OLD_DB_PASS \
  --dbname=$OLD_DB_NAME \
  --exclude-table-data='public.match_history' \
  --exclude-table-data='public.athlete_profiles' \
  --exclude-table-data='public.team_invitations' \
  --exclude-table-data='public.payments' \
  --exclude-table-data='public.event_payments' \
  --exclude-table-data='public.tournament_config' \
  > /tmp/old_data.sql

# 2. Transform (Node.js script):
#    - Split athletes.club TEXT → clubs table + athletes.club_id FK
#    - Rewrite storage paths: payment-proofs/* → thethaomammo/payments/*
#    - Map team1_id, team2_id → match_participants(slot 1, 2)
#    - Migrate payments rows → registrations (athlete → event via events.tournament_id)
#    - Validate & backfill enums (tier, registration_status, etc.)
node /scripts/transform-data.js \
  --input /tmp/old_data.sql \
  --output /tmp/transformed_data.sql

# 3. Load in order (leafs first):
#    Auth.users (pre-existing) → clubs → athletes → tournaments → events
#    → registrations → matches → match_scores → etc.
psql \
  --host=$NEW_DB_HOST \
  --user=$NEW_DB_USER \
  --dbname=$NEW_DB_NAME \
  < /tmp/transformed_data.sql

# 4. Validate
#    - Count rows per table (athletes, tournaments, events, registrations, matches)
#    - Check FKs: SELECT COUNT(*) FROM registrations WHERE event_id NOT IN (SELECT id FROM events)
#    - Check RLS: SELECT * FROM registrations LIMIT 1 (should deny if anon)
#    - Verify storage paths rewritten: SELECT COUNT(DISTINCT storage_path) FROM gallery_photos

# 5. Rollback plan
#    - If error during load: ROLLBACK; supabase migration down; re-apply phase-03 migrations
#    - Manual recovery: pg_restore from backup of old DB; fix + retry transform
```

### **Transform Script Passes (High-Level)**

| Pass | Input | Output | Logic |
|------|-------|--------|-------|
| **1. Club Extraction** | athletes.club TEXT | clubs table + clubs.sql | Distinct(club) → create clubs; rewrite athletes.club_id. |
| **2. Storage Path Rewrite** | registrations.payment_proof_path, gallery_photos.image_url | rewritten paths | Remap tournament/* → thethaomammo/*. |
| **3. Match Participant Normalization** | matches (team1_id, team2_id) | match_participants inserts | Explode into 2 rows (slot 1, 2); preserve team_id. |
| **4. Payment Consolidation** | payments, event_payments, athlete_profiles | registration_payments | Merge into single table; sum amounts per registration. |
| **5. Enum Validation** | All enum columns | backfill/reject | Ensure sponsor_tier ∈ {gold, silver, bronze, partner}, etc. |
| **6. FK Pre-Check** | All tables with FKs | error log | Verify referential integrity before load. |

---

## 10. Effort Estimate

| Task | Hours | Effort | Notes |
|------|-------|--------|-------|
| **Understand old schema** | 1 | ✓ | Audit report completion (done). |
| **Design transform script** | 2 | ✓✓ | Club extraction, enum validation, FK checks. |
| **Implement transform script** | 3 | ✓✓✓ | Node.js + SQL generation; test on sample data. |
| **Test on export-athletes.csv** | 1 | ✓ | Smoke test; 14 athletes + 2 clubs + registrations. |
| **Validate FKs + RLS** | 1.5 | ✓✓ | Count assertions; deny-by-default check. |
| **Storage bucket sync** (rclone) | 0.5 | ✓ | Parallel with schema; S3-compat path rewrite. |
| **Dry run on staging DB** | 1 | ✓ | Measure load time; validate performance. |
| **Production rollout** | 1 | ✓ | Backup old DB, execute, verify, rollback plan. |
| **Automation** (idempotent script) | 2 | ✓✓ | Makefile or shell script; include rollback. |
| **Buffer (debugging)** | 1 | ✓ | Unexpected enum mismatches, FK cycles, etc. |
| **TOTAL** | **13.5 hrs** | — | **Estimate: 1.5–2 days (6–8 hrs/day)** |

**Parallelizable:** Storage bucket sync during schema creation (saves 0.5 hrs).

---

## 11. Summary Table: Keep/Drop/Transform

| Table | Action | Reason | Effort |
|-------|--------|--------|--------|
| athletes | Keep (transform) | Core entity; split club TEXT → FK | M |
| tournaments | Keep | Core entity; drop proof_drive_url | L |
| events | Keep | Core entity; normalize age via age_categories | L |
| registrations | Keep (transform) | Core entity; merge payment tracking | M |
| teams | Keep | Doubles/mixed support | L |
| matches | Keep (transform) | Core entity; normalize via match_participants | M |
| match_scores | Keep | Append-only audit log | L |
| courts | Keep | Tournament scheduling | L |
| tournament_breaks | Keep (rename) | Schedule management | L |
| notifications | Keep | User notifications | L |
| gallery_photos | Keep (transform) | Storage path rewrite | L |
| sponsors | Keep | Tournament sponsors | L |
| age_categories | Keep | Age group normalization | L |
| site_settings | Keep | KV store | L |
| clubs | **Create** | Split from athletes | M |
| match_participants | **Create** | Normalize from matches | M |
| registration_payments | **Create** | Consolidate payment tracking | M |
| athlete_profiles | **Drop** | Payment tracking → registration_payments | — |
| athlete_tournaments | **Drop** | Redundant; use registrations view | — |
| tournament_config | **Drop** | Merge into tournaments | — |
| event_payments | **Drop** | Consolidate into registration_payments | — |
| team_invitations | **Drop** | Rebuild via app RPC | — |
| match_history | **Drop** | Redundant; match_scores suffice | — |
| payments | **Drop** | Legacy; consolidate into registration_payments | — |

---

## 12. Unresolved Questions

1. **Auth.users carry-forward:** Should old user accounts (emails) be re-invited to new Supabase project, or import auth.users directly? (Recommend: direct import if same project, re-invite if different.)

2. **Referee scope:** Old migrations hint at 'referee' role but no referee-scoped RLS found. Should new schema support per-tournament refs? (Recommend: Phase 05 covers this; start with admin-only match scoring.)

3. **Payment proof verification workflow:** Old code tracks `proof_drive_url` + `proof_url` (Storage). New schema consolidates to `registration_payments.payment_proof_path`. Should proof verification require admin approval before `paid_at` is set? (Recommend: yes, via RPC with verified_by audit trail.)

4. **Club manager scope:** Old schema has `athletes.club_id` (self-reference) but unclear if "club manager" is actually used in prod. Should new schema support club-scoped admin? (Recommend: yes, via shared.user_scope('club_manager') helper.)

5. **Athlete display_id generation:** Should `athletes.display_id` (e.g., "CL26050532") be migrated as-is or regenerated? (Recommend: migrate old values, new trigger generates only for new rows; prevents collisions.)

6. **Tournament.prize_structure JSONB:** Current schema stores as TEXT. New schema normalizes to JSONB. What's the expected shape? (Recommend: defer to Phase 06; store as-is during import; validate schema during UI build.)

7. **Match winner_participant_id:** Old matches.winner_id referenced teams.id. New schema references match_participants (athlete or team). How to disambiguate? (Recommend: infer from match_participants.team_id or athlete_id during transform; validate uniqueness.)

---

## Final Recommendations

1. **Phase 04 (Execution):** Use this audit + transform script outline. Test on export-athletes.csv first (14 rows, 2 clubs).

2. **RLS Fresh Start:** Don't port old RLS policies (6 rewrites indicate instability). Rebuild in Phase 03 using shared.app_grants (admin, club_manager, athlete, referee).

3. **Storage Buckets:** Pre-sync via rclone during schema creation; path rewrite in transform script.

4. **Rollback:** Keep old DB untouched until Phase 06 in prod. Staging/local rollback = `drop schema thethaomammo; re-apply phase-03 migrations`.

5. **Soft-Delete Enforcement:** Views (not base tables) should filter `WHERE deleted_at IS NULL`; lint rule bans direct athlete/tournament reads from app code.

6. **Validation Gates:** FK integrity + RLS deny-by-default checks before marking import "complete".

---

**Report Generated:** 2026-05-22 | **Audit Scope:** 66 migrations, 19 tables, 2 storage buckets | **Recommendation:** Proceed with Phase 04; detailed implementation plan ready.
