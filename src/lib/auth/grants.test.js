import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    schema: () => ({
      rpc: vi.fn(async () => ({
        data: [{ role: "admin", scope_id: null }],
        error: null,
      })),
    }),
  })),
}));

describe("getCurrentGrants", () => {
  it("returns parsed grants", async () => {
    const { getCurrentGrants, hasRole, isAdmin } = await import("./grants");
    const grants = await getCurrentGrants();
    expect(grants).toEqual([{ role: "admin", scope_id: null }]);
    expect(await hasRole("admin")).toBe(true);
    expect(await isAdmin()).toBe(true);
  });
});
