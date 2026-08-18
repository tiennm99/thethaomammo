import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

/** @typedef {{ params: Promise<{ slug: string }> }} Params */

/** @type {Record<string, string>} */
const GENDER_LABEL = {
  male: "Nam",
  female: "Nữ",
};

/**
 * @param {string} slug
 */
const loadClub = cache(async (/** @type {string} */ slug) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
});

/**
 * @param {Params} props
 * @returns {Promise<import("next").Metadata>}
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await loadClub(slug);
  if (!data) return { title: "Không tìm thấy CLB" };
  return {
    title: data.name,
    description: `Câu lạc bộ ${data.name} — vận động viên tham gia giải Thể Thao Mầm Mơ.`,
  };
}

/**
 * @param {Params} props
 * @returns {Promise<import("react").JSX.Element>}
 */
export default async function ClubPage({ params }) {
  const { slug } = await params;
  const club = await loadClub(slug);
  if (!club) notFound();
  const supabase = await createClient();

  const { data: athletes } = await supabase
    .from("v_athletes_public")
    .select("id, display_id, full_name, gender")
    .eq("club_id", club.id)
    .order("full_name")
    .limit(500);

  const list = athletes ?? [];

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="underline">
          ← Trang chủ
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{club.name}</h1>
        <p className="text-sm text-muted-foreground">{list.length} vận động viên</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Danh sách VĐV</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có vận động viên nào thuộc CLB này.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {list.map((a) => (
              <li
                key={a.id}
                className="p-3 text-sm flex items-center justify-between gap-3"
              >
                <div>
                  <Link
                    href={`/athlete/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {a.display_id}
                    {a.gender && ` · ${GENDER_LABEL[a.gender] ?? a.gender}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
