"use client";

import { useState, useTransition } from "react";

type Result = { error?: string; ok?: boolean };

type Props = {
  action: (fd: FormData) => Promise<Result | void>;
  submitLabel: string;
  successMessage?: string;
  children: React.ReactNode;
};

export function MultipartAdminForm({
  action,
  submitLabel,
  successMessage,
  children,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(fd: FormData) {
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
