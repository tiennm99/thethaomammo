import Link from "next/link";
import { formatDateRange } from "@/lib/format/date-range";

type Props = {
  slug: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  open: "Đang mở đăng ký",
  in_progress: "Đang diễn ra",
  completed: "Đã kết thúc",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-900",
  in_progress: "bg-blue-100 text-blue-900",
  completed: "bg-muted text-muted-foreground",
};

export function TournamentCard({
  slug,
  name,
  starts_at,
  ends_at,
  venue,
  status,
}: Props) {
  return (
    <Link
      href={`/giai/${slug}`}
      className="block rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold leading-tight">{name}</h2>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded ${
            STATUS_BADGE[status] ?? "bg-muted"
          }`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      <dl className="text-sm space-y-1 text-muted-foreground">
        <div>📅 {formatDateRange(starts_at, ends_at)}</div>
        {venue && <div>📍 {venue}</div>}
      </dl>
    </Link>
  );
}
