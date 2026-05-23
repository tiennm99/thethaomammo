import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";

describe("renderEmail", () => {
  it("registration_success uses payload fields", () => {
    const out = renderEmail("registration_success", {
      tournament_name: "Giải Mầm Mơ 2026",
      event_name: "Đơn nam U18",
      athlete_name: "Nguyễn Văn A",
    });
    expect(out.subject).toContain("Giải Mầm Mơ 2026");
    expect(out.html).toContain("Đơn nam U18");
    expect(out.html).toContain("Nguyễn Văn A");
    expect(out.text).toContain("Đơn nam U18");
  });

  it("escapes HTML in user-supplied fields", () => {
    const out = renderEmail("payment_rejected", {
      tournament_name: "Giải <script>alert(1)</script>",
      reason: "<img onerror=x>",
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).not.toContain("<img onerror");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("match_reminder omits empty optional fields", () => {
    const out = renderEmail("match_reminder", {
      tournament_name: "G1",
      event_name: "E1",
    });
    expect(out.html).not.toContain("Vòng:");
    expect(out.html).not.toContain("Thời gian:");
  });

  it("throws on unknown type", () => {
    // @ts-expect-error testing runtime guard
    expect(() => renderEmail("nope", {})).toThrow();
  });

  it("renders all 7 known types", () => {
    const types = [
      "registration_success",
      "payment_verified",
      "payment_rejected",
      "payment_reminder",
      "match_reminder",
      "match_result",
      "bracket_generated",
    ] as const;
    for (const t of types) {
      const out = renderEmail(t, { tournament_name: "G", event_name: "E" });
      expect(out.subject).toBeTruthy();
      expect(out.html).toContain("<!doctype html>");
      expect(out.text).toBeTruthy();
    }
  });
});
