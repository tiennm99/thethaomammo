import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth/grants";
import { AthleteImportFlow } from "./athlete-import-flow";

export const dynamic = "force-dynamic";

export default async function AdminAthleteImportPage() {
  if (!(await isAdmin())) notFound();

  return (
    <main className="flex-1 p-6 max-w-3xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/athletes" className="underline">
          ← Vận động viên
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Nhập VĐV từ CSV</h1>
        <p className="text-sm text-muted-foreground">
          File CSV với header dòng đầu:{" "}
          <code>full_name,dob,gender,club_name,phone</code>. <br />
          <code>dob</code> theo định dạng <code>YYYY-MM-DD</code>;{" "}
          <code>gender</code> là <code>male</code>/<code>female</code> hoặc bỏ
          trống.
        </p>
      </header>
      <AthleteImportFlow />
    </main>
  );
}
