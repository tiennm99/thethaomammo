"use client";

import { useState, useTransition } from "react";

/**
 * @param {{ action: () => Promise<{ error?: string, ok?: boolean }> }} props
 */
export function ArchiveButton({ action }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(/** @type {string | null} */ (null));

  function onClick() {
    if (!window.confirm("Lưu trữ giải đấu này?")) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
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
        {pending ? "Đang lưu trữ..." : "Lưu trữ"}
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
