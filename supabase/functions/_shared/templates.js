// Mirror of src/lib/notifications/templates.js for Deno edge runtime. Keep in
// sync with that module — both render the same payload contract.

/** @type {Record<string, string>} */
const MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => MAP[ch] ?? ch);
}

/**
 * @typedef {(
 *   | "registration_success"
 *   | "payment_verified"
 *   | "payment_rejected"
 *   | "payment_reminder"
 *   | "match_reminder"
 *   | "match_result"
 *   | "bracket_generated"
 * )} NotificationType
 */

/** @typedef {{ subject: string, html: string, text: string }} RenderedEmail */
/** @typedef {Record<string, unknown>} Payload */

const SITE_NAME = "Thể Thao Mầm Mơ";

/**
 * @param {Payload} p
 * @param {string} k
 * @param {string} [fallback]
 * @returns {string}
 */
function pick(p, k, fallback = "") {
  const v = p[k];
  return typeof v === "string" ? v : fallback;
}

/**
 * @param {string} title
 * @param {string} body
 * @returns {string}
 */
function shell(title, body) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title></head><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">${body}<hr style="margin-top:32px;border:0;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">${escapeHtml(
    SITE_NAME,
  )}</p></body></html>`;
}

/**
 * @param {NotificationType} type
 * @param {Payload} payload
 * @returns {RenderedEmail}
 */
export function renderEmail(type, payload) {
  const tournament = pick(payload, "tournament_name", "giải đấu");
  const event = pick(payload, "event_name", "");
  const athlete = pick(payload, "athlete_name", "");

  switch (type) {
    case "registration_success":
      return {
        subject: `[${SITE_NAME}] Đăng ký thành công — ${tournament}`,
        html: shell(
          "Đăng ký thành công",
          `<h2>Đăng ký thành công</h2><p>Xin chào ${escapeHtml(athlete)},</p><p>Bạn đã đăng ký <strong>${escapeHtml(event)}</strong> tại giải <strong>${escapeHtml(tournament)}</strong>.</p>`,
        ),
        text: `Đăng ký thành công cho ${event} tại ${tournament}.`,
      };
    case "payment_verified":
      return {
        subject: `[${SITE_NAME}] Đã xác nhận thanh toán — ${tournament}`,
        html: shell(
          "Đã xác nhận thanh toán",
          `<h2>Thanh toán đã được xác nhận</h2><p>Khoản thanh toán cho giải <strong>${escapeHtml(tournament)}</strong> đã được xác nhận.</p>`,
        ),
        text: `Đã xác nhận thanh toán cho ${tournament}.`,
      };
    case "payment_rejected": {
      const reason = pick(payload, "reason", "");
      return {
        subject: `[${SITE_NAME}] Thanh toán bị từ chối — ${tournament}`,
        html: shell(
          "Thanh toán bị từ chối",
          `<h2>Thanh toán bị từ chối</h2><p>Khoản thanh toán cho giải <strong>${escapeHtml(tournament)}</strong> đã bị từ chối.</p>${reason ? `<p>Lý do: ${escapeHtml(reason)}</p>` : ""}`,
        ),
        text: `Thanh toán bị từ chối cho ${tournament}. ${reason}`.trim(),
      };
    }
    case "payment_reminder":
      return {
        subject: `[${SITE_NAME}] Nhắc nhở thanh toán — ${tournament}`,
        html: shell(
          "Nhắc nhở thanh toán",
          `<h2>Nhắc nhở thanh toán</h2><p>Bạn còn khoản chưa thanh toán cho giải <strong>${escapeHtml(tournament)}</strong>.</p>`,
        ),
        text: `Vui lòng thanh toán cho ${tournament}.`,
      };
    case "match_reminder": {
      const round = pick(payload, "round", "");
      const time = pick(payload, "scheduled_at", "");
      return {
        subject: `[${SITE_NAME}] Nhắc trận đấu — ${tournament}`,
        html: shell(
          "Nhắc trận đấu",
          `<h2>Nhắc trận đấu</h2><p>Bạn có trận đấu sắp tới tại giải <strong>${escapeHtml(tournament)}</strong>.</p><ul><li>Nội dung: ${escapeHtml(event)}</li>${round ? `<li>Vòng: ${escapeHtml(round)}</li>` : ""}${time ? `<li>Thời gian: ${escapeHtml(time)}</li>` : ""}</ul>`,
        ),
        text: `Trận đấu sắp tới: ${event} (${tournament}).`,
      };
    }
    case "match_result": {
      const result = pick(payload, "result", "");
      const score = pick(payload, "score", "");
      return {
        subject: `[${SITE_NAME}] Kết quả — ${event}`,
        html: shell(
          "Kết quả trận đấu",
          `<h2>Kết quả trận đấu</h2><p>Trận của bạn tại giải <strong>${escapeHtml(tournament)}</strong> — <strong>${escapeHtml(event)}</strong> đã kết thúc.</p>${result ? `<p>Kết quả: ${escapeHtml(result)}</p>` : ""}${score ? `<p>Tỉ số: ${escapeHtml(score)}</p>` : ""}`,
        ),
        text: `Kết quả ${event} (${tournament}): ${result} ${score}`.trim(),
      };
    }
    case "bracket_generated":
      return {
        subject: `[${SITE_NAME}] Bảng đấu đã công bố — ${event}`,
        html: shell(
          "Bảng đấu đã công bố",
          `<h2>Bảng đấu đã sẵn sàng</h2><p>Bảng đấu nội dung <strong>${escapeHtml(event)}</strong> tại giải <strong>${escapeHtml(tournament)}</strong> đã được công bố.</p>`,
        ),
        text: `Bảng đấu cho ${event} (${tournament}) đã sẵn sàng.`,
      };
    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}
