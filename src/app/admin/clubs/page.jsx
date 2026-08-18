import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

export default async function AdminClubsListPage() {
  if (!(await isAdmin())) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, name, zalo_phone")
    .is("deleted_at", null)
    .order("name")
    .limit(200);

  return (
    <main className="flex-1 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Câu lạc bộ</h1>
          <p className="text-sm text-muted-foreground">Quản lý CLB.</p>
        </div>
        <Link
          href="/admin/clubs/new"
          className="inline-flex h-10 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + Tạo CLB
        </Link>
      </header>

      {error && (
        <p className="text-sm text-destructive">Lỗi tải: {error.message}</p>
      )}

      {!error && (!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">Chưa có CLB nào.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Tên</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Zalo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.slug}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.zalo_phone ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/clubs/${c.id}`} className="underline">
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
