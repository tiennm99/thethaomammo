"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  tournamentFormDataToInput,
  tournamentInputSchema,
} from "@/lib/schemas/admin-tournament";

type ActionResult = { error?: string; ok?: boolean; id?: string };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function createTournamentAction(
  fd: FormData,
): Promise<ActionResult> {
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

export async function updateTournamentAction(
  id: string,
  fd: FormData,
): Promise<ActionResult> {
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

export async function archiveTournamentAction(id: string): Promise<ActionResult> {
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
