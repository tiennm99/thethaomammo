"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

/** @typedef {{ error?: string, ok?: boolean }} ActionResult */

/** @returns {Promise<string | null>} */
async function assertAdmin() {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

/**
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function markNotificationReadAction(id) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  return { ok: true };
}

/**
 * @param {string | null} type
 * @returns {Promise<ActionResult>}
 */
export async function markAllNotificationsReadAction(type) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (type) q = q.eq("type", type);

  const { error } = await q;
  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  return { ok: true };
}
