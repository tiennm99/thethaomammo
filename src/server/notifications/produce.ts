import type { NotificationType } from "@/lib/notifications/templates";

export type EnqueueParams = {
  type: NotificationType;
  user_id?: string | null;
  email?: string | null;
  payload?: Record<string, unknown>;
  dedup_key?: string | null;
};

// Minimal duck-typed client surface — `.from("notifications").insert(...)`
// only. Avoids @supabase/supabase-js schema-generic friction.
// CALLER RESPONSIBILITY: the client passed here must target the correct
// application schema (e.g. `db: { schema: "thethaomammo" }`). A client
// scoped to the wrong schema will receive a Postgres error ("relation
// does not exist") which is returned as `{ ok: false, error: <msg> }`.
// The SSR client from `@/lib/supabase/server` satisfies this already.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Insertable = { insert(row: Record<string, unknown>): any };
type NotificationsCapableClient = {
  from(table: "notifications"): Insertable;
};

export type EnqueueResult = {
  ok: boolean;
  error?: string;
  /** true when the row was skipped due to a duplicate dedup_key (idempotent) */
  deduped?: boolean;
};

export async function enqueueNotification(
  supabase: NotificationsCapableClient,
  params: EnqueueParams,
): Promise<EnqueueResult> {
  if (!params.user_id && !params.email) {
    return { ok: false, error: "user_id or email required" };
  }
  const { error } = await supabase.from("notifications").insert({
    type: params.type,
    user_id: params.user_id ?? null,
    email: params.email ?? null,
    payload: params.payload ?? {},
    dedup_key: params.dedup_key ?? null,
  });
  if (error) {
    // Unique-constraint hit on dedup_key is expected and idempotent.
    if (error.code === "23505") return { ok: true, deduped: true };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
