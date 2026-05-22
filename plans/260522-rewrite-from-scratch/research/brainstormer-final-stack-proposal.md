# Final Stack Proposal — thethaomammo (Tournament Mgmt)

**Date:** 2026-05-22
**Locked-in core:** Next.js + Vercel + Supabase + pnpm + TypeScript
**Audience:** small/regional Vietnamese badminton/sports community
**Hard constraint:** every paid line item must justify itself; default to free tier

---

## 0. Sanity-check on the locked-in core

Before recommending the rest, three honest pushbacks on the core:

1. **Next.js 16 + React 19 + Tailwind v4** (per current package.json) — the existing repo AGENTS.md already warns this is not the Next.js you know. Bleeding edge. **Real cost:** every external doc/AI suggestion needs verification against the bundled docs. **Mitigation:** pin major versions, do not auto-upgrade during this rewrite.
2. **Vercel + Supabase concentrates risk into 2 vendors.** If Supabase pauses your free project (it does after 7 days no DB activity), the whole site degrades. **Mitigation:** cron ping (see section 14).
3. **Vercel free tier Hobby is non-commercial.** If you ever charge entry fees via the site (entry_fee field exists in current schema), it is technically commercial. Free tier still works, but Vercel can ask you to upgrade. Backup plan in section 1 fallback.

These are not blockers — just disclose them upfront.

---

## 1. Hosting / Deploy

**Pick: Vercel (Hobby).** Already locked. Zero config for Next 16.

**Free-tier quotas (Hobby, 2026):**
- 100 GB-hours serverless function execution / month
- 100 GB bandwidth / month
- 1M Edge requests / month
- 100 deployments / day
- Non-commercial use only (gray area for community tournaments — usually fine)
- No team seats (1 owner)

**When it bites:**
- 200+ concurrent registrations + image-heavy landing can burn 30-50 GB bandwidth in a weekend (mostly image transforms — see section 5).
- Long-running route handlers > 10s on Hobby (60s on Pro) — keep PDF gen/zip exports under 10s or move to background.

**Fallback: Cloudflare Pages + Workers**
- Unlimited bandwidth, 100k Worker requests/day free.
- Next.js via @cloudflare/next-on-pages — works but caveats (Node-only APIs unavailable; Tiptap SSR needs care).

---

## 2. Supabase (DB + Auth + Storage + Realtime + Edge Functions)

**Pick: Supabase Free.** Already locked.

**Free-tier quotas (2026):**
- 500 MB Postgres DB
- 50,000 MAU on Auth
- 1 GB file storage
- 5 GB egress / month (includes Storage + API responses)
- 2 GB realtime bandwidth out
- 500k Edge Function invocations / month
- **2 free projects max per org**
- **Project pauses after 7 days of zero DB activity** — silent killer

**Watch out for:**
- 500 MB DB plenty if you store text and push images to Storage. At ~1 KB per registration row, you would need ~500k registrations to hit it.
- 5 GB egress is the real ceiling. Aggressive Next.js revalidate on tournament pages (e.g. 5 min), cache force-cache on read-mostly queries.
- Storage egress counts against the same 5 GB pool. This is why section 4 moves files OFF Supabase.
- RLS is mandatory — without it, anon key reads everything.

**Fallback: Neon (DB only) + Clerk (Auth) + Cloudflare R2 (Storage)** — more fragmented, only if you outgrow Supabase egress.

---

## 3. Email — Transactional

**Pick: Resend.** Already in stack, no migration cost.

**Free tier:**
- 3,000 emails / month
- 100 emails / day
- 1 verified domain (free)
- React Email templates supported (good DX)

**Sender domain setup (required, do not skip):**
- Add SPF, DKIM (2 CNAMEs Resend gives you), DMARC v=DMARC1; p=none; rua=mailto:... on your domain.
- Without DKIM, Gmail marks as spam.
- Use a subdomain like mail.thethaomammo.com for sending — keeps root reputation clean.

