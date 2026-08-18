"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Result = { error?: string; ok?: boolean };

type Props = {
  defaultAmount: number;
  verifyAction: (fd: FormData) => Promise<Result>;
  rejectAction: (fd: FormData) => Promise<Result>;
};

export function PaymentDecisionForms({
  defaultAmount,
  verifyAction,
  rejectAction,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(action: (fd: FormData) => Promise<Result>, fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <form
        action={(fd) => submit(verifyAction, fd)}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <label htmlFor="amount_vnd" className="block text-sm font-medium">
            Số tiền nhận (VND)
          </label>
          <input
            id="amount_vnd"
            name="amount_vnd"
            type="number"
            min={0}
            defaultValue={defaultAmount}
            required
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="note" className="block text-sm font-medium">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Đang lưu..." : "Duyệt thanh toán"}
        </button>
      </form>

      <div className="border-t border-border pt-4">
        <form
          action={(fd) => submit(rejectAction, fd)}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="reject_note"
              className="block text-sm font-medium"
            >
              Lý do từ chối
            </label>
            <textarea
              id="reject_note"
              name="note"
              rows={2}
              required
              placeholder="Ảnh không rõ, sai số tiền..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 px-4 rounded-md border border-input text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {pending ? "Đang lưu..." : "Từ chối"}
          </button>
        </form>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
