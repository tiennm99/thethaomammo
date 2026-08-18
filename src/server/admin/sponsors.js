"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  sponsorFormDataToInput,
  sponsorInputSchema,
} from "@/lib/schemas/admin-sponsor";
import {
  deleteStorageObject,
  uploadTournamentAsset,
} from "@/lib/storage/asset-upload";

type ActionResult = { error?: string; ok?: boolean };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

async function maybeUploadLogo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  fd: FormData,
): Promise<{ path?: string; error?: string }> {
  const file = fd.get("logo") as File | null;
  if (!file || file.size === 0) return {};
  const result = await uploadTournamentAsset(
    supabase,
    tournamentId,
    file,
    "sponsor-logos",
  );
  if (!result.ok) return { error: result.error };
  return { path: result.path };
}

export async function createSponsorAction(
  tournamentId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = sponsorInputSchema.safeParse(sponsorFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const upload = await maybeUploadLogo(supabase, tournamentId, fd);
  if (upload.error) return { error: upload.error };

  const linkUrl = parsed.data.link_url;
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      tournament_id: tournamentId,
      name: parsed.data.name,
      tier: parsed.data.tier,
      link_url: linkUrl,
      sort_order: parsed.data.sort_order,
      invert_in_light: parsed.data.invert_in_light,
      logo_path: upload.path ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (upload.path) {
      await deleteStorageObject(supabase, "tournament-assets", upload.path);
    }
    return { error: error.message };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/sponsors`);
  redirect(`/admin/tournaments/${tournamentId}/sponsors/${data.id}`);
}

export async function updateSponsorAction(
  tournamentId: string,
  sponsorId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const parsed = sponsorInputSchema.safeParse(sponsorFormDataToInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sponsors")
    .select("logo_path")
    .eq("id", sponsorId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (!existing) return { error: "Không tìm thấy nhà tài trợ." };

  const upload = await maybeUploadLogo(supabase, tournamentId, fd);
  if (upload.error) return { error: upload.error };

  const linkUrl = parsed.data.link_url;
  const patch: Record<string, unknown> = {
    name: parsed.data.name,
    tier: parsed.data.tier,
    link_url: linkUrl,
    sort_order: parsed.data.sort_order,
    invert_in_light: parsed.data.invert_in_light,
  };
  if (upload.path) patch.logo_path = upload.path;

  const { error } = await supabase
    .from("sponsors")
    .update(patch)
    .eq("id", sponsorId)
    .eq("tournament_id", tournamentId);

  if (error) {
    if (upload.path) {
      await deleteStorageObject(supabase, "tournament-assets", upload.path);
    }
    return { error: error.message };
  }

  if (upload.path && existing.logo_path && existing.logo_path !== upload.path) {
    await deleteStorageObject(supabase, "tournament-assets", existing.logo_path);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/sponsors`);
  revalidatePath(`/admin/tournaments/${tournamentId}/sponsors/${sponsorId}`);
  return { ok: true };
}

export async function deleteSponsorAction(
  tournamentId: string,
  sponsorId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sponsors")
    .select("logo_path")
    .eq("id", sponsorId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (!existing) return { error: "Không tìm thấy nhà tài trợ." };

  const { error } = await supabase
    .from("sponsors")
    .delete()
    .eq("id", sponsorId)
    .eq("tournament_id", tournamentId);
  if (error) return { error: error.message };

  if (existing.logo_path) {
    await deleteStorageObject(supabase, "tournament-assets", existing.logo_path);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/sponsors`);
  return { ok: true };
}
