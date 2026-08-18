import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { publicUrlFor } from "@/lib/storage/asset-upload";
import { GalleryUploadForm } from "./gallery-upload-form";
import { GalleryPhotoCard } from "./gallery-photo-card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminGalleryPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const [tournamentRes, photosRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("gallery_photos")
      .select("id, storage_path, caption, sort_order")
      .eq("tournament_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);

  if (!tournamentRes.data) notFound();
  const tournament = tournamentRes.data;
  const photos = photosRes.data ?? [];

  return (
    <main className="flex-1 p-6 max-w-5xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Thư viện ảnh</h1>
        <p className="text-sm text-muted-foreground">
          {photos.length} ảnh.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3">Tải lên ảnh mới</h2>
        <GalleryUploadForm tournamentId={id} />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Ảnh hiện có</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => {
              const url = publicUrlFor(supabase, "gallery", p.storage_path);
              return (
                <GalleryPhotoCard
                  key={p.id}
                  tournamentId={id}
                  photoId={p.id}
                  url={url}
                  caption={p.caption}
                />
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
