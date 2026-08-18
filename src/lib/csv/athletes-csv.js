import { z } from "zod";

// CSV column headers (lowercase, snake_case). The first row of the CSV must match.
export const ATHLETE_CSV_HEADERS = [
  "full_name",
  "dob",
  "gender",
  "club_name",
  "phone",
] as const;

export const csvRowSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dob phải dạng YYYY-MM-DD")
    .or(z.literal("")),
  gender: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .refine(
      (s) => s === "" || s === "male" || s === "female",
      "gender phải là male/female hoặc bỏ trống",
    ),
  club_name: z.string().trim().max(200).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
});

export type CsvRowInput = z.input<typeof csvRowSchema>;
export type CsvRow = z.output<typeof csvRowSchema>;

export type ParseSummary = {
  total: number;
  valid: number;
  preview: CsvRow[];
  errors: { row: number; message: string }[];
  rows: CsvRow[];
};

export function summarizeParsed(rows: Record<string, unknown>[]): ParseSummary {
  const errors: { row: number; message: string }[] = [];
  const valid: CsvRow[] = [];

  rows.forEach((raw, i) => {
    const parsed = csvRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: i + 2, // header is row 1
        message:
          parsed.error.issues[0]?.message ?? "Dữ liệu hàng không hợp lệ.",
      });
      return;
    }
    valid.push(parsed.data);
  });

  return {
    total: rows.length,
    valid: valid.length,
    preview: valid.slice(0, 10),
    errors,
    rows: valid,
  };
}

export function athletesToCsv(
  athletes: {
    display_id: string;
    full_name: string;
    dob: string | null;
    gender: string | null;
    club_name: string | null;
    phone: string | null;
  }[],
): string {
  const escape = (v: string | null | undefined): string => {
    const raw = v ?? "";
    // CSV-injection defense (CWE-1236): if a cell starts with =, +, -, @, tab, or CR,
    // Excel/Sheets will treat it as a formula. Prefix with a single quote inside the
    // quoted field so the renderer shows the literal text.
    const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = ["display_id", ...ATHLETE_CSV_HEADERS];
  const lines = [headers.join(",")];
  for (const a of athletes) {
    lines.push(
      [
        escape(a.display_id),
        escape(a.full_name),
        escape(a.dob),
        escape(a.gender),
        escape(a.club_name),
        escape(a.phone),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}
