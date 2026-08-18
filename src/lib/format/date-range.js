const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  fallback: string = "—",
): string {
  if (!start && !end) return fallback;
  const s = start
    ? new Date(start).toLocaleDateString("vi-VN", DATE_OPTS)
    : null;
  const e = end ? new Date(end).toLocaleDateString("vi-VN", DATE_OPTS) : null;
  if (s && e && s !== e) return `${s} – ${e}`;
  return s ?? e ?? fallback;
}

export function formatDate(
  iso: string | null | undefined,
  fallback: string = "—",
): string {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("vi-VN", DATE_OPTS);
}
