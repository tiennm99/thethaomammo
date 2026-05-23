import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { publicUrlFor } from "@/lib/storage/asset-upload";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  gold: "Vàng",
  silver: "Bạc",
  bronze: "Đồng",
  partner: "Đối tác",
  court: "Tài trợ sân",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminSponsorsListPage({ params }: Params) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;

  const supabase = await createClient();
  const [tournamentRes, sponsorsRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("sponsors")
      .select("id, name, tier, sort_order, logo_path, link_url, invert_in_light")
      .eq("tournament_id", id)
      .order("sort_order")
      .order("name"),
  ]);

  if (!tournamentRes.data) notFound();
  const tournament = tournamentRes.data;
  const sponsors = sponsorsRes.data ?? [];

  return (
    <main className="flex-1 p-6 max-w-4xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/admin/tournaments/${id}`} className="underline">
          ← {tournament.name}
        </Link>
      </nav>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nhà tài trợ</h1>
        <Link
          href={`/admin/tournaments/${id}/sponsors/new`}
          className="inline-flex h-9 px-3 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + Thêm nhà tài trợ
        </Link>
      </header>

      {sponsors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có nhà tài trợ.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sponsors.map((s) => {
            const logo = publicUrlFor(supabase, "tournament-assets", s.logo_path);
            return (
              <li
                key={s.id}
                className="rounded-md border border-border p-3 flex flex-col gap-2"
              >
                <div className="aspect-[3/2] w-full bg-muted/40 rounded flex items-center justify-center">
                  {logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- preview, no optimization needed */
                    <img
                      src={logo}
                      alt={s.name}
                      className={`max-h-full max-w-full p-2 ${
                        s.invert_in_light ? "invert" : ""
                      }`}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Chưa có logo
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {TIER_LABEL[s.tier] ?? s.tier} · #{s.sort_order}
                    </div>
                  </div>
                  <Link
                    href={`/admin/tournaments/${id}/sponsors/${s.id}`}
                    className="text-sm underline"
                  >
                    Sửa
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
