"use client";

import { useState, useTransition } from "react";
import { markNotificationReadAction } from "@/server/admin/notifications";

type Props = {
  id: string;
  type: string;
  statusLabel: string;
  email: string | null;
  createdAt: string;
  sentAt: string;
  isRead: boolean;
  error: string | null;
  payload: unknown;
};

export function NotificationRow({
  id,
  type,
  statusLabel,
  email,
  createdAt,
  sentAt,
  isRead,
  error,
  payload,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [opErr, setOpErr] = useState<string | null>(null);

  function markRead() {
    setOpErr(null);
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result?.error) setOpErr(result.error);
    });
  }

  return (
    <li className={`p-3 text-sm ${isRead ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{type}</span>
            <span className="text-xs text-muted-foreground">
              · {statusLabel}
            </span>
            {error && (
              <span className="text-xs bg-red-100 text-red-900 px-1.5 py-0.5 rounded">
                Lỗi
              </span>
            )}
            {!isRead && (
              <span className="text-xs bg-yellow-100 text-yellow-900 px-1.5 py-0.5 rounded">
                Mới
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {email ?? "—"} · Tạo {createdAt}
            {sentAt !== "—" && ` · Gửi ${sentAt}`}
          </div>
          {error && (
            <div className="mt-1 text-xs text-destructive">{error}</div>
          )}
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              Payload
            </summary>
            <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </details>
        </div>
        {!isRead && (
          <button
            type="button"
            onClick={markRead}
            disabled={pending}
            className="shrink-0 h-8 px-3 rounded-md border border-input text-xs hover:bg-accent disabled:opacity-50"
          >
            {pending ? "..." : "Đánh dấu đã đọc"}
          </button>
        )}
      </div>
      {opErr && <p className="mt-1 text-xs text-destructive">{opErr}</p>}
    </li>
  );
}
