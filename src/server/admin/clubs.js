"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { clubFormDataToInput, clubInputSchema } from "@/lib/schemas/admin-club";

/**
 * @typedef {object} ActionResult
 * @property {string} [error]
 * @property {boolean} [ok]
 * @property {string} [id]
 */

/**
 * @returns {Promise<string | null>}
 */
async function assertAdmin() {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

/**
 * @param {FormData} fd
 * @returns {Promise<ActionResult>}
 */
export async function createClubAction(fd) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = clubInputSchema.safeParse(clubFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/clubs");
  redirect(`/admin/clubs/${data.id}`);
}

/**
 * @param {string} id
 * @param {FormData} fd
 * @returns {Promise<ActionResult>}
 */
export async function updateClubAction(id, fd) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = clubInputSchema.safeParse(clubFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/clubs");
  revalidatePath(`/admin/clubs/${id}`);
  return { ok: true };
}

/**
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function deleteClubAction(id) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/clubs");
  return { ok: true };
}
