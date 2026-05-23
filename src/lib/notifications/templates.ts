import { escapeHtml } from "./escape-html";

export type NotificationType =
  | "registration_success"
  | "payment_verified"
  | "payment_rejected"
  | "payment_reminder"
  | "match_reminder"
  | "match_result"
  | "bracket_generated";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type Payload = Record<string, unknown>;

const SITE_NAME = "Thể Thao Mầm Mơ";

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title></head><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">${body}<hr style="margin-top:32px;border:0;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">${escapeHtml(
    SITE_NAME,
  )}</p></body></html>`;
}

function pickString(payload: Payload, key: string, fallback = ""): string {
  const v = payload[key];
  return typeof v === "string" ? v : fallback;
}

function registrationSuccess(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const event = pickString(payload, "event_name", "");
  const athlete = pickString(payload, "athlete_name", "");
  const body = `
    <h2>Đăng ký thành công</h2>
    <p>Xin chào ${escapeHtml(athlete)},</p>
    <p>Bạn đã đăng ký <strong>${escapeHtml(event)}</strong> tại giải <strong>${escapeHtml(tournament)}</strong>.</p>
    <p>Vui lòng hoàn tất thanh toán (nếu có) để xác nhận đăng ký.</p>`;
  return {
    subject: `[${SITE_NAME}] Đăng ký thành công — ${tournament}`,
    html: shell("Đăng ký thành công", body),
    text: `Đăng ký thành công cho ${event} tại ${tournament}. Vui lòng hoàn tất thanh toán.`,
  };
}

function paymentVerified(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const athlete = pickString(payload, "athlete_name", "");
  const body = `
    <h2>Thanh toán đã được xác nhận</h2>
    <p>Xin chào ${escapeHtml(athlete)},</p>
    <p>Khoản thanh toán cho giải <strong>${escapeHtml(tournament)}</strong> đã được xác nhận. Đăng ký của bạn đã được xác nhận chính thức.</p>`;
  return {
    subject: `[${SITE_NAME}] Đã xác nhận thanh toán — ${tournament}`,
    html: shell("Đã xác nhận thanh toán", body),
    text: `Đã xác nhận thanh toán cho ${tournament}.`,
  };
}

function paymentRejected(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const reason = pickString(payload, "reason", "");
  const body = `
    <h2>Thanh toán bị từ chối</h2>
    <p>Khoản thanh toán cho giải <strong>${escapeHtml(tournament)}</strong> đã bị từ chối.</p>
    ${reason ? `<p>Lý do: ${escapeHtml(reason)}</p>` : ""}
    <p>Vui lòng kiểm tra và thanh toán lại.</p>`;
  return {
    subject: `[${SITE_NAME}] Thanh toán bị từ chối — ${tournament}`,
    html: shell("Thanh toán bị từ chối", body),
    text: `Thanh toán bị từ chối cho ${tournament}. ${reason ? `Lý do: ${reason}` : ""}`,
  };
}

function paymentReminder(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const body = `
    <h2>Nhắc nhở thanh toán</h2>
    <p>Bạn còn khoản chưa thanh toán cho giải <strong>${escapeHtml(tournament)}</strong>.</p>
    <p>Vui lòng hoàn tất trước ngày thi đấu để đăng ký được xác nhận.</p>`;
  return {
    subject: `[${SITE_NAME}] Nhắc nhở thanh toán — ${tournament}`,
    html: shell("Nhắc nhở thanh toán", body),
    text: `Vui lòng thanh toán cho ${tournament}.`,
  };
}

function matchReminder(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const event = pickString(payload, "event_name", "");
  const round = pickString(payload, "round", "");
  const time = pickString(payload, "scheduled_at", "");
  const body = `
    <h2>Nhắc trận đấu</h2>
    <p>Bạn có trận đấu sắp tới tại giải <strong>${escapeHtml(tournament)}</strong>.</p>
    <ul>
      <li>Nội dung: ${escapeHtml(event)}</li>
      ${round ? `<li>Vòng: ${escapeHtml(round)}</li>` : ""}
      ${time ? `<li>Thời gian: ${escapeHtml(time)}</li>` : ""}
    </ul>`;
  return {
    subject: `[${SITE_NAME}] Nhắc trận đấu — ${tournament}`,
    html: shell("Nhắc trận đấu", body),
    text: `Trận đấu sắp tới: ${event} (${tournament}).`,
  };
}

function matchResult(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const event = pickString(payload, "event_name", "");
  const result = pickString(payload, "result", "");
  const score = pickString(payload, "score", "");
  const body = `
    <h2>Kết quả trận đấu</h2>
    <p>Trận của bạn tại giải <strong>${escapeHtml(tournament)}</strong> — <strong>${escapeHtml(event)}</strong> đã kết thúc.</p>
    ${result ? `<p>Kết quả: ${escapeHtml(result)}</p>` : ""}
    ${score ? `<p>Tỉ số: ${escapeHtml(score)}</p>` : ""}`;
  return {
    subject: `[${SITE_NAME}] Kết quả — ${event}`,
    html: shell("Kết quả trận đấu", body),
    text: `Kết quả trận ${event} (${tournament}): ${result} ${score}`.trim(),
  };
}

function bracketGenerated(payload: Payload): RenderedEmail {
  const tournament = pickString(payload, "tournament_name", "giải đấu");
  const event = pickString(payload, "event_name", "");
  const body = `
    <h2>Bảng đấu đã sẵn sàng</h2>
    <p>Bảng đấu nội dung <strong>${escapeHtml(event)}</strong> tại giải <strong>${escapeHtml(tournament)}</strong> đã được công bố.</p>
    <p>Truy cập trang giải đấu để xem lịch chi tiết.</p>`;
  return {
    subject: `[${SITE_NAME}] Bảng đấu đã công bố — ${event}`,
    html: shell("Bảng đấu đã công bố", body),
    text: `Bảng đấu cho ${event} (${tournament}) đã sẵn sàng.`,
  };
}

const RENDERERS: Record<NotificationType, (p: Payload) => RenderedEmail> = {
  registration_success: registrationSuccess,
  payment_verified: paymentVerified,
  payment_rejected: paymentRejected,
  payment_reminder: paymentReminder,
  match_reminder: matchReminder,
  match_result: matchResult,
  bracket_generated: bracketGenerated,
};

export function renderEmail(
  type: NotificationType,
  payload: Payload,
): RenderedEmail {
  const renderer = RENDERERS[type];
  if (!renderer) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  return renderer(payload);
}
