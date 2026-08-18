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

export type Tournament = z.infer<typeof tournamentSchema>;
export type Athlete = z.infer<typeof athleteSchema>;
export type RegistrationInput = z.infer<typeof registrationInputSchema>;
export type Gender = z.infer<typeof genderSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type MatchStatus = z.infer<typeof matchStatusSchema>;