**Capacity check:** 200 registrations x 3 emails each = 600 emails. ~5 tournaments/month before hitting 3,000.

**Fallback: Brevo** — 300 emails/day free (~9,000/month), SMTP. Switch only if exceeding Resend.

**Skip:** Mailtrap (dev sandbox), Loops/Plunk (overkill).

---

## 4. File Uploads (proof images, gallery, payment QR)

**Current setup:** Supabase Storage + Google Drive (proof of payment) — Drive adds OAuth complexity.

**Pick: Cloudflare R2 for user uploads (proof images, gallery), keep Supabase Storage only for small admin assets (logos, QR).**

**Why split:**
- 200 registrations x 2 MB receipt = 400 MB. Hitting Supabase 1 GB limit in 2-3 tournaments.
- R2 has **10 GB free storage, zero egress fees forever**. Biggest free-tier advantage in the whole stack.
- Supabase Storage stays for RLS-bound access (small, fast).

**R2 free tier:**
- 10 GB storage
- 1M Class A operations/month (writes)
- 10M Class B operations/month (reads)
- **0 egress**

**Drop Google Drive integration.** OAuth refresh-token plumbing, service-account JSON, Drive API 1000 req/100s/user, no CDN. R2 + public bucket + signed URLs for private docs is simpler.

**Fallback: Supabase Storage only** if traffic stays small (1 tournament/month, < 100 reg). Less integration.

**Skip:** ImageKit (transforms — Next does that), Uploadthing (limited free tier, extra vendor).

---

## 5. Image Optimization / CDN

**#1 hidden cost on Vercel.** next/image on Vercel Hobby:
- **5,000 source images transformed / month** (raised in 2025, verify)
- After that, ~$5 per 1,000 transforms

**Pick: next/image with custom loader for R2-hosted images + pre-generated sizes at upload time.**
- For R2 images, set loader custom returning the R2 URL.
- Pre-generate 2-3 sizes (thumb 400w, card 800w, full 1600w) at upload via Vercel Edge + sharp (Node runtime).
- Skip Vercel on-demand transform entirely for user content.

**Fallback: Cloudflare Images** — $5/month minimum (NOT free). Skip unless revenue justifies.

**Hard rule:** never let next/image transform an R2 URL on the fly — double-charge.

---

## 6. Auth Strategy

**Pick: Supabase Auth with Email/Password + Google OAuth.** Already locked.

**Free?** Yes — up to 50k MAU. Google OAuth itself free (no GCP billing needed for consent screen + client ID).

**Setup checklist:**
- Configure Google OAuth client in Google Cloud Console (free tier project).
- Add https://<project>.supabase.co/auth/v1/callback as authorized redirect URI.
- In Supabase Auth dashboard, add Google provider.
- For email confirmations, configure Resend as SMTP provider in Supabase (Settings -> Auth -> SMTP) — routes auth emails through verified Resend domain.

**Magic links vs password?** For Vietnamese community, password wins — magic links require checking email on phone (friction). Keep password primary, Google secondary.

**Skip:** Clerk, Auth0, NextAuth — Supabase Auth is sufficient and tightly coupled with RLS.

---

## 7. Monitoring / Errors / Analytics

**Pick ONE per category.**

| Category | Pick | Free tier | Why |
|---|---|---|---|
| Errors | Sentry | 5k errors/mo, 10k perf units, 1 user | Best-in-class, Next.js SDK plug-and-play |
| Web analytics | Umami Cloud | 10k events/mo, 3 sites | Privacy-friendly, no cookie banner, GDPR-safe |
| Product analytics | **SKIP for now** | — | YAGNI for community site |

**Why not PostHog?** Free tier 1M events/mo (massive), but SDK is heavy (200+ KB) and dashboard overkill. Adopt later if funnels needed.

