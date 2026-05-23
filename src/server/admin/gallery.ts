"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import {
  deleteStorageObject,
  uploadGalleryPhoto,
} from "@/lib/storage/asset-upload";

type ActionResult = { error?: string; ok?: boolean };

async function assertAdmin(): Promise<string | null> {
  if (!(await isAdmin())) return "Không có quyền.";
  return null;
}

export async function uploadGalleryPhotosAction(
  tournamentId: string,
  fd: FormData,
): Promise<ActionResult & { uploaded?: number; errors?: string[] }> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const files = fd.getAll("photos") as File[];
  const valid = files.filter((f) => f && f.size > 0);
  if (valid.length === 0) return { error: "Chưa chọn ảnh." };

  const supabase = await createClient();

  // Determine next sort_order so newest uploads append.
  const { data: maxRow } = await supabase
    .from("gallery_photos")
    .select("sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextSort = (maxRow?.sort_order ?? -1) + 1;

  const errors: string[] = [];
  let uploaded = 0;

  for (const file of valid) {
    const result = await uploadGalleryPhoto(supabase, tournamentId, file);
    if (!result.ok) {
      errors.push(`${file.name}: ${result.error}`);
      continue;
    }
    const { error: insErr } = await supabase
      .from("gallery_photos")
      .insert({
        tournament_id: tournamentId,
        storage_path: result.path,
        sort_order: nextSort++,
      });
    if (insErr) {
      await deleteStorageObject(supabase, "gallery", result.path);
      errors.push(`${file.name}: ${insErr.message}`);
      continue;
    }
    uploaded++;
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/gallery`);
  return {
    ok: uploaded > 0,
    uploaded,
    errors: errors.length ? errors : undefined,
    error: uploaded === 0 ? (errors[0] ?? "Tải lên thất bại.") : undefined,
  };
}

export async function updatePhotoCaptionAction(
  tournamentId: string,
  photoId: string,
  fd: FormData,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const caption = ((fd.get("caption") as string | null) ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({ caption: caption || null })
    .eq("id", photoId)
    .eq("tournament_id", tournamentId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/gallery`);
  return { ok: true };
}

export async function deleteGalleryPhotoAction(
  tournamentId: string,
  photoId: string,
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard) return { error: guard };

  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (!photo) return { error: "Không tìm thấy ảnh." };

  const { error } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", photoId)
    .eq("tournament_id", tournamentId);
  if (error) return { error: error.message };

  if (photo.storage_path) {
    await deleteStorageObject(supabase, "gallery", photo.storage_path);
  }

  revalidatePath(`/admin/tournaments/${tournamentId}/gallery`);
  return { ok: true };
}
