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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Insertable = { insert(row: Record<string, unknown>): any };
type NotificationsCapableClient = {
  from(table: "notifications"): Insertable;
};

export async function enqueueNotification(
  supabase: NotificationsCapableClient,
  params: EnqueueParams,
): Promise<{ error?: string }> {
  if (!params.user_id && !params.email) {
    return { error: "user_id or email required" };
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
    if (error.code === "23505") return {};
    return { error: error.message };
  }
  return {};
}