**Why not Vercel Analytics?** 2,500 events/month — runs out in a single tournament weekend.

**Setup:** @sentry/nextjs wizard; Umami script tag in app/layout.tsx.

---

## 8. CI/CD

**Pick: Vercel auto-deploy on push (built-in) + minimal GitHub Actions for tests.**

Vercel already does build+deploy on every push free. GH Actions only need:
- pnpm test (Vitest)
- pnpm test:e2e (Playwright) — only main or PRs (slow)
- pnpm lint
- Nightly DB backup (section 14)

**GitHub Actions free tier:**
- 2,000 minutes/month on private repos
- Unlimited on public repos — make repo public if possible

**No need for:** vercel --prod from CI. Native integration is faster.

**Setup:** .github/workflows/ci.yml with setup-node v4 (node 24) + pnpm/action-setup v4 (pnpm 11) + cache.

---

## 9. UI Kit — keep shadcn/ui, drop @base-ui/react?

**Pick: shadcn/ui + Tailwind v4. Drop @base-ui/react.**

**Rationale:**
- shadcn/ui built on Radix primitives, fully covers dialogs, menus, tooltips, popovers.
- @base-ui/react (new MUI headless lib) overlaps ~80% with Radix. Keeping both = two unstyled primitive libs doing same job. DRY violation.
- Pick @base-ui only if shadcn lacks something. As of 2026, shadcn library is wide enough.

**Action:** remove @base-ui/react from package.json in the rewrite.

**Keep:** framer-motion (bracket reveals), tw-animate-css, lucide-react, sonner.

---

## 10. Forms + Validation

**Pick: React Hook Form + Zod.**

**Free?** Both MIT.

**Add to rewrite:**
- react-hook-form (NOT in current package.json — current code uses raw useState; tech debt)
- zod for schema validation, shared client (RHF resolver) and server (route handler)
- @hookform/resolvers for Zod adapter

**Bonus:** Zod schemas double as Supabase row validators before insert. DRY win.

---

## 11. State / Data Fetching

**Pick: TanStack Query + React Server Components.** Already in stack.

**Free?** Yes.

**Split rule:**
- **Server Components** for read-mostly public pages (/giai/[slug], tournament list) — cache via revalidate, no client JS for data fetch.
- **TanStack Query** for admin dashboard (mutations, optimistic updates, cache invalidation).
- **Supabase Realtime** for live match scores (/admin/matches/[id]) — but only on the page that needs it. Realtime channels eat the 2 GB bandwidth.

**Do not add:** Zustand, Jotai, Redux. TanStack Query + URL state + useState enough.

---

## 12. Rich Text — Tiptap

**Pick: Tiptap.** Already locked.

**Free?** Core + StarterKit + most extensions MIT. **Tiptap Pro (collab, AI, comments) is paid** — avoid.

**Gotchas:**
- Tiptap v3 + React 19 + Next 16 — verify SSR works (immediatelyRender: false in useEditor to avoid hydration mismatch).
- DOMPurify already in stack — sanitize Tiptap HTML before storing. Do not trust user input.
- For tournament rules editor, allow only: headings, lists, links, bold/italic/underline. Disable images-in-content (use separate gallery uploader).

---

## 13. Notifications — Zalo / SMS / Push

**Reality check on current code:** Zalo references are all **deep-link URLs and QR images** (zalo_group_url, zalo_qr_storage_path). No Zalo API integration, no SDK, no cost. Just tap to open the Zalo group — free forever.

**Pick: Email only (Resend) + Zalo group deep-link (current behavior).**

**Why not Zalo Official Account API?**
- Requires business verification (tax code, official org).
- Free tier exists, limited to 4 message templates and 1,000 messages/month after approval (weeks).
- Overkill. Email + join Zalo group link covers 95% of comms.

**Why not SMS?** Vietnamese SMS APIs (eSMS, Speedsms) ~250 VND/msg. Not free. Skip unless legal.

