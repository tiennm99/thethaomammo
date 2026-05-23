"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-2xl font-semibold">Đã có lỗi xảy ra</h1>
        <p className="text-sm text-muted-foreground">
          Hệ thống gặp sự cố. Vui lòng thử lại trong giây lát.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Thử lại
        </button>
      </div>
    </main>
  );
}
