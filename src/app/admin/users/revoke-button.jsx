"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revokeRoleAction } from "@/server/admin/grants";

/**
 * @param {{ userId: string, role: string, scopeId: string | null }} props
 */
export function RevokeButton({ userId, role, scopeId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(/** @type {string | null} */ (null));

  function onClick() {
    if (!window.confirm("Thu hồi quyền này?")) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeRoleAction(userId, role, scopeId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "..." : "Thu hồi"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
