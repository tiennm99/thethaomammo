"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  tournamentFormDataToInput,
  tournamentInputSchema,
} from "@/lib/schemas/admin-tournament";

/** @typedef {{ error?: string; ok?: boolean; id?: string }} ActionResult */

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
export async function createTournamentAction(fd) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = tournamentInputSchema.safeParse(tournamentFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  redirect(`/admin/tournaments/${data.id}`);
}

/**
 * @param {string} id
 * @param {FormData} fd
 * @returns {Promise<ActionResult>}
 */
export async function updateTournamentAction(id, fd) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = tournamentInputSchema.safeParse(tournamentFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${id}`);
  return { ok: true };
}

/**
 * @param {string} id
 * @returns {Promise<ActionResult>}
 */
export async function archiveTournamentAction(id) {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/tournaments");
  revalidatePath(`/admin/tournaments/${id}`);
  return { ok: true };
}
