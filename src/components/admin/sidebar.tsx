import Link from "next/link";

const groups: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "Giải đấu",
    items: [
      { href: "/admin/tournaments", label: "Giải đấu" },
      { href: "/admin/clubs", label: "Câu lạc bộ" },
      { href: "/admin/athletes", label: "Vận động viên" },
    ],
  },
  {
    label: "Đăng ký",
    items: [
      { href: "/admin/registrations", label: "Đăng ký" },
      { href: "/admin/payments", label: "Duyệt thanh toán" },
    ],
  },
  {
    label: "Thi đấu",
    items: [{ href: "/admin/matches", label: "Trận đấu" }],
  },
];

export function AdminSidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <Link href="/admin" className="font-semibold text-sm">
          Quản trị
        </Link>
      </div>
      <nav className="p-2 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="block px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="px-2 pt-2 border-t border-border">
          <Link
            href="/"
            className="block px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
          >
            ← Về trang chủ
          </Link>
        </div>
      </nav>
    </aside>
  );
}
