import { z } from "zod";

const phoneRegex = /^0\d{9}$/;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ");

export const athleteInputSchema = z.object({
  full_name: z.string().trim().min(2, "Họ tên quá ngắn").max(120),
  dob: isoDate,
  gender: z.enum(["male", "female"]),
  club_id: z.string().uuid().nullable().optional(),
  club_name: z.string().trim().min(1).max(120),
  phone: z.string().regex(phoneRegex, "Số điện thoại 10 số bắt đầu bằng 0"),
  email: z.string().email().optional().or(z.literal("")),
});

export const singlesRegistrationSchema = z.object({
  kind: z.literal("singles"),
  event_id: z.string().uuid(),
  athletes: z.tuple([athleteInputSchema]),
  payment_proof_path: z.string().min(1, "Thiếu ảnh chuyển khoản"),
});

export const doublesRegistrationSchema = z.object({
  kind: z.literal("doubles"),
  event_id: z.string().uuid(),
  athletes: z.tuple([athleteInputSchema, athleteInputSchema]),
  payment_proof_path: z.string().min(1, "Thiếu ảnh chuyển khoản"),
});

export const registrationSchema = z.discriminatedUnion("kind", [
  singlesRegistrationSchema,
  doublesRegistrationSchema,
]);

export type AthleteInput = z.infer<typeof athleteInputSchema>;
export type RegistrationPayload = z.infer<typeof registrationSchema>;
