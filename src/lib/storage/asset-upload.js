// Storage operations are schema-agnostic; accept any SSR-bound client to avoid
// fighting the schema generic of createClient (which is pinned to "thethaomammo").
/**
 * @typedef {{
 *   storage: {
 *     from: (bucket: string) => {
 *       upload: (
 *         path: string,
 *         file: File,
 *         opts?: { cacheControl?: string; upsert?: boolean },
 *       ) => Promise<{ error: { message: string } | null }>;
 *       remove: (
 *         paths: string[],
 *       ) => Promise<{ error: { message: string } | null }>;
 *       getPublicUrl: (path: string) => { data: { publicUrl: string } };
 *     };
 *   };
 * }} StorageBoundClient
 */

const ALLOWED_LOGO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);
const ALLOWED_PHOTO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * @param {string} mime
 * @returns {string}
 */
function extFor(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
}

/**
 * @param {string} mime
 * @returns {string}
 */
function safeFilename(mime) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}.${extFor(mime)}`;
}

/**
 * @typedef {(
 *   | { ok: true, path: string, publicUrl: string }
 *   | { ok: false, error: string }
 * )} UploadResult
 */

/**
 * @param {StorageBoundClient} supabase
 * @param {string} tournamentId
 * @param {File} file
 * @param {string} subfolder
 * @returns {Promise<UploadResult>}
 */
export async function uploadTournamentAsset(
  supabase,
  tournamentId,
  file,
  subfolder,
) {
  if (!file || file.size === 0) return { ok: false, error: "Chưa chọn file." };
  if (!ALLOWED_LOGO_MIME.has(file.type)) {
    return { ok: false, error: "Định dạng không hỗ trợ. Chỉ JPG/PNG/WebP/SVG." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "File vượt quá 5MB." };
  }

  const path = `${tournamentId}/${subfolder}/${safeFilename(file.type)}`;
  const { error } = await supabase.storage
    .from("tournament-assets")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}

/**
 * @param {StorageBoundClient} supabase
 * @param {string} tournamentId
 * @param {File} file
 * @returns {Promise<UploadResult>}
 */
export async function uploadGalleryPhoto(supabase, tournamentId, file) {
  if (!file || file.size === 0) return { ok: false, error: "Chưa chọn file." };
  if (!ALLOWED_PHOTO_MIME.has(file.type)) {
    return { ok: false, error: "Định dạng không hỗ trợ. Chỉ JPG/PNG/WebP." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "File vượt quá 10MB." };
  }

  const path = `${tournamentId}/photos/${safeFilename(file.type)}`;
  const { error } = await supabase.storage
    .from("gallery")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}

/**
 * @param {StorageBoundClient} supabase
 * @param {"tournament-assets" | "gallery"} bucket
 * @param {string} path
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function deleteStorageObject(supabase, bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * @param {StorageBoundClient} supabase
 * @param {"tournament-assets" | "gallery"} bucket
 * @param {string | null} path
 * @returns {string | null}
 */
export function publicUrlFor(supabase, bucket, path) {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
