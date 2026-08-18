import { describe, expect, it } from "vitest";
import { athletesToCsv, summarizeParsed } from "./athletes-csv";

describe("summarizeParsed", () => {
  it("accepts a well-formed row", () => {
    const result = summarizeParsed([
      {
        full_name: "Nguyễn Văn A",
        dob: "2010-05-01",
        gender: "male",
        club_name: "CLB ABC",
        phone: "0901234567",
      },
    ]);
    expect(result.valid).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].full_name).toBe("Nguyễn Văn A");
  });

  it("flags missing full_name", () => {
    const result = summarizeParsed([
      { full_name: "", dob: "", gender: "", club_name: "", phone: "" },
    ]);
    expect(result.valid).toBe(0);
    expect(result.errors[0].row).toBe(2);
  });

  it("flags invalid dob format", () => {
    const result = summarizeParsed([
      { full_name: "A", dob: "01/05/2010", gender: "male" },
    ]);
    expect(result.valid).toBe(0);
    expect(result.errors[0].message).toMatch(/dob/);
  });

  it("rejects unknown gender", () => {
    const result = summarizeParsed([
      { full_name: "A", dob: "", gender: "other" },
    ]);
    expect(result.valid).toBe(0);
  });

  it("accepts empty gender + empty dob", () => {
    const result = summarizeParsed([
      { full_name: "A", dob: "", gender: "" },
    ]);
    expect(result.valid).toBe(1);
  });

  it("preview is capped at 10", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      full_name: `A${i}`,
      dob: "",
      gender: "",
    }));
    const result = summarizeParsed(rows);
    expect(result.preview).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.valid).toBe(25);
  });
});

describe("athletesToCsv", () => {
  it("escapes commas + quotes + newlines", () => {
    const csv = athletesToCsv([
      {
        display_id: "CL26050001",
        full_name: 'Trần "Bob", Jr.',
        dob: "2000-01-01",
        gender: "male",
        club_name: "Line1\nLine2",
        phone: "0900000000",
      },
    ]);
    expect(csv).toContain("display_id,full_name,dob,gender,club_name,phone");
    expect(csv).toContain('"Trần ""Bob"", Jr."');
    // Embedded newline preserved inside the quoted field.
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("neutralizes CSV-formula prefixes", () => {
    const csv = athletesToCsv([
      {
        display_id: "X",
        full_name: "=cmd|'/c calc'!A1",
        dob: null,
        gender: null,
        club_name: "+1234",
        phone: "@formula",
      },
    ]);
    // Each formula-prefixed value is wrapped with a leading single quote.
    expect(csv).toContain("'=cmd");
    expect(csv).toContain("'+1234");
    expect(csv).toContain("'@formula");
  });

  it("emits null fields as empty", () => {
    const csv = athletesToCsv([
      {
        display_id: "X",
        full_name: "A",
        dob: null,
        gender: null,
        club_name: null,
        phone: null,
      },
    ]);
    expect(csv.split("\n")[1]).toBe("X,A,,,,");
  });
});
