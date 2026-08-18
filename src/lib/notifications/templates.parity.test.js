/**
 * Parity test: asserts that the JS (Node) and Deno (Edge) template modules
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
const JS_PATH = path.join(
  REPO_ROOT,
  "src/lib/notifications/templates.js",
);
const DENO_PATH = path.join(
  REPO_ROOT,
  "supabase/functions/_shared/templates.ts",
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the string literal values of the NotificationType union, from
 * either a TypeScript union type declaration (Deno file):
 *   export type NotificationType =
 *     | "registration_success"
 *     | "payment_verified"
 *     ...;
 * or a JSDoc typedef (JS file):
 *   typedef {(
 *     | "registration_success"
 *     | "payment_verified"
 *     ...
 *   )} NotificationType
 *
 * @param {string} src
 * @returns {Set<string>}
 */
function extractNotificationTypes(src) {
  const tsBlockMatch = src.match(
    /export\s+type\s+NotificationType\s*=([^;]+);/s,
  );
  const jsdocBlockMatch = src.match(
    /@typedef\s*\{([^}]+)\}\s*NotificationType/s,
  );
  const block = tsBlockMatch?.[1] ?? jsdocBlockMatch?.[1];
  if (!block) return new Set();
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
 *
 * @param {string} src
 * @returns {Set<string>}
 */
function extractSubjectPrefixes(src) {
  // Subject lines are template literals of the form:
  //   `[${SITE_NAME}] <prefix> — ${someVar}`
  // The separator is an em-dash (—).
  const prefixes = new Set();
  const re = /`\[\$\{SITE_NAME\}\]\s+([^`—$]+)\s*—/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    prefixes.add(m[1].trim());
  }
  return prefixes;
}

/**
 * Extract the inner text of every <h2>…</h2> occurrence (literal strings only,
 * no interpolations expected inside headings).
 *
 * @param {string} src
 * @returns {Set<string>}
 */
function extractH2Headings(src) {
  const headings = new Set();
  const re = /<h2>([^<]+)<\/h2>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    headings.add(m[1].trim());
  }
  return headings;
}

// ---------------------------------------------------------------------------
// Load sources
// ---------------------------------------------------------------------------

const jsSrc = fs.readFileSync(JS_PATH, "utf-8");
const denoSrc = fs.readFileSync(DENO_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("templates parity: JS (Node) vs Deno (Edge)", () => {
  it("NotificationType union members are identical in both files", () => {
    const jsTypes = extractNotificationTypes(jsSrc);
    const denoTypes = extractNotificationTypes(denoSrc);

    const onlyInJs = [...jsTypes].filter((t) => !denoTypes.has(t));
    const onlyInDeno = [...denoTypes].filter((t) => !jsTypes.has(t));

    expect(onlyInJs, `Types present in JS but missing in Deno: ${onlyInJs}`).toEqual([]);
    expect(
      onlyInDeno,
      `Types present in Deno but missing in JS: ${onlyInDeno}`,
    ).toEqual([]);
    // Sanity: both files must declare exactly 7 types
    expect(jsTypes.size).toBe(7);
    expect(denoTypes.size).toBe(7);
  });

  it("subject-line prefixes (Vietnamese text after site name) match", () => {
    const jsPrefixes = extractSubjectPrefixes(jsSrc);
    const denoPrefixes = extractSubjectPrefixes(denoSrc);

    const onlyInJs = [...jsPrefixes].filter((p) => !denoPrefixes.has(p));
    const onlyInDeno = [...denoPrefixes].filter((p) => !jsPrefixes.has(p));

    expect(
      onlyInJs,
      `Subject prefixes in JS but not Deno: ${JSON.stringify(onlyInJs)}`,
    ).toEqual([]);
    expect(
      onlyInDeno,
      `Subject prefixes in Deno but not JS: ${JSON.stringify(onlyInDeno)}`,
    ).toEqual([]);
    // Sanity: 7 notification types → 7 subject lines (match_result reuses event
    // not tournament as the suffix, but prefix is still unique)
    expect(jsPrefixes.size).toBeGreaterThanOrEqual(6);
  });

  it("<h2> headings in JS all appear verbatim in Deno", () => {
    const jsHeadings = extractH2Headings(jsSrc);
    const denoHeadings = extractH2Headings(denoSrc);

    const missingInDeno = [...jsHeadings].filter((h) => !denoHeadings.has(h));
    expect(
      missingInDeno,
      `<h2> headings present in JS but missing from Deno: ${JSON.stringify(missingInDeno)}`,
    ).toEqual([]);
  });

  it("<h2> headings in Deno all appear verbatim in JS", () => {
    const jsHeadings = extractH2Headings(jsSrc);
    const denoHeadings = extractH2Headings(denoSrc);

    const missingInJs = [...denoHeadings].filter((h) => !jsHeadings.has(h));
    expect(
      missingInJs,
      `<h2> headings present in Deno but missing from JS: ${JSON.stringify(missingInJs)}`,
    ).toEqual([]);
  });

  it("both files declare the same number of <h2> headings (one per type)", () => {
    const jsCount = extractH2Headings(jsSrc).size;
    const denoCount = extractH2Headings(denoSrc).size;
    expect(jsCount).toBe(denoCount);
    expect(jsCount).toBe(7);
  });
});
