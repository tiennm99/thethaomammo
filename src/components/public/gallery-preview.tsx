import Link from "next/link";
import { publicUrlFor } from "@/lib/storage/asset-upload";
import { createClient } from "@/lib/supabase/server";

type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
};

type Props = {
  tournamentId: string;
  photos: Photo[];
};

export async function GalleryPreview({ tournamentId, photos }: Props) {
  if (photos.length === 0) return null;
  const supabase = await createClient();

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {photos.slice(0, 6).map((p) => {
          const url = publicUrlFor(supabase, "gallery", p.storage_path);
          if (!url) return null;
          return (
            <li
              key={p.id}
              className="aspect-square overflow-hidden rounded-md bg-muted/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- public gallery thumb served from public Supabase bucket */}
              <img
                src={url}
                alt={p.caption ?? "Ảnh giải đấu"}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </li>
          );
        })}
      </ul>
      {photos.length > 6 && (
        <Link
          href={`/gallery/${tournamentId}`}
          className="text-sm underline text-muted-foreground"
        >
          Xem tất cả {photos.length} ảnh →
        </Link>
      )}
    </div>
  );
}
