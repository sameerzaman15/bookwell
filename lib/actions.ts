"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { settings } from "@/db/schema";
import { seedDatabase } from "@/db/seed-data";
import { getAuth } from "@/lib/auth";
import { credentialChangeBlock } from "@/lib/authz";
import {
  cancelBookingForActor,
  createBookingForActor,
  deleteBookingForAdmin,
  getSettings,
  listOpenSlots,
  rescheduleBookingForActor,
  setBookingStatusForAdmin,
  updateBookingForAdmin,
} from "@/lib/booking-service";
import {
  addTimeOff,
  deletePractitioner,
  deleteService,
  deleteTimeOff,
  replaceAvailability,
  savePractitioner,
  saveService,
  saveSettings,
} from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { demoEmails, isDemoMode } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import {
  adminBookingSchema,
  availabilitySchema,
  bookingDraftSchema,
  cancelSchema,
  firstIssue,
  passwordChangeSchema,
  practitionerSchema,
  profileSchema,
  serviceSchema,
  settingsSchema,
  signInSchema,
  signUpSchema,
  statusUpdateSchema,
  stripSignUpRole,
  timeOffSchema,
} from "@/lib/validators";

function refreshBookingPaths() {
  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/portal");
  revalidatePath("/portal/book");
  revalidatePath("/portal/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/clients");
}

export async function signInAsDemo(role: "admin" | "client") {
  const email = role === "admin" ? process.env.DEMO_ADMIN_EMAIL : process.env.DEMO_CLIENT_EMAIL;
  const password = role === "admin" ? process.env.DEMO_ADMIN_PASSWORD : process.env.DEMO_CLIENT_PASSWORD;
  if (!email || !password) return { ok: false as const, error: "Demo login is not configured." };
  try {
    const result = await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    if (!result?.user) return { ok: false as const, error: "Demo sign-in failed. Seed the database and try again." };
  } catch {
    return { ok: false as const, error: "Demo sign-in failed. Seed the database and try again." };
  }
  redirect(role === "admin" ? "/admin" : "/portal");
}

export async function signInWithPassword(input: unknown, nextPath?: string) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  try {
    const result = await getAuth().api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    if (!result?.user) return { ok: false as const, error: "Email or password did not match." };
  } catch {
    return { ok: false as const, error: "Email or password did not match." };
  }
  const user = await getCurrentUser();
  const fallback = user?.role === "admin" ? "/admin" : "/portal";
  const destination = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : fallback;
  redirect(destination);
}

export async function signUpClient(input: unknown, nextPath?: string) {
  const parsed = signUpSchema.safeParse(stripSignUpRole((input ?? {}) as Record<string, unknown>));
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  try {
    await getAuth().api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch {
    return { ok: false as const, error: "Could not create that account. The email may already be in use." };
  }
  const destination = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/portal";
  redirect(destination);
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

export async function updateProfile(input: unknown) {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false as const, error: "You need to sign in." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  await getAuth().api.updateUser({
    body: { name: parsed.data.name, phone: parsed.data.phone },
    headers: await headers(),
  });
  revalidatePath("/portal/profile");
  return { ok: true as const };
}

export async function changePassword(input: unknown) {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false as const, error: "You need to sign in." };
  const blocked = credentialChangeBlock(actor.email, demoEmails());
  if (blocked) return { ok: false as const, error: blocked };
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  try {
    await getAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return { ok: false as const, error: "Current password did not match." };
  }
  return { ok: true as const };
}

export async function fetchSlots(input: {
  serviceId: string;
  practitionerId: string;
  date: string;
  ignoreBookingId?: string;
}) {
  const practitionerId = input.practitionerId === "any" ? "any" : input.practitionerId;
  return listOpenSlots({ ...input, practitionerId });
}

export async function confirmClientBooking(input: unknown) {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false as const, error: "Sign in to confirm this appointment." };
  const parsed = bookingDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await createBookingForActor(actor, {
    serviceId: parsed.data.serviceId,
    practitionerId: parsed.data.practitionerId,
    startAt: new Date(parsed.data.startAt),
    clientNote: parsed.data.clientNote,
  });
  if (!result.ok) return result;
  refreshBookingPaths();
  return result;
}

export async function rescheduleClientBooking(input: { id: string; practitionerId: string; startAt: string }) {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false as const, error: "You need to sign in." };
  const result = await rescheduleBookingForActor(actor, {
    id: input.id,
    practitionerId: input.practitionerId,
    startAt: new Date(input.startAt),
  });
  if (result.ok) refreshBookingPaths();
  return result;
}

export async function cancelClientBooking(input: unknown) {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false as const, error: "You need to sign in." };
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await cancelBookingForActor(actor, parsed.data);
  if (result.ok) refreshBookingPaths();
  return result;
}

