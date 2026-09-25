import { z } from "zod";

export const bookingStatuses = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const colorPattern = /^#[0-9A-Fa-f]{6}$/;

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number."),
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z.string().trim().max(30, "Phone is too long."),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number."),
});

export const bookingDraftSchema = z.object({
  serviceId: z.string().min(1, "Choose a service."),
  practitionerId: z.string().min(1, "Choose a practitioner."),
  startAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid time."),
  clientNote: z.string().trim().max(500, "Note is too long.").optional().or(z.literal("")),
});

export const adminBookingSchema = bookingDraftSchema.extend({
  clientId: z.string().min(1, "Choose a client."),
  status: z.enum(bookingStatuses).optional(),
  internalNote: z.string().trim().max(1000, "Note is too long.").optional().or(z.literal("")),
});

export const statusUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one booking."),
  status: z.enum(bookingStatuses),
});

export const cancelSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().max(300, "Reason is too long.").optional().or(z.literal("")),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a service name.").max(80),
  description: z.string().trim().max(400, "Description is too long."),
  durationMin: z.number().int().min(5, "Duration must be at least 5 minutes.").max(240),
  bufferMin: z.number().int().min(0).max(120),
  priceCents: z.number().int().min(0).max(200_000),
  color: z.string().regex(colorPattern, "Use a hex color like #3F6B5B."),
  active: z.boolean(),
  practitionerIds: z.array(z.string().min(1)).min(1, "Choose at least one practitioner."),
});

export const practitionerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a name.").max(80),
  title: z.string().trim().min(2, "Enter a title.").max(80),
  bio: z.string().trim().max(600, "Bio is too long."),
  color: z.string().regex(colorPattern, "Use a hex color like #3F6B5B."),
  active: z.boolean(),
});

export const availabilitySchema = z.object({
  practitionerId: z.string().min(1),
  rules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(timePattern, "Use HH:mm."),
        endTime: z.string().regex(timePattern, "Use HH:mm."),
      }),
    )
    .max(40),
});

export const timeOffSchema = z.object({
  practitionerId: z.string().min(1),
  startsAt: z.string().min(1, "Choose a start."),
  endsAt: z.string().min(1, "Choose an end."),
  reason: z.string().trim().max(200, "Reason is too long."),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(80),
  timezone: z.string().min(1, "Choose a timezone."),
  slotIntervalMin: z.union([z.literal(15), z.literal(30)]),
  minLeadHours: z.number().int().min(0).max(168),
  maxAdvanceDays: z.number().int().min(1).max(365),
  cancellationWindowHours: z.number().int().min(0).max(336),
  autoConfirm: z.boolean(),
});

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export function stripSignUpRole<T extends Record<string, unknown>>(input: T) {
  const rest = { ...input };
  delete rest.role;
  return rest;
}
