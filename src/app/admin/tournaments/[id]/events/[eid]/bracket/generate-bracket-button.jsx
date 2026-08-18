"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateBracketAction } from "@/server/admin/bracket-actions";

export function GenerateBracketButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handle() {
    setError(null);
    startTransition(async () => {
      const result = await generateBracketAction(eventId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang tạo..." : "Tạo bảng đấu"}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
