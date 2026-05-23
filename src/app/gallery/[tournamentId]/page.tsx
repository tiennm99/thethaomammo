import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { publicAssetUrl } from "@/lib/storage/public-asset-url";

export const revalidate = 300;

type Params = { params: Promise<{ tournamentId: string }> };

const loadTournament = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_tournaments_public")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tournamentId } = await params;
  const data = await loadTournament(tournamentId);
  if (!data) return { title: "Không tìm thấy thư viện ảnh" };
  return {
    title: `Thư viện ảnh — ${data.name}`,
    description: `Thư viện ảnh của giải ${data.name}.`,
  };
}

export default async function GalleryPage({ params }: Params) {
  const { tournamentId } = await params;
  const tournament = await loadTournament(tournamentId);
  if (!tournament) notFound();
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, caption")
    .eq("tournament_id", tournamentId)
    .order("sort_order")
    .order("created_at");

  const list = photos ?? [];

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto p-6 space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link href={`/giai/${tournament.slug}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Thư viện ảnh</h1>
        <p className="text-sm text-muted-foreground">{list.length} ảnh</p>
      </header>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((p) => {
            const url = publicAssetUrl("gallery", p.storage_path);
            if (!url) return null;
            return (
              <li
                key={p.id}
                className="rounded-md overflow-hidden border border-border bg-muted/30"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- public gallery image served from public Supabase bucket */}
                  <img
                    src={url}
                    alt={p.caption ?? "Ảnh giải đấu"}
                    loading="lazy"
                    className="w-full aspect-square object-cover"
                  />
                </a>
                {p.caption && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground line-clamp-2">
                    {p.caption}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
