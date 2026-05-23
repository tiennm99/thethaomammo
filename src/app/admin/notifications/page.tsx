import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { NotificationRow } from "./notification-row";
import { MarkAllReadButton } from "./mark-all-read-button";
import { markAllNotificationsReadAction } from "@/server/admin/notifications";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const TYPE_LABEL: Record<string, string> = {
  registration_success: "Đăng ký thành công",
  payment_verified: "Đã duyệt thanh toán",
  payment_rejected: "Từ chối thanh toán",
  payment_reminder: "Nhắc thanh toán",
  match_reminder: "Nhắc thi đấu",
  match_result: "Kết quả trận đấu",
  bracket_generated: "Đã sinh bảng",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Trong hàng đợi",
  sent: "Đã gửi",
  failed: "Lỗi gửi",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN");
}

type SearchParams = Promise<{ type?: string; unread?: string }>;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const type = (sp.type ?? "").trim();
  const unreadOnly = sp.unread === "1";

  const supabase = await createClient();
  let q = supabase
    .from("notifications")
    .select("id, type, status, payload, email, sent_at, read_at, created_at, error")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (type) q = q.eq("type", type);
  if (unreadOnly) q = q.is("read_at", null);

  const { data, error } = await q;
  const rows = data ?? [];

  const markAllAction = markAllNotificationsReadAction.bind(null, type || null);

  return (
    <main className="flex-1 p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Thông báo</h1>
          <p className="text-sm text-muted-foreground">
            Các thông báo đã sinh trong hệ thống.
          </p>
        </div>
        <MarkAllReadButton action={markAllAction} />
      </header>

      <form className="mb-4 flex flex-wrap gap-3 items-end" method="get">
        <div className="space-y-1.5">
          <label htmlFor="type" className="block text-xs font-medium">
            Loại
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— Tất cả —</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 h-9 text-sm">
          <input
            type="checkbox"
            name="unread"
            value="1"
            defaultChecked={unreadOnly}
          />
          Chỉ chưa đọc
        </label>
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {error && (
        <p className="text-sm text-destructive">Lỗi tải: {error.message}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có thông báo.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((n) => (
            <NotificationRow
              key={n.id}
              id={n.id}
              type={TYPE_LABEL[n.type] ?? n.type}
              statusLabel={STATUS_LABEL[n.status] ?? n.status}
              email={n.email}
              createdAt={formatDate(n.created_at)}
              sentAt={formatDate(n.sent_at)}
              isRead={!!n.read_at}
              error={n.error}
              payload={n.payload}
            />
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Hiển thị {rows.length} / tối đa {PAGE_SIZE} thông báo.
        {rows.length === PAGE_SIZE && " Lọc thêm để xem các thông báo còn lại."}
      </p>
    </main>
  );
}
