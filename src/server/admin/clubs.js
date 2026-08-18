"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { clubFormDataToInput, clubInputSchema } from "@/lib/schemas/admin-club";

type ActionResult = { error?: string; ok?: boolean; id?: string };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function createClubAction(fd: FormData): Promise<ActionResult> {
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

export async function updateClubAction(
  id: string,
  fd: FormData,
): Promise<ActionResult> {
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

export async function deleteClubAction(id: string): Promise<ActionResult> {
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