export async function adminCreateBooking(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = adminBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  if (!actor || actor.role !== "admin") return { ok: false as const, error: "You do not have access to that." };
  const result = await createBookingForActor(actor, {
    clientId: parsed.data.clientId,
    serviceId: parsed.data.serviceId,
    practitionerId: parsed.data.practitionerId,
    startAt: new Date(parsed.data.startAt),
    clientNote: parsed.data.clientNote,
    internalNote: parsed.data.internalNote,
    status: parsed.data.status,
  });
  if (!result.ok) return result;
  refreshBookingPaths();
  redirect(`/admin/bookings/${result.data?.id}`);
}

export async function adminUpdateBooking(input: unknown & { id?: string }) {
  const actor = await getCurrentUser();
  const parsed = adminBookingSchema.partial().safeParse(input);
  if (!parsed.success || !input.id) return { ok: false as const, error: parsed.success ? "Missing booking." : firstIssue(parsed.error) };
  const result = await updateBookingForAdmin(actor, {
    id: input.id,
    practitionerId: parsed.data.practitionerId,
    serviceId: parsed.data.serviceId,
    startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
    status: parsed.data.status,
    internalNote: parsed.data.internalNote,
    clientNote: parsed.data.clientNote,
  });
  if (result.ok) refreshBookingPaths();
  return result;
}

export async function adminSetStatus(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = statusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await setBookingStatusForAdmin(actor, parsed.data.ids, parsed.data.status);
  if (result.ok) refreshBookingPaths();
  return result;
}

export async function adminDeleteBooking(id: string) {
  const actor = await getCurrentUser();
  const result = await deleteBookingForAdmin(actor, id);
  if (result.ok) {
    refreshBookingPaths();
    redirect("/admin/bookings");
  }
  return result;
}

export async function adminSaveService(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await saveService(actor, parsed.data);
  if (result.ok) revalidatePath("/admin/services");
  return result;
}

export async function adminDeleteService(id: string) {
  const actor = await getCurrentUser();
  const result = await deleteService(actor, id);
  if (result.ok) revalidatePath("/admin/services");
  return result;
}

export async function adminSavePractitioner(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = practitionerSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await savePractitioner(actor, parsed.data);
  if (result.ok) {
    revalidatePath("/admin/practitioners");
    if (result.data?.id) revalidatePath(`/admin/practitioners/${result.data.id}`);
  }
  return result;
}

export async function adminDeletePractitioner(id: string) {
  const actor = await getCurrentUser();
  const result = await deletePractitioner(actor, id);
  if (result.ok) {
    revalidatePath("/admin/practitioners");
    redirect("/admin/practitioners");
  }
  return result;
}

export async function adminSaveAvailability(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await replaceAvailability(actor, parsed.data.practitionerId, parsed.data.rules);
  if (result.ok) revalidatePath(`/admin/practitioners/${parsed.data.practitionerId}`);
  return result;
}

export async function adminAddTimeOff(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const clinic = await getSettings();
  const result = await addTimeOff(actor, {
    practitionerId: parsed.data.practitionerId,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    reason: parsed.data.reason,
  });
  if (result.ok) revalidatePath(`/admin/practitioners/${parsed.data.practitionerId}`);
  void clinic;
  return result;
}

export async function adminDeleteTimeOff(id: string, practitionerId: string) {
  const actor = await getCurrentUser();
  const result = await deleteTimeOff(actor, id);
  if (result.ok) revalidatePath(`/admin/practitioners/${practitionerId}`);
  return result;
}

export async function adminSaveSettings(input: unknown) {
  const actor = await getCurrentUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) };
  const result = await saveSettings(actor, parsed.data);
  if (result.ok) {
    revalidatePath("/admin/settings");
    revalidatePath("/");
  }
  return result;
}

export async function adminResetDemo() {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") return { ok: false as const, error: "You do not have access to that." };
  if (!isDemoMode()) return { ok: false as const, error: "Demo reset is turned off." };
  const clinic = await getSettings();
  if (clinic.lastDemoResetAt && Date.now() - clinic.lastDemoResetAt.getTime() < 5 * 60 * 1000) {
    return { ok: false as const, error: "Demo data was just reset. Try again in a few minutes." };
  }
  await seedDatabase();
  await getDb().update(settings).set({ lastDemoResetAt: new Date() }).where(eq(settings.id, "singleton"));
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (email && password) {
    await getAuth().api.signInEmail({ body: { email, password }, headers: await headers() });
  }
  refreshBookingPaths();
  revalidatePath("/admin/settings");
  return { ok: true as const };
}
