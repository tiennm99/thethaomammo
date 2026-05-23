import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  q?: string;
  club?: string;
  include_deleted?: string;
}>;

export default async function AdminAthletesListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const qRaw = (sp.q ?? "").trim();
  // Strip PostgREST filter metachars to keep .or() syntax intact.
  const q = qRaw.replace(/[,()*]/g, "");
  const club = (sp.club ?? "").trim();
  const includeDeleted = sp.include_deleted === "1";

  const supabase = await createClient();
  const [clubsRes, athletesRes] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
    (async () => {
      let query = supabase
        .from("athletes")
        .select(
          "id, display_id, full_name, dob, gender, phone, club_id, club_name, deleted_at",
        )
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!includeDeleted) query = query.is("deleted_at", null);
      if (q) {
        query = query.or(
          `full_name.ilike.%${q}%,display_id.ilike.%${q}%`,
        );
      }
      if (club) query = query.eq("club_id", club);

      return query;
    })(),
  ]);

  const clubs = clubsRes.data ?? [];
  const athletes = athletesRes.data ?? [];

  return (
    <main className="flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Vận động viên</h1>
        <p className="text-sm text-muted-foreground">
          Tìm và chỉnh sửa hồ sơ VĐV.
        </p>
      </header>

      <form className="mb-4 flex flex-wrap gap-3 items-end" method="get">
        <div className="space-y-1.5">
          <label htmlFor="q" className="block text-xs font-medium">
            Tìm theo tên / mã
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Nguyễn Văn A hoặc CL2605..."
            className="h-9 w-64 px-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="club" className="block text-xs font-medium">
            CLB
          </label>
          <select
            id="club"
            name="club"
            defaultValue={club}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— Tất cả —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 h-9 text-sm">
          <input
            type="checkbox"
            name="include_deleted"
            value="1"
            defaultChecked={includeDeleted}
          />
          Hiển thị đã xóa
        </label>
        <button
          type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {athletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không có VĐV.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium">Họ tên</th>
                <th className="px-3 py-2 font-medium">Giới</th>
                <th className="px-3 py-2 font-medium">CLB</th>
                <th className="px-3 py-2 font-medium">SĐT</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => {
                const clubName =
                  clubs.find((c) => c.id === a.club_id)?.name ?? a.club_name;
                return (
                  <tr
                    key={a.id}
                    className={`border-t border-border ${a.deleted_at ? "opacity-60" : ""}`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.display_id}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{a.full_name}</span>
                      {a.deleted_at && (
                        <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Đã xóa
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {a.gender === "male"
                        ? "Nam"
                        : a.gender === "female"
                          ? "Nữ"
                          : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {clubName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.phone ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/admin/athletes/${a.id}`} className="underline">
                        Sửa
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Hiển thị {athletes.length} / tối đa {PAGE_SIZE} VĐV.
        {athletes.length === PAGE_SIZE && " Lọc thêm để xem các VĐV còn lại."}
      </p>
    </main>
  );
}
