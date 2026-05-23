import { expect, test } from "@playwright/test";

/**
 * Production smoke — 5 routes. Run against PROD_URL after deploy.
 *   PLAYWRIGHT_BASE_URL=https://thethaomammo.example pnpm exec playwright test tests/smoke
 */

test("home returns 200", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
});

test("live index returns 200", async ({ request }) => {
  const res = await request.get("/live");
  expect(res.status()).toBe(200);
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test("sitemap is served", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("xml");
});

test("robots disallows admin and print", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toMatch(/\/admin/);
  expect(text).toMatch(/\/print/);
});
