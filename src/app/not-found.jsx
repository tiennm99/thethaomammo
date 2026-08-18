import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-4xl font-semibold">404</h1>
        <p className="text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã bị xóa.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
