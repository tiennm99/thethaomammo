import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAppGrant } from "@/lib/auth/admin-guard";

/** @type {import("next").Metadata} */
export const metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * @param {{ children: import("react").ReactNode }} props
 * @returns {Promise<import("react").JSX.Element>}
 */
export default async function AdminLayout({ children }) {
  await requireAppGrant();

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
