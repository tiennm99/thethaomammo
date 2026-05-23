import { describe, expect, it } from "vitest";
import { sanitizeRulesHtml } from "./rules-html";

describe("sanitizeRulesHtml", () => {
  it("returns empty for null/empty", () => {
    expect(sanitizeRulesHtml(null)).toBe("");
    expect(sanitizeRulesHtml("")).toBe("");
  });

  it("preserves allowed formatting tags", () => {
    const out = sanitizeRulesHtml(
      "<p><strong>Bold</strong> and <em>italic</em></p>",
    );
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("strips script tags", () => {
    const out = sanitizeRulesHtml(
      "<p>OK</p><script>alert(1)</script>",
    );
    expect(out).not.toContain("script");
    expect(out).toContain("<p>OK</p>");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeRulesHtml('<a href="/" onclick="alert(1)">x</a>');
    expect(out).not.toContain("onclick");
    expect(out).toContain("<a");
  });

  it("blocks javascript: URLs", () => {
    const out = sanitizeRulesHtml(
      '<a href="javascript:alert(1)">click</a>',
    );
    expect(out).not.toContain("javascript:");
  });

  it("allows safe href + target", () => {
    const out = sanitizeRulesHtml(
      '<a href="https://example.com" target="_blank">link</a>',
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
  });

  it("hardens target=_blank with rel=noopener noreferrer", () => {
    const out = sanitizeRulesHtml(
      '<a href="https://example.com" target="_blank">x</a>',
    );
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });
});
