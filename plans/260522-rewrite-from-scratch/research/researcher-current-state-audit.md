# Tournament App — Current State Audit

**Codebase**: Next.js 16 + Supabase + TypeScript  
**Stack Age**: ~0.5y, actively maintained  
**Migrations**: 66 SQL files (001–043 + 20250516–20250518 batch)  
**Component Count**: 71 UI components + 71 lib utilities  
**Test Coverage**: 19 test files (vitest + Playwright)

---

## 1. Feature Inventory (by domain)

### Tournaments & Events
- List upcoming tournaments (public home page)
- Create/edit tournament (admin)
- Manage events per tournament (singles, doubles, mixed)
- Age group categorization (u13, u15, u17, u17_45, senior)
- Gender filtering (male, female, mixed)
- Tournament soft-delete (archive)
- Payment QR code + payment info storage
- Zalo group URL linking
- Prize structure definition
- Rules PDF upload

### Registration & Athletes
- Self-registration flow (public form)
- Athlete profile claim (existing athlete verification)
- Import athletes via CSV (admin)
- Manual athlete creation (admin)
- Registration status tracking (registered, confirmed, withdrew)
- Payment verification (payment_verified flag)
- Email confirmation (Resend integration)
- Athlete athlete_id display ID (e.g., "CL26050532")
- Soft-delete athlete (archive)
- Role-based accounts (athlete, club_manager, parent, admin, referee)

### Clubs & Management
- Club creation/management (admin)
- Club-scoped RLS policies
- Club manager role + club_id linking
- Zalo phone field for club contact
- Multi-club support

### Matches & Live Scoring
- Bracket auto-generation (seeding + match positioning)
- Match scoring (score_set1, score_set2, score_set3)
- Live realtime updates (match status + scores)
- Match status tracking (pending, in_progress, completed)
- Loser advancement (third-place match logic)
- Match history logging
- Match note field
- Court assignment per match
- Schedule/time slots (break management)
- Score advance triggers (auto-cascade losers to consolation)

### Courts & Scheduling
- Court management (create, assign name, status)
- Court status tracking (available, in_use, maintenance)
- Court sort order
- Schedule planner (match time allocation)
- Tournament breaks per category
- Auto court suggestion logic

### Payments & Verification
- Event-scoped entry fees
- Payment proof upload (to Supabase storage + Google Drive sync)
- Payment QR code (direct URL or Supabase storage path)
- Payment status (unpaid, pending, paid, rejected)
- Payment tracking per registration
- Google Drive folder sync (batch sync service)
- Drive file ID tracking (proof_drive_url linking)
- Team payment key (doubles team payment bundling)

### Admin Dashboards
- Athletes management page
- Clubs management page
- Events management page
- Brackets view + regeneration
- Courts management page
- Matches management + live scoring
- Registrations management
- Payments verification dashboard
- Schedule planner
- Tournament settings
- Gallery management
- Notifications dashboard
- Sponsors management
- Verification workflow
- Import/export data (CSV)

### Public Pages
- Home page (tournament listing, athlete search, sponsor carousel, marquee ads)
- Tournament detail page (/giai/[slug])
- Live scoring page (/live)
- Athlete profile claim page (/claim)
- Registration form (/dang-ky, /register)
- Athlete profile (/athlete)
- Club info page (/club)

### Print Views
- Athlete printable profile (/print/athlete/[id])
- Bracket printable view (/print/bracket/[eventId])
- Match record printable view (/print/record/[id])

### Gallery & Media
- Photo upload (tournament event gallery)
- Gallery bucket (public read, admin upload)
- Photo display on home page

### Notifications
- Notification table + system
- Types: registration_success, payment_reminder, match_reminder, team_invitation, invitation_accepted/rejected, tournament_update, bracket_generated, match_result
- Zalo notification integration (planned/partial)

### Sponsors & Marketing
- Sponsor management (admin page)
- Sponsor grid display (home page)
- Sponsor marquee carousel (live page)
- Floating ads system (marquee display control)
- Legacy sponsor tier field

### Auth & Access
- Google OAuth integration
- Email login (reset password flow)
- Session management (Supabase SSR with cookies)
- RLS policies (user claims, club managers, admins)

---

## 2. External Integrations

| Service | Purpose | Free-Tier Friendly | Status |
|---------|---------|-------------------|--------|
| **Supabase** | PostgreSQL + Auth + Realtime + Storage | ✓ (limited) | Core DB, active use |
| **Resend** | Email delivery (registration confirmations) | ✓ (100/day free) | Used in `/api/send-registration-email` |
| **Google Auth** | OAuth login (google-auth-library) | ✓ | Imported, integration unclear |
| **Google Drive** | Payment proof storage + sync | ✓ (15GB free) | Service account JWT, `/api/sync-drive` batch sync |
| **Zalo** | Notifications + group URLs | × (Business account) | URL field stored, msg integration TBD |
| **QR Code** | Payment QR storage (Supabase or external) | ✓ | Storage path tracking, no generation lib found |