**Why not web push?** Setup complexity (VAPID, service worker) > value for occasional notifications.

**Future (year 2):** Zalo OA after community grows past 1k members.

---

## 14. Backups

**Supabase free tier reality:** Only 1 day point-in-time recovery. No on-demand backups in free plan. Delete wrong table = gone.

**Pick: Nightly pg_dump via GitHub Actions -> push encrypted artifact to R2.**

**Implementation sketch:**
- GH Actions cron 0 18 * * * (1 AM Vietnam time, low traffic).
- Step 1: pg_dump SUPABASE_DB_URL | gzip > backup.sql.gz
- Step 2: gpg --symmetric --cipher-algo AES256 backup.sql.gz (passphrase from secret).
- Step 3: Upload to R2 backups/YYYY-MM-DD.sql.gz.gpg.
- Retain last 14 dailies + 6 monthlies. Delete older via same workflow.

**Bonus: anti-pause ping** — same cron hits SELECT 1 on Supabase daily to prevent the 7-day pause.

**Skip:** Supabase paid plan for backups ($25/mo) — DIY is fine at this scale.

---

## 15. Domain + DNS

**Pick: Cloudflare DNS (free) + Tenten.vn or Mat Bao for .vn, or Cloudflare Registrar for .com.**

**Why split DNS from registrar:**
- Cloudflare DNS free, fast (lowest latency in VN), unlimited records.
- .vn domain: must register through VNNIC-authorized Vietnamese registrar (Cloudflare does not sell .vn). Tenten.vn or Mat Bao ~350k VND/year for .vn.
- .com: Cloudflare Registrar at wholesale price (~$10/year) — cheapest legit, no markup.

**Setup:**
- Buy domain at registrar.
- Change nameservers to Cloudflare (*.ns.cloudflare.com).
- In Cloudflare, add CNAME pointing to Vercel (cname.vercel-dns.com).
- Free SSL via Cloudflare (Universal SSL).
- **Disable proxy (gray cloud, DNS-only) for the Vercel CNAME** — proxying CF over Vercel causes loops.

**Skip:** GoDaddy, Namecheap — usually 2-3x markup.

---

## 16. Local Dev Env

**Pick: pnpm + Supabase CLI local stack (Docker).**

**Setup:**
- pnpm install
- pnpm dlx supabase start   # spins up local Postgres, Studio, Auth, Storage
- pnpm dev                  # Next.js on :3000

