import { describe, it, expect, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));

describe("supabase server client", () => {
  it("creates client without throwing when env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy_key";
    const { createClient } = await import("./server");
    const client = await createClient();
    expect(client).toBeDefined();
  });
});