---

## 3. Supabase Surface

### Migrations
**66 total migrations** covering:
- Initial schema (001)
- Registration flow + multi-tournament (002–004)
- Age group, event linking, RLS fixes (005–017)
- Soft deletes, match history, third-place logic (018–025)
- Gallery bucket, prize structure, age categories (026–029)
- Breaks per category, realtime publications (030–032)
- Unique constraints, proof drive URL, soft-delete athlete (033–035)
- RPC: `register_athlete_transaction`, `claim_athlete`, `advance_loser_to_third_place`, payment sync, cascade rollback (036–043)
- **Latest batch (2025-05-16 onwards)**: RLS helpers, RLS policies rewrite, anon payment upload, CTA settings, double registration visibility, venue field, team payment key, delete athlete fn, court sponsor tier

### Main Tables (20+)
```
athletes, athlete_profiles, athlete_tournaments, age_categories
events, event_payments
teams, team_invitations
registrations
matches, match_scores, match_history
tournaments, tournament_config, tournament_breaks
courts
payments
notifications
gallery_photos
site_settings
(implied: users from Supabase Auth)
```

### RLS Policies
- **Broad**: "Authenticated users can manage X" (athletes, events, teams, registrations, courts, matches, match_scores, tournament_config)
- **Public**: "Anyone can view" matches, events, courts, pending team invitations
- **Scoped**: Athletes view own profile, admins manage all profiles
- **Recent refactor**: RLS helpers (is_admin, get_user_club, is_club_manager) + standard/private policies (2025-05-16 batch)

### RPC Functions (8+)
- `is_admin()`, `get_user_club()`, `is_club_manager()`
- `claim_athlete(name, dob, club)` → dedup + link to existing athlete
- `register_athlete_transaction(...)` → atomic athlete creation + registration
- `advance_loser_to_third_place()` → trigger on match completion
- `handle_payment_status_sync()` → webhook-like sync
- `auto_advance_participants()` → loser bracket advancement
- `cascade_rollback_match(match_id)` → undo match + cascade updates

### Storage Buckets (2)
1. **payment-proofs** — public read, admin/anon upload (proof_url tracking)
2. **gallery** — public read, admin upload (gallery_photos linking)
3. **tournament-assets** (inferred) — payment QR code storage (payment_qr_storage_path)

### Realtime Publications (via 031–032)
- `matches` table (realtime updates for live scoring)
- `tournaments` table (status changes)
- `courts` table (availability/assignment)

---

## 4. Routing Map (src/app/)

```
/                          Home (tournaments, search, sponsors)
/(auth)/login              Google OAuth + email login
/(auth)/reset-password     Password reset flow
/admin/...                 Admin dashboard (athletes, clubs, events, brackets,
                           courts, matches, registrations, payments, schedule,
                           settings, sponsors, notifications, verification,
                           gallery, import, export, import-export)
/api/send-registration-email  Resend email dispatch
/api/sync-drive            Google Drive batch sync (payment proofs)
/api/upload-proof          Supabase storage upload (payment proof)
/api/upload-to-drive       Google Drive direct upload
/api/upload-gallery        Gallery photo upload
/athlete/[id]              Athlete public profile
/claim/                    Athlete claim form
/club/                     Club info page
/dang-ky & /register       Registration forms (same content?)
/giai/[slug]               Tournament detail page
/live/                     Live scoring broadcast
/print/athlete/[id]        Athlete printable card
/print/bracket/[eventId]   Bracket printable view
/print/record/[id]         Match record printable view
```

---

## 5. Tech Stack Beyond Core

### UI & Styling
- **UI Kit**: @base-ui/react + shadcn (buttons, cards, inputs, labels — custom CSS)
- **Animation**: framer-motion (motion components + page transitions)
- **Icons**: lucide-react (Trophy, Users, Calendar, Radio, Search, etc.)
- **CSS**: Tailwind CSS 4 + PostCSS, tw-animate-css, class-variance-authority (CVA), clsx, tailwind-merge
- **Text Editor**: TipTap (rich text, extensions: color, link, text-style, underline)
- **Toast/Notify**: Sonner (toast notifications)
- **Theme**: next-themes (dark mode support)
- **Font**: next/font (Geist, custom fonts loaded)

### State & Data
- **Server State**: @tanstack/react-query v5 (useQuery, useInvalidateQueries)
- **Realtime**: Supabase `.on()` listener (useMatchesRealtime hook for live scoring)
- **Form Handling**: Manual form + API POST (no react-hook-form detected)

### Testing
- **Unit**: vitest + @testing-library/react + @testing-library/jest-dom
- **E2E**: Playwright (@playwright/test) + jsdom (browser environment)
- **Test Runner**: `vitest run` (single run), `vitest` (watch), `playwright test` (E2E)

