"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  action: () => Promise<{ error?: string; ok?: boolean }>;
};

export function MarkAllReadButton({ action }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("Đánh dấu tất cả là đã đọc?")) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-9 px-3 rounded-md border border-input text-sm hover:bg-accent disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : "Đánh dấu tất cả đã đọc"}
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
