import { z } from "zod";

// Athlete gender is per-person (male/female only); event-level "mixed" lives on events.gender.
const athleteGenderSchema = z.enum(["male", "female"]);

export const athleteInputSchema = z.object({
  full_name: z.string().min(1).max(200),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải dạng YYYY-MM-DD")
    .nullable(),
  gender: athleteGenderSchema.nullable(),
  club_id: z.string().uuid().nullable(),
  club_name: z.string().max(200).nullable(),
  phone: z.string().max(20).nullable(),
});

/** @typedef {import("zod").infer<typeof athleteInputSchema>} AthleteInput */

/** @param {FormData} fd */
export function athleteFormDataToInput(fd) {
  const obj = /** @type {Record<string, string>} */ (Object.fromEntries(fd));
  return {
    full_name: obj.full_name,
    dob: obj.dob || null,
    gender: obj.gender || null,
    club_id: obj.club_id || null,
    club_name: obj.club_name || null,
    phone: obj.phone || null,
  };
}
