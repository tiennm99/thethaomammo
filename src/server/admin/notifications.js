"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

type ActionResult = { error?: string; ok?: boolean };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function markNotificationReadAction(
  id: string,
): Promise<ActionResult> {
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

export async function markAllNotificationsReadAction(
  type: string | null,
): Promise<ActionResult> {
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
