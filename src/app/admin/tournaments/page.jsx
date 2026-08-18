import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  open: "Mở đăng ký",
  in_progress: "Đang diễn ra",
  completed: "Đã kết thúc",
  archived: "Lưu trữ",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
}

export default async function AdminTournamentsListPage() {
  if (!(await isAdmin())) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, slug, name, status, starts_at, ends_at, venue, is_legacy")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="flex-1 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Giải đấu</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tất cả giải đấu.
          </p>
        </div>
        <Link
          href="/admin/tournaments/new"
          className="inline-flex h-10 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + Tạo giải mới
        </Link>
      </header>

      {error && (
        <p className="text-sm text-destructive">Lỗi tải: {error.message}</p>
      )}

      {!error && (!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">Chưa có giải đấu nào.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Tên</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Bắt đầu</th>
                <th className="px-3 py-2 font-medium">Địa điểm</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="font-medium">{t.name}</span>
                    {t.is_legacy && (
                      <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Legacy
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.slug}</td>
                  <td className="px-3 py-2">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </td>
                  <td className="px-3 py-2">{formatDate(t.starts_at)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.venue ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/tournaments/${t.id}`}
                      className="underline"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
