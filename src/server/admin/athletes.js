"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  athleteFormDataToInput,
  athleteInputSchema,
} from "@/lib/schemas/admin-athlete";

/**
 * @typedef {object} ActionResult
 * @property {string} [error]
 * @property {boolean} [ok]
 */

/**
 * @returns {Promise<string | null>}
 */
async function assertAdmin() {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

/**
 * @param {string} id
 * @param {FormData} fd
 * @returns {Promise<ActionResult>}
 */
export async function updateAthleteAction(id, fd) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = athleteInputSchema.safeParse(athleteFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("athletes")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/athletes");
  revalidatePath(`/admin/athletes/${id}`);
  return { ok: true };
}

/**
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function softDeleteAthleteAction(id) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();

  // Refuse if athlete has active registrations — FK is `on delete restrict` anyway,
  // but a clear error is better than a DB constraint message.
  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("athlete_id", id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return { error: "Không thể xóa VĐV đang có đăng ký." };
  }

  const { error } = await supabase
    .from("athletes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/athletes");
  return { ok: true };
}

/**
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function restoreAthleteAction(id) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { error } = await supabase
    .from("athletes")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/athletes");
  revalidatePath(`/admin/athletes/${id}`);
  return { ok: true };
}
