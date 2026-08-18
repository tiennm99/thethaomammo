import { z } from "zod";

export const genderSchema = z.enum(["male", "female", "mixed"]);
export const eventKindSchema = z.enum(["singles", "doubles"]);
export const tournamentStatusSchema = z.enum([
  "draft",
  "open",
  "in_progress",
  "completed",
  "archived",
]);
export const registrationStatusSchema = z.enum([
  "registered",
  "confirmed",
  "withdrew",
]);
export const paymentStatusSchema = z.enum([
  "unpaid",
  "pending",
  "paid",
  "rejected",
  "unknown",
]);
export const matchStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "walkover",
]);
export const courtStatusSchema = z.enum([
  "available",
  "in_use",
  "maintenance",
]);
export const sponsorTierSchema = z.enum([
  "gold",
  "silver",
  "bronze",
  "partner",
  "court",
]);
export const notificationTypeSchema = z.enum([
  "registration_success",
  "payment_verified",
  "payment_rejected",
  "payment_reminder",
  "match_reminder",
  "match_result",
  "bracket_generated",
]);

export const tournamentSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  starts_at: z.string().datetime().nullable(),
  ends_at: z.string().datetime().nullable(),
  venue: z.string().nullable(),
  status: tournamentStatusSchema,
  is_legacy: z.boolean(),
});

export const athleteSchema = z.object({
  id: z.string().uuid(),
  display_id: z.string(),
  full_name: z.string().min(1).max(200),
  dob: z.string().nullable(),
  gender: genderSchema.nullable(),
  club_id: z.string().uuid().nullable(),
  club_name: z.string().nullable(),
});

export const registrationInputSchema = z.object({
  event_id: z.string().uuid(),
  full_name: z.string().min(1).max(200),
  dob: z.string(),
  gender: genderSchema,
  phone: z.string().min(8).max(20),
  club_name: z.string().min(1).max(200),
});

/** @typedef {import("zod").infer<typeof tournamentSchema>} Tournament */
/** @typedef {import("zod").infer<typeof athleteSchema>} Athlete */
/** @typedef {import("zod").infer<typeof registrationInputSchema>} RegistrationInput */
/** @typedef {import("zod").infer<typeof genderSchema>} Gender */
/** @typedef {import("zod").infer<typeof registrationStatusSchema>} RegistrationStatus */
/** @typedef {import("zod").infer<typeof paymentStatusSchema>} PaymentStatus */
/** @typedef {import("zod").infer<typeof matchStatusSchema>} MatchStatus */
