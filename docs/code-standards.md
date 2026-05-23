# Code Standards

## File naming

- Kebab-case for TS/TSX/SQL — `tournament-card.tsx`, `bracket-actions.ts`, `000004_thethaomammo_core.sql`.
- Framework-reserved filenames (Next.js: `page.tsx`, `layout.tsx`, `route.ts`, `not-found.tsx`, `error.tsx`, `manifest.ts`, `sitemap.ts`, `robots.ts`) follow their convention exactly.
- Migrations: `NNN_domain_slug.sql`. Never include phase numbers or audit codes.
- Test files: `*.test.ts` (vitest) or `tests/e2e/*.spec.ts` / `tests/smoke/*.spec.ts` (playwright).

## File size

- Soft cap 200 LOC. Modularize when exceeded.
- Composition over inheritance for large React surfaces.

## Comments

- Default: no comment. Identifier name should explain *what*.
- Write a comment only when *why* is non-obvious — invariant, race, workaround, hidden constraint.
- Never reference plan phase numbers, finding codes, audit labels in code comments.

## Server actions

```ts
"use server";

type ActionResult = { error?: string; ok?: boolean };

export async function doThing(fd: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return { error: "Không có quyền." };
  const parsed = thingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstZodMessage(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("things").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/admin/things");
  return { ok: true };
}
```

## React Hook Form + zod

```tsx
const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "" },
});
```

- Schema lives next to the form or in a `*-schema.ts` sibling.
- Server actions re-validate with the same schema — never trust client validation.

## Supabase clients

| Context | Helper | Why |
|---|---|---|
| Server Component | `createClient()` in `lib/supabase/server.ts` | cookie-bound, anon JWT |
| Server Action | same | user-scoped, respects RLS |
| Browser | `getSupabase()` in `lib/supabase/browser.ts` | singleton, realtime channels |
| Edge function | `createClient(url, SERVICE_ROLE)` in fn file | bypass RLS for system work |

Never import the service-role key from anything in `src/`.

## RLS pattern

- New table → add migration with `alter table … enable row level security;` and explicit allow policies.
- Cross-app role check: `shared.has_role('thethaomammo','admin')`.
- Scoped role check: `shared.has_grant_scope('thethaomammo','club_manager', club_id)`.
- Public view: `create view … with (security_invoker = true) as select <safe cols>`.

## Public reads vs. private reads

- Public RSC pages → `v_*_public` views only.
- Admin RSC pages → base tables (RLS still applies via admin role check).

## Notifications

- Always go through `enqueueNotification(supabase, { type, user_id, payload, dedup_key })`.
- Set `dedup_key` to `"{event_kind}:{primary_id}"` — repeat inserts no-op.
- New notification type → add to `notification_type` enum (Supabase migration) AND add a renderer in `src/lib/notifications/templates.ts` + mirror it in `supabase/functions/_shared/templates.ts`.

## Tests

- Unit (vitest): pure functions, template rendering, schema parsing.
- E2E (playwright `tests/e2e`): happy-path flows on local dev server.
- Smoke (playwright `tests/smoke`): post-deploy probe against `PLAYWRIGHT_BASE_URL`.

## Commit messages

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Subject ≤ 72 chars; body explains *why* if non-obvious.
- No AI references.
