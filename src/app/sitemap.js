import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

/**
 * @returns {Promise<import("next").MetadataRoute.Sitemap>}
 */
export default async function sitemap() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_tournaments_public")
    .select("slug, ends_at, starts_at")
    .in("status", ["open", "in_progress", "completed"]);

  const tournamentEntries = (data ?? []).map((t) => {
    const last = t.ends_at ?? t.starts_at ?? null;
    return {
      url: `${SITE_URL}/giai/${t.slug}`,
      lastModified: last ? new Date(last) : new Date(),
      changeFrequency: /** @type {const} */ ("daily"),
      priority: 0.7,
    };
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/live`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
    ...tournamentEntries,
  ];
}