### Build & Dev
- **Bundler**: Next.js native (no Webpack config override found)
- **Runtime**: nodejs (API routes marked with `export const runtime = 'nodejs'`)
- **Dev Server**: next dev

### File Format Handlers
- **CSV**: admin-csv utility (import/export athletes, teams, registrations)
- **ZIP**: jszip (file bundling for export)
- **HTML Sanitization**: dompurify (user input cleaning)
- **Date Handling**: date-fns (time calculations, formatting)
- **UUID**: Supabase-native gen_random_uuid()

### Deployment-Ready
- **Image Optimization**: next/image (Image component with Supabase storage integration)
- **SEO**: next/head, sitemap.ts, robots.ts
- **Environment**: NEXT_PUBLIC_* vars for client-side Supabase config + server-only service keys

---

## 6. Risk & Complexity Flags

### High Complexity
- **RLS Policies**: 66 migrations with multiple RLS rewrites (014, 015, 016, 017, latest batch). Policy logic deeply nested (admin checks, club scoping, tournament scoping). **Risk**: Auth bypass or data leakage if RLS edge case missed.
- **Bracket Generation & Scoring**: Seeding, match positioning, loser advancement cascade, third-place logic. Multiple helper files + RPC triggers. **Risk**: Match tree corruption, infinite cascades, orphaned matches.
- **Google Drive Integration**: Service account JWT, batch sync, file dedup logic. External API dependency. **Risk**: Rate-limit hits, auth token expiry, file not found errors.
- **Realtime Scoring**: Supabase realtime pub/sub on matches + courts. Live page refresh on every score update. **Risk**: WebSocket saturation, stale state if subscription drops.
- **Payment Proof Verification**: Multi-source (Supabase storage + Google Drive sync). File tracking. Manual admin verification workflow. **Risk**: Duplicate proof claims, orphaned uploads.

### Medium Complexity
- **Athlete Claim Logic**: Dedup by name + DOB, merge profiles, transaction atomicity. **Risk**: Name collision false-positives, concurrent claims.
- **Registration Transaction**: Atomic athlete creation + registration + payment linking. **Risk**: Partial success if RPC fails mid-way.
- **Import/Export CSV**: Column mapping, data validation, batch inserts. **Risk**: Silent data loss on validation failures.
- **Tournament Slug Routing**: Unique slug per tournament, deep linking. **Risk**: Slug collision or missing tournament.

### Moderate Risk Flags
- **Manual RLS Testing**: 19 test files — unclear if RLS policies are integration-tested.
- **Soft Delete Cascades**: Athletes, tournaments soft-deleted. Query filters must include `IS NULL deleted_at`. **Risk**: Data leakage if filter missed.
- **Email Delivery**: Resend integration exists but not tested end-to-end.
- **Zalo Integration**: URL field stored, message delivery not found. **Risk**: Incomplete feature.

### Technical Debt / Simplification Candidates
- Two registration routes (`/dang-ky`, `/register`) — redundant?
- Import/export pages under admin (3 pages) — could consolidate.
- Court suggestion + schedule planner — overlapping concerns?
- Match cascade logic split across RPC, trigger, and service code.

---

## 7. Unresolved Questions

1. **Zalo notifications**: Are push messages actually sent, or just group URL stored?
2. **Google Drive service account**: How often is sync-drive endpoint called? Manual webhook or cron?
3. **QR code generation**: Which library generates payment QRs (if at all), or are they pre-generated externally?
4. **RLS test coverage**: Are RLS policies tested, or only schema + endpoints tested?
5. **Admin email verification**: Are admins email-verified, or role manually assigned in DB?
6. **Referees role**: "referee" role exists but referee-scoped admin not found. Is this feature partial?
7. **Floating ads**: What drives marquee content? Is it admin-editable or hard-coded?
8. **Import-export consolidation**: Can the three import/export pages merge, or are they intentionally separate workflows?
9. **Payment webhook**: Is handle_payment_status_sync RPC ever called, or is payment status manual?
10. **Double registration prevention**: Unique constraint exists, but is UX error handling tested?

---

## Summary for Rewrite Design

**Greenfield opportunities**: RLS policy rewrite is **load-bearing** (66 migrations). Start here. Bracket logic + realtime are **complex but well-isolated** — extract as independent modules. Payment + Google Drive integration is **fragile** — consolidate to single service. Registration form is **user-facing critical** — usability-test early. Admin dashboards are **feature-heavy** — prioritize core (tournaments, athletes, matches) first. Public pages (home, tournament detail, live) are **content-rich** — design layouts before build.

**Recommendation**: Segment rewrite into phases: (1) Auth + RLS, (2) Core data (athletes, tournaments, events), (3) Bracket + scoring, (4) Registration, (5) Admin dashboards, (6) Integrations (email, Drive, Zalo).
