/**
 * Parity test: asserts that the TS (Node) and Deno (Edge) template modules
 * remain in sync. Neither module is imported — both are read as plain text so
 * that Deno-specific syntax never enters the Vitest harness.
 *
 * Fails loudly when:
 *   - NotificationType union members differ between the two files.
 *   - A subject-line prefix exists in one file but not the other.
 *   - An <h2> heading exists in one file but not the other.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Paths (resolved relative to repo root so the test works from any cwd)
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, "../../../");
const TS_PATH = path.join(
  REPO_ROOT,
  "src/lib/notifications/templates.ts",
);
const DENO_PATH = path.join(
  REPO_ROOT,
  "supabase/functions/_shared/templates.ts",
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the string literal values from a TypeScript union type declaration.
 *
 * Matches blocks like:
 *   export type NotificationType =
 *     | "registration_success"
 *     | "payment_verified"
 *     ...;
 */
function extractNotificationTypes(src: string): Set<string> {
  // Grab everything between the type declaration and the closing semicolon.
  const typeBlockMatch = src.match(
    /export\s+type\s+NotificationType\s*=([^;]+);/s,
  );
  if (!typeBlockMatch) return new Set();
  const block = typeBlockMatch[1];
  const members = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return new Set(members);
}

/**
 * Extract the Vietnamese text portion that follows `[Thể Thao Mầm Mơ] ` in
 * subject-line templates.
 *
 * Matches string fragments like:
 *   `[${SITE_NAME}] Đăng ký thành công — `
 * capturing everything between `] ` and ` — ` (or end of template literal
 * segment).
 */
function extractSubjectPrefixes(src: string): Set<string> {
  // Subject lines are template literals of the form:
  //   `[${SITE_NAME}] <prefix> — ${someVar}`
  // The separator is an em-dash (—).
  const prefixes = new Set<string>();
  const re = /`\[\$\{SITE_NAME\}\]\s+([^`—$]+)\s*—/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    prefixes.add(m[1].trim());
  }
  return prefixes;
}

/**
 * Extract the inner text of every <h2>…</h2> occurrence (literal strings only,
 * no interpolations expected inside headings).
 */
function extractH2Headings(src: string): Set<string> {
  const headings = new Set<string>();
  const re = /<h2>([^<]+)<\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    headings.add(m[1].trim());
  }
  return headings;
}

// ---------------------------------------------------------------------------
// Load sources
// ---------------------------------------------------------------------------

const tsSrc = fs.readFileSync(TS_PATH, "utf-8");
const denoSrc = fs.readFileSync(DENO_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("templates parity: TS (Node) vs Deno (Edge)", () => {
  it("NotificationType union members are identical in both files", () => {
    const tsTypes = extractNotificationTypes(tsSrc);
    const denoTypes = extractNotificationTypes(denoSrc);

    const onlyInTs = [...tsTypes].filter((t) => !denoTypes.has(t));
    const onlyInDeno = [...denoTypes].filter((t) => !tsTypes.has(t));

    expect(onlyInTs, `Types present in TS but missing in Deno: ${onlyInTs}`).toEqual([]);
    expect(
      onlyInDeno,
      `Types present in Deno but missing in TS: ${onlyInDeno}`,
    ).toEqual([]);
    // Sanity: both files must declare exactly 7 types
    expect(tsTypes.size).toBe(7);
    expect(denoTypes.size).toBe(7);
  });

  it("subject-line prefixes (Vietnamese text after site name) match", () => {
    const tsPrefixes = extractSubjectPrefixes(tsSrc);
    const denoPrefixes = extractSubjectPrefixes(denoSrc);

    const onlyInTs = [...tsPrefixes].filter((p) => !denoPrefixes.has(p));
    const onlyInDeno = [...denoPrefixes].filter((p) => !tsPrefixes.has(p));

    expect(
      onlyInTs,
      `Subject prefixes in TS but not Deno: ${JSON.stringify(onlyInTs)}`,
    ).toEqual([]);
    expect(
      onlyInDeno,
      `Subject prefixes in Deno but not TS: ${JSON.stringify(onlyInDeno)}`,
    ).toEqual([]);
    // Sanity: 7 notification types → 7 subject lines (match_result reuses event
    // not tournament as the suffix, but prefix is still unique)
    expect(tsPrefixes.size).toBeGreaterThanOrEqual(6);
  });

  it("<h2> headings in TS all appear verbatim in Deno", () => {
    const tsHeadings = extractH2Headings(tsSrc);
    const denoHeadings = extractH2Headings(denoSrc);

    const missingInDeno = [...tsHeadings].filter((h) => !denoHeadings.has(h));
    expect(
      missingInDeno,
      `<h2> headings present in TS but missing from Deno: ${JSON.stringify(missingInDeno)}`,
    ).toEqual([]);
  });

  it("<h2> headings in Deno all appear verbatim in TS", () => {
    const tsHeadings = extractH2Headings(tsSrc);
    const denoHeadings = extractH2Headings(denoSrc);

    const missingInTs = [...denoHeadings].filter((h) => !tsHeadings.has(h));
    expect(
      missingInTs,
      `<h2> headings present in Deno but missing from TS: ${JSON.stringify(missingInTs)}`,
    ).toEqual([]);
  });

  it("both files declare the same number of <h2> headings (one per type)", () => {
    const tsCount = extractH2Headings(tsSrc).size;
    const denoCount = extractH2Headings(denoSrc).size;
    expect(tsCount).toBe(denoCount);
    expect(tsCount).toBe(7);
  });
});
