"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** @typedef {{ error?: string, ok?: boolean }} Result */

/**
 * @param {{
 *   isDeleted: boolean,
 *   deleteAction: () => Promise<Result>,
 *   restoreAction: () => Promise<Result>,
 *   deleteDisabled: boolean,
 * }} props
 */
export function AthleteDangerButtons({
  isDeleted,
  deleteAction,
  restoreAction,
  deleteDisabled,
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(/** @type {string | null} */ (null));

  /**
   * @param {() => Promise<Result>} action
   * @param {string} [confirmMsg]
   */
  function run(action, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
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
      {isDeleted ? (
        <button
          type="button"
          onClick={() => run(restoreAction)}
          disabled={pending}
          className="inline-flex h-9 px-3 rounded-md border border-input text-sm hover:bg-accent disabled:opacity-50"
        >
          {pending ? "Đang khôi phục..." : "Khôi phục"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => run(deleteAction, "Xóa hồ sơ VĐV này?")}
          disabled={pending || deleteDisabled}
          title={deleteDisabled ? "VĐV đang có đăng ký" : undefined}
          className="inline-flex h-9 px-3 rounded-md border border-input text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {pending ? "Đang xóa..." : "Xóa"}
        </button>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
