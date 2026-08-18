// Pure URL formatter for public Supabase Storage buckets. Avoids instantiating
// a cookie-bound SSR client just to format a deterministic public URL.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type PublicBucket = "tournament-assets" | "gallery";

export function publicAssetUrl(
  bucket: PublicBucket,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
