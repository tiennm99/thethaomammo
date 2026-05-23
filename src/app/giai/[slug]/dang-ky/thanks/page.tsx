import Link from "next/link";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
};

export default async function ThanksPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { id } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Đã gửi đăng ký</h1>
        <p className="text-sm text-muted-foreground">
          Ban tổ chức sẽ xác nhận thanh toán trong vòng 24h. Bạn sẽ nhận email khi được duyệt.
        </p>
        {id && (
          <p className="text-xs text-muted-foreground">
            Mã đăng ký: <code className="font-mono">{id}</code>
          </p>
        )}
        <div className="pt-4">
          <Link href={`/giai/${slug}`} className="underline text-sm">
            Quay lại trang giải đấu
          </Link>
        </div>
      </div>
    </main>
  );
}
