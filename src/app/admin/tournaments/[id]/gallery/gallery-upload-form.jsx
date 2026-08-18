"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadGalleryPhotosAction } from "@/server/admin/gallery";

export function GalleryUploadForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [partial, setPartial] = useState<string[]>([]);

  function onSubmit(fd: FormData) {
    setError(null);
    setInfo(null);
    setPartial([]);
    startTransition(async () => {
      const result = await uploadGalleryPhotosAction(tournamentId, fd);
      if (result.error && !result.uploaded) {
        setError(result.error);
        return;
      }
      if (result.uploaded) {
        setInfo(`Đã tải lên ${result.uploaded} ảnh.`);
        if (result.errors?.length) setPartial(result.errors);
        router.refresh();
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 max-w-2xl">
      <input
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp"
        multiple
        required
        className="block w-full text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Có thể chọn nhiều ảnh cùng lúc. Tối đa 10MB mỗi ảnh. JPG/PNG/WebP.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {info && <p className="text-sm text-green-600">{info}</p>}
      {partial.length > 0 && (
        <ul className="text-xs text-destructive list-disc pl-5 space-y-0.5">
          {partial.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang tải lên..." : "Tải lên"}
      </button>
    </form>
  );
}
