import { describe, it, expect } from "vitest";
import { registrationSchema } from "./registration";

const validAthlete = {
  full_name: "Nguyễn Văn A",
  dob: "1995-01-15",
  gender: "male",
  club_name: "CLB Demo",
  phone: "0900000000",
};

describe("registrationSchema", () => {
  it("accepts a singles registration", () => {
    const result = registrationSchema.safeParse({
      kind: "singles",
      event_id: "11111111-1111-1111-1111-111111111111",
      athletes: [validAthlete],
      payment_proof_path: "demo/path.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects singles with two athletes", () => {
    const result = registrationSchema.safeParse({
      kind: "singles",
      event_id: "11111111-1111-1111-1111-111111111111",
      athletes: [validAthlete, validAthlete],
      payment_proof_path: "demo/path.jpg",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a doubles registration", () => {
    const result = registrationSchema.safeParse({
      kind: "doubles",
      event_id: "11111111-1111-1111-1111-111111111111",
      athletes: [validAthlete, { ...validAthlete, full_name: "Trần Thị B", gender: "female" }],
      payment_proof_path: "demo/path.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects bad phone number", () => {
    const result = registrationSchema.safeParse({
      kind: "singles",
      event_id: "11111111-1111-1111-1111-111111111111",
      athletes: [{ ...validAthlete, phone: "123" }],
      payment_proof_path: "demo/path.jpg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing payment proof", () => {
    const result = registrationSchema.safeParse({
      kind: "singles",
      event_id: "11111111-1111-1111-1111-111111111111",
      athletes: [validAthlete],
      payment_proof_path: "",
    });
    expect(result.success).toBe(false);
  });
});
