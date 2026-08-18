"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/browser";

type Props = {
  tournamentId: string;
  onUploaded: (path: string) => void;
};

export function PaymentProofUploader({ tournamentId, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.match(/^image\/(jpe?g|png|webp)$/)) {
      setError("Chỉ chấp nhận ảnh JPG/PNG/WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không quá 5 MB.");
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectPath = `${tournamentId}/${crypto.randomUUID()}.${ext}`;

    const supabase = getSupabase();
    const { error: upErr } = await supabase.storage
      .from("payment-proofs")
      .upload(objectPath, file, { contentType: file.type, upsert: false });

    setUploading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setPath(objectPath);
    onUploaded(objectPath);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Ảnh chuyển khoản</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="block w-full text-sm"
      />
      {uploading && <p className="text-sm text-muted-foreground">Đang tải lên...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Xem trước" className="max-h-60 rounded-md border border-border" />
      )}
      {path && <p className="text-xs text-muted-foreground">Đã lưu: {path}</p>}
    </div>
  );
}
