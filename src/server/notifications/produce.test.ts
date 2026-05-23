import { describe, expect, it, vi } from "vitest";
import { enqueueNotification } from "./produce";

function makeClient(error: { code?: string; message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return {
    client: {
      from: vi.fn().mockReturnValue({ insert }),
    },
    insert,
  };
}

describe("enqueueNotification", () => {
  it("rejects missing recipient", async () => {
    const { client, insert } = makeClient();
    const res = await enqueueNotification(client, {
      type: "registration_success",
      payload: {},
    });
    expect(res.error).toBe("user_id or email required");
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a row with user_id", async () => {
    const { client, insert } = makeClient();
    const res = await enqueueNotification(client, {
      type: "payment_verified",
      user_id: "u1",
      payload: { tournament_name: "G1" },
      dedup_key: "pv:reg1",
    });
    expect(res.error).toBeUndefined();
    expect(client.from).toHaveBeenCalledWith("notifications");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "payment_verified",
        user_id: "u1",
        email: null,
        dedup_key: "pv:reg1",
      }),
    );
  });

  it("treats unique-violation as success (idempotent)", async () => {
    const { client } = makeClient({ code: "23505", message: "dup" });
    const res = await enqueueNotification(client, {
      type: "match_reminder",
      user_id: "u1",
      dedup_key: "match:m1:a1",
    });
    expect(res.error).toBeUndefined();
  });

  it("propagates other errors", async () => {
    const { client } = makeClient({ code: "12345", message: "boom" });
    const res = await enqueueNotification(client, {
      type: "match_reminder",
      user_id: "u1",
    });
    expect(res.error).toBe("boom");
  });
});
