"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  action: () => Promise<{ error?: string; ok?: boolean }>;
  disabled?: boolean;
};

export function DeleteEventButton({ action, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("Xóa nội dung này? (Chỉ được phép khi không có đăng ký.)"))
      return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.back();
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        title={disabled ? "Đã có đăng ký — không thể xóa" : undefined}
        className="inline-flex h-9 px-3 rounded-md border border-input text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? "Đang xóa..." : "Xóa"}
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