**Pitfalls:**
- Supabase CLI needs Docker Desktop or compatible runtime. On low-RAM (< 8 GB), stack is heavy — fallback to a separate dev Supabase project on cloud free tier.
- .env.local for local Supabase keys (from supabase status), .env.production for cloud — keep disjoint.
- Storage emulator does not enforce RLS the same as cloud — always test RLS against real cloud project before go-live.
- Migrations: write SQL in supabase/migrations/*.sql, apply with supabase db push to cloud. Never edit cloud schema via dashboard — drifts from migrations.
- For Playwright e2e, run against supabase start locally and a dedicated CI Supabase project — never against prod.

---

## Final Recommended Stack Table

| # | Area | Pick | Why | Free-tier limit |
|---|---|---|---|---|
| 1 | Hosting | **Vercel Hobby** | Native Next.js, zero-config | 100 GB bw, 100 GB-hr fn, 1M edge req/mo |
| 2 | DB + Auth + Realtime | **Supabase Free** | Locked-in; RLS + Postgres + realtime in one | 500 MB DB, 50k MAU, 5 GB egress, 2 projects |
| 3 | Email | **Resend** | Best DX, React Email native | 3k emails/mo, 100/day |
| 4 | File uploads (user content) | **Cloudflare R2** | Zero egress = scales free | 10 GB store, 1M writes, 10M reads/mo |
| 4b | File uploads (admin/QR) | **Supabase Storage** | RLS-protected small files | 1 GB store, counts toward 5 GB egress |
| 5 | Image optimization | **next/image custom loader -> R2** + pre-gen sizes | Avoid Vercel transform cap | 5k transforms/mo (skip via R2 direct) |
| 6 | Auth | **Supabase Auth + Google OAuth** | Free, integrates with RLS | 50k MAU |
| 7 | Error monitoring | **Sentry** | Industry standard, Next 16 SDK ready | 5k errors/mo |
| 7b | Web analytics | **Umami Cloud** | Privacy-friendly, no cookie banner | 10k events/mo, 3 sites |
| 8 | CI/CD | **Vercel auto-deploy + minimal GH Actions** | Native to platform | 2k min/mo private, unlimited public |
| 9 | UI kit | **shadcn/ui + Tailwind v4** (drop @base-ui/react) | DRY: pick one headless lib | Free MIT |
| 10 | Forms | **react-hook-form + zod + @hookform/resolvers** | Type-safe, shared validation | Free MIT |
| 11 | Data fetching | **RSC + TanStack Query + Supabase Realtime** | Right tool per surface | Free MIT (Realtime counts to Supabase) |
| 12 | Rich text | **Tiptap v3 (core + StarterKit only)** | Already in stack, no Pro | Free MIT |
| 13 | Notifications | **Email (Resend) + Zalo deep-link** | No SDK cost | Free |
| 14 | Backups | **GH Actions pg_dump -> encrypted R2** | DIY beats paid Supabase backup | GH Actions quota only |
| 15 | DNS | **Cloudflare DNS** + Tenten.vn (.vn) / CF Registrar (.com) | Cheapest legit + fastest VN latency | Free DNS, ~350k VND/yr .vn |
| 16 | Local dev | **pnpm + Supabase CLI (Docker)** | Matches prod | Free |

**Total recurring cost at MVP:** ~350k-400k VND/year (domain only). Every other line item is $0 until you scale past free tiers.

---

## Trade-off summary (the 4 most important calls)

1. **Vercel + Supabase = 2-vendor risk.** Mitigated by daily DB backups (section 14) and a documented CF Pages fallback (section 1). Accept the risk; velocity win is worth it for MVP.
2. **Move user uploads off Supabase to R2.** Single biggest egress saving. Adds one SDK but is the difference between 10 tournaments/year vs hitting paywall after 3.
3. **Drop @base-ui/react.** Redundant with shadcn/Radix. Pure simplification, no downside.
4. **Skip Zalo OA API, SMS, push notifications.** Email + Zalo group deep-link is enough. Re-evaluate at year 2.

---

## Second-order effects to flag now

- **Free-tier inactivity pause** (section 2) will bite if you launch then go quiet for a month — the anti-pause cron is non-optional.
- **Vercel non-commercial clause** (section 1) is the only path that could force a paid upgrade. If the site ever processes payments directly (not just displaying QR codes), revisit.
- **Supabase 500 MB DB** plenty for text but tight if you store match photos in the DB (you will not — they go to R2). Audit any future feature that wants BYTEA columns.
- **DNS proxying** (section 15) — orange-clouding the Vercel CNAME causes 522/525 errors. Keep DNS-only.

---

## Unresolved Questions

1. Do you intend to accept entry fees through the site (Stripe/Payos), or only display QR codes for manual transfer? Decides whether Vercel non-commercial matters and whether to add a payment gateway (Payos/VNPay free tier).
2. Are there existing tournament data sets to migrate from the current repo, or starting with an empty DB?
3. Confirmed locale-only Vietnamese, or i18n setup (English fallback) needed in the rewrite?
4. Is the GitHub repo public (unlimited Actions minutes) or private (2k min/mo cap)?
5. Target launch date? Bleeding-edge Next 16 / React 19 / Tailwind v4 is fine for a 3-6 month build, riskier for must-ship in 2 weeks.
