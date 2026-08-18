"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteGalleryPhotoAction,
  updatePhotoCaptionAction,
} from "@/server/admin/gallery";

type Props = {
  tournamentId: string;
  photoId: string;
  url: string | null;
  caption: string | null;
};

export function GalleryPhotoCard({
  tournamentId,
  photoId,
  url,
  caption,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [opError, setOpError] = useState<string | null>(null);
  const [savedCaption, setSavedCaption] = useState(caption ?? "");
  const [dirty, setDirty] = useState(false);

  function saveCaption(fd: FormData) {
    setOpError(null);
    startTransition(async () => {
      const result = await updatePhotoCaptionAction(tournamentId, photoId, fd);
      if (result.error) {
        setOpError(result.error);
        return;
      }
      setSavedCaption((fd.get("caption") as string) ?? "");
      setDirty(false);
    });
  }

  function onDelete() {
    if (!window.confirm("Xóa ảnh này?")) return;
    setOpError(null);
    startTransition(async () => {
      const result = await deleteGalleryPhotoAction(tournamentId, photoId);
      if (result.error) {
        setOpError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-md border border-border overflow-hidden flex flex-col">
      <div className="aspect-square bg-muted/40 flex items-center justify-center">
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element -- thumbnail preview, no optimization needed */
          <img
            src={url}
            alt={savedCaption || "Ảnh"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Lỗi tải ảnh</span>
        )}
      </div>
      <form action={saveCaption} className="p-2 space-y-2">
        <input
          name="caption"
          defaultValue={savedCaption}
          placeholder="Chú thích (tùy chọn)"
          onChange={(e) => setDirty(e.target.value !== savedCaption)}
          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
        />
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="text-xs underline disabled:opacity-50 disabled:no-underline disabled:text-muted-foreground"
          >
            {pending ? "..." : "Lưu chú thích"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-xs text-destructive hover:underline disabled:opacity-50"
          >
            Xóa
          </button>
        </div>
        {opError && <p className="text-xs text-destructive">{opError}</p>}
      </form>
    </li>
  );
}
