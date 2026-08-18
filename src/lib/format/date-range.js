/** @type {Intl.DateTimeFormatOptions} */
const DATE_OPTS = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/**
 * @param {string | null | undefined} start
 * @param {string | null | undefined} end
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatDateRange(start, end, fallback = "—") {
  if (!start && !end) return fallback;
  const s = start
    ? new Date(start).toLocaleDateString("vi-VN", DATE_OPTS)
    : null;
  const e = end ? new Date(end).toLocaleDateString("vi-VN", DATE_OPTS) : null;
  if (s && e && s !== e) return `${s} – ${e}`;
  return s ?? e ?? fallback;
}

/**
 * @param {string | null | undefined} iso
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatDate(iso, fallback = "—") {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString("vi-VN", DATE_OPTS);
}
