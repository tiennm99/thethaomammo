import Link from "next/link";

export default function TournamentNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-3xl font-semibold">Không tìm thấy giải đấu</h1>
        <p className="text-muted-foreground">
          Giải đấu bạn tìm không tồn tại hoặc đã bị gỡ.
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
