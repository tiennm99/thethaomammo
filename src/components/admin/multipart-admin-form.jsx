"use client";

import { useState, useTransition } from "react";

/** @typedef {{ error?: string; ok?: boolean }} Result */

/**
 * @typedef {object} Props
 * @property {(fd: FormData) => Promise<Result | void>} action
 * @property {string} submitLabel
 * @property {string} [successMessage]
 * @property {import("react").ReactNode} children
 */

/**
 * @param {Props} props
 */
export function MultipartAdminForm({
  action,
  submitLabel,
  successMessage,
  children,
}) {
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * @param {FormData} fd
   */
  function onSubmit(fd) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await action(fd);
      if (result?.error) setError(result.error);
      else if (result?.ok) setOk(true);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 max-w-2xl" encType="multipart/form-data">
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang lưu..." : submitLabel}
      </button>
    </form>
  );
}
