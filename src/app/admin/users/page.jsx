import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/grants";
import { APP_SLUG } from "@/lib/auth/app-slug";
import { GrantRoleForm } from "./grant-role-form";
import { RevokeButton } from "./revoke-button";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị",
  club_manager: "Quản lý CLB",
  referee: "Trọng tài",
  athlete: "Vận động viên",
};

type Profile = { user_id: string; display_name: string | null };
type Grant = { user_id: string; role: string; scope_id: string | null };

export default async function AdminUsersGrantsPage() {
  if (!(await isAdmin())) notFound();

  const supabase = await createClient();
  const [grantsRes, clubsRes] = await Promise.all([
    supabase
      .schema("shared")
      .from("app_grants")
      .select("user_id, role, scope_id")
      .eq("app_slug", APP_SLUG),
    supabase
      .from("clubs")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
  ]);

  const grants = (grantsRes.data ?? []) as Grant[];
  const clubs = clubsRes.data ?? [];

  const userIds = Array.from(new Set(grants.map((g) => g.user_id)));
  const profilesRes = userIds.length
    ? await supabase
        .schema("shared")
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds)
    : { data: [] as Profile[] };
  const profiles = (profilesRes.data ?? []) as Profile[];
  const profileById = new Map(profiles.map((p) => [p.user_id, p]));
  const clubById = new Map(clubs.map((c) => [c.id, c.name]));

  const grantsByUser = new Map<string, Grant[]>();
  for (const g of grants) {
    const list = grantsByUser.get(g.user_id) ?? [];
    list.push(g);
    grantsByUser.set(g.user_id, list);
  }

  return (
    <main className="flex-1 p-6 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Người dùng &amp; Quyền</h1>
        <p className="text-sm text-muted-foreground">
          Cấp / thu hồi quyền trong ứng dụng <code>{APP_SLUG}</code>.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-3">Cấp quyền mới</h2>
        <GrantRoleForm clubs={clubs} />
        <p className="mt-2 text-xs text-muted-foreground">
          User ID lấy từ Supabase Auth (auth.users.id). Phạm vi áp dụng cho{" "}
          <code>club_manager</code> (chọn CLB), bỏ trống cho các vai trò khác.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Người được cấp quyền</h2>
        {userIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ai được cấp quyền.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {userIds.map((uid) => {
              const profile = profileById.get(uid);
              const userGrants = grantsByUser.get(uid) ?? [];
              return (
                <li key={uid} className="p-3 text-sm">
                  <div className="font-medium">
                    {profile?.display_name ?? "(Không tên)"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{uid}</div>
                  <ul className="mt-2 space-y-1">
                    {userGrants.map((g) => {
                      const scopeLabel = g.scope_id
                        ? (clubById.get(g.scope_id) ?? g.scope_id.slice(0, 8))
                        : null;
                      return (
                        <li
                          key={`${g.role}-${g.scope_id ?? "null"}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span>
                            {ROLE_LABEL[g.role] ?? g.role}
                            {scopeLabel && (
                              <span className="ml-1 text-muted-foreground">
                                · {scopeLabel}
                              </span>
                            )}
                          </span>
                          <RevokeButton
                            userId={uid}
                            role={g.role}
                            scopeId={g.scope_id}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
