import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAppGrant } from "@/lib/auth/admin-guard";

export const metadata: Metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAppGrant();

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
