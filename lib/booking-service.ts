import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  availabilityRules,
  bookings,
  practitionerServices,
  practitioners,
  services,
  timeOff,
  user,
} from "@/db/schema";
import { getOpenSlots } from "@/lib/availability";
import {
  bookingVisibility,
  cancellationBlock,
  requireRoleResult,
  type AuthUser,
} from "@/lib/authz";
import { getDb, isExclusionViolation, SLOT_TAKEN_MESSAGE } from "@/lib/db";
import { businessTimeZone } from "@/lib/env";
import type { BookingStatus } from "@/lib/validators";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type SettingsRow = {
  id: string;
  businessName: string;
  timezone: string;
  slotIntervalMin: number;
  minLeadHours: number;
  maxAdvanceDays: number;
  cancellationWindowHours: number;
  autoConfirm: boolean;
  lastDemoResetAt: Date | null;
};

export function defaultSettings(): SettingsRow {
  return {
    id: "singleton",
    businessName: "Cedar Physio & Wellness",
    timezone: businessTimeZone(),
    slotIntervalMin: 30,
    minLeadHours: 2,
    maxAdvanceDays: 21,
    cancellationWindowHours: 24,
    autoConfirm: true,
    lastDemoResetAt: null,
  };
}

export async function getSettings(): Promise<SettingsRow> {
  const row = await getDb().query.settings.findFirst();
  return row ?? defaultSettings();
}

function gate(user: AuthUser | null, role: "admin" | "client"): ActionResult {
  const result = requireRoleResult(user, role);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

async function loadCatalog() {
  const db = getDb();
  const [serviceRows, practitionerRows, links, rules, off] = await Promise.all([
    db.select().from(services),
    db.select().from(practitioners),
    db.select().from(practitionerServices),
    db.select().from(availabilityRules),
    db.select().from(timeOff),
  ]);
  return { serviceRows, practitionerRows, links, rules, off };
}

export async function listOpenSlots(input: {
  serviceId: string;
  practitionerId: string | "any";
  date: string;
  ignoreBookingId?: string;
}) {
  const clinic = await getSettings();
  const { serviceRows, practitionerRows, links, rules, off } = await loadCatalog();
  const service = serviceRows.find((row) => row.id === input.serviceId && row.active);
  if (!service) return [];
  const offering = new Set(
    links.filter((link) => link.serviceId === service.id).map((link) => link.practitionerId),
  );
  const activeIds = practitionerRows
    .filter((row) => row.active && offering.has(row.id))
    .map((row) => row.id);
  const practitionerIds =
    input.practitionerId === "any"
      ? activeIds
      : activeIds.filter((id) => id === input.practitionerId);
  if (practitionerIds.length === 0) return [];

  const existing = await getDb()
    .select()
    .from(bookings)
    .where(inArray(bookings.practitionerId, practitionerIds));

  const slots = getOpenSlots({
    rules: rules.map((rule) => ({
      practitionerId: rule.practitionerId,
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
    })),
    timeOff: off.map((entry) => ({
      practitionerId: entry.practitionerId,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
    })),
    bookings: existing
      .filter((row) => row.id !== input.ignoreBookingId)
      .map((row) => ({
        practitionerId: row.practitionerId,
        startAt: row.startAt,
        endAt: row.endAt,
        status: row.status,
      })),
    service: { durationMin: service.durationMin, bufferMin: service.bufferMin },
    settings: {
      timezone: clinic.timezone,
      slotIntervalMin: clinic.slotIntervalMin,
      minLeadHours: clinic.minLeadHours,
      maxAdvanceDays: clinic.maxAdvanceDays,
    },
    date: input.date,
    now: new Date(),
    practitionerIds,
    mode: input.practitionerId === "any" ? "any" : "one",
  });

  const names = new Map(practitionerRows.map((row) => [row.id, row]));
  return slots.map((slot) => ({
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    practitionerId: slot.practitionerId,
    practitionerName: names.get(slot.practitionerId)?.name ?? "Practitioner",
    practitionerColor: names.get(slot.practitionerId)?.color ?? "#3F6B5B",
  }));
}

async function assertSlotOpen(input: {
  serviceId: string;
  practitionerId: string;
  startAt: Date;
  ignoreBookingId?: string;
}) {
  const date = formatInTimeZone(
    input.startAt,
    (await getSettings()).timezone,
    "yyyy-MM-dd",
  );
  const slots = await listOpenSlots({
    serviceId: input.serviceId,
    practitionerId: input.practitionerId,
    date,
    ignoreBookingId: input.ignoreBookingId,
  });
  return slots.some(
    (slot) =>
      slot.practitionerId === input.practitionerId &&
      new Date(slot.start).getTime() === input.startAt.getTime(),
  );
}

export async function createBookingForActor(
  actor: AuthUser,
  input: {
    clientId?: string;
    serviceId: string;
    practitionerId: string;
    startAt: Date;
    clientNote?: string | null;
    internalNote?: string | null;
    status?: BookingStatus;
  },
): Promise<ActionResult<{ id: string }>> {
  const clientId = input.clientId ?? actor.id;
  if (actor.role !== "admin" && clientId !== actor.id) {
    return { ok: false, error: "You can only book for yourself." };
  }

  const db = getDb();
  const clinic = await getSettings();
  const service = await db.query.services.findFirst({ where: eq(services.id, input.serviceId) });
  if (!service || !service.active) return { ok: false, error: "That service is not available." };
  const practitioner = await db.query.practitioners.findFirst({
    where: eq(practitioners.id, input.practitionerId),
  });
  if (!practitioner || !practitioner.active) {
    return { ok: false, error: "That practitioner is not available." };
  }
  const link = await db.query.practitionerServices.findFirst({
    where: and(
      eq(practitionerServices.practitionerId, input.practitionerId),
      eq(practitionerServices.serviceId, input.serviceId),
    ),
  });
  if (!link) return { ok: false, error: "That practitioner does not offer this service." };

  const open = await assertSlotOpen({
    serviceId: input.serviceId,
    practitionerId: input.practitionerId,
    startAt: input.startAt,
  });
  if (!open) return { ok: false, error: SLOT_TAKEN_MESSAGE };

  const status: BookingStatus =
    input.status && actor.role === "admin"
      ? input.status
      : clinic.autoConfirm
        ? "confirmed"
        : "pending";
  const id = crypto.randomUUID();
  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60 * 1000);

  try {
    await db.insert(bookings).values({
      id,
      clientId,
      practitionerId: input.practitionerId,
      serviceId: input.serviceId,
      startAt: input.startAt,
      endAt,
      status,
      priceCents: service.priceCents,
      clientNote: input.clientNote || null,
      internalNote: actor.role === "admin" ? input.internalNote || null : null,
      createdBy: actor.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    if (isExclusionViolation(error)) return { ok: false, error: SLOT_TAKEN_MESSAGE };
    throw error;
  }
  return { ok: true, data: { id } };
}

export async function rescheduleBookingForActor(
  actor: AuthUser,
  input: { id: string; practitionerId: string; startAt: Date },
): Promise<ActionResult<{ id: string }>> {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
  if (!booking || bookingVisibility(actor, booking) === "not_found") {
    return { ok: false, error: "That booking could not be found." };
  }
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show") {
    return { ok: false, error: "This booking can no longer be moved." };
  }
  const service = await db.query.services.findFirst({ where: eq(services.id, booking.serviceId) });
  if (!service) return { ok: false, error: "That service is not available." };
  const open = await assertSlotOpen({
    serviceId: booking.serviceId,
    practitionerId: input.practitionerId,
    startAt: input.startAt,
    ignoreBookingId: booking.id,
  });
  if (!open) return { ok: false, error: SLOT_TAKEN_MESSAGE };
  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60 * 1000);
  try {
    await db
      .update(bookings)
      .set({
        practitionerId: input.practitionerId,
        startAt: input.startAt,
        endAt,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id));
  } catch (error) {
    if (isExclusionViolation(error)) return { ok: false, error: SLOT_TAKEN_MESSAGE };
    throw error;
  }
  return { ok: true, data: { id: booking.id } };
}

export async function cancelBookingForActor(
  actor: AuthUser,
  input: { id: string; reason?: string | null },
): Promise<ActionResult> {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
  if (!booking || bookingVisibility(actor, booking) === "not_found") {
    return { ok: false, error: "That booking could not be found." };
  }
  if (booking.status === "cancelled") return { ok: false, error: "This booking is already cancelled." };
  if (booking.status === "completed" || booking.status === "no_show") {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }
  if (actor.role !== "admin") {
    const clinic = await getSettings();
    const block = cancellationBlock(new Date(), booking.startAt, clinic.cancellationWindowHours);
    if (block) return { ok: false, error: block };
  }
  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: input.reason || null,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id));
  return { ok: true };
}

export async function updateBookingForAdmin(
  actor: AuthUser | null,
  input: {
    id: string;
    practitionerId?: string;
    serviceId?: string;
    startAt?: Date;
    status?: BookingStatus;
    internalNote?: string | null;
    clientNote?: string | null;
  },
): Promise<ActionResult> {
  const allowed = gate(actor, "admin");
  if (!allowed.ok) return allowed;
  const db = getDb();
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
  if (!booking) return { ok: false, error: "That booking could not be found." };
  const serviceId = input.serviceId ?? booking.serviceId;
  const practitionerId = input.practitionerId ?? booking.practitionerId;
  const startAt = input.startAt ?? booking.startAt;
  const service = await db.query.services.findFirst({ where: eq(services.id, serviceId) });
  if (!service) return { ok: false, error: "That service is not available." };
  const timeChanged =
    startAt.getTime() !== booking.startAt.getTime() ||
    practitionerId !== booking.practitionerId ||
    serviceId !== booking.serviceId;
  if (timeChanged && (input.status ?? booking.status) !== "cancelled") {
    const open = await assertSlotOpen({
      serviceId,
      practitionerId,
      startAt,
      ignoreBookingId: booking.id,
    });
    if (!open) return { ok: false, error: SLOT_TAKEN_MESSAGE };
  }
  try {
    await db
      .update(bookings)
      .set({
        serviceId,
        practitionerId,
        startAt,
        endAt: new Date(startAt.getTime() + service.durationMin * 60 * 1000),
        status: input.status ?? booking.status,
        priceCents: serviceId === booking.serviceId ? booking.priceCents : service.priceCents,
        internalNote: input.internalNote === undefined ? booking.internalNote : input.internalNote,
        clientNote: input.clientNote === undefined ? booking.clientNote : input.clientNote,
        updatedAt: new Date(),
        cancelledAt: input.status === "cancelled" ? new Date() : booking.cancelledAt,
      })
      .where(eq(bookings.id, booking.id));
  } catch (error) {
    if (isExclusionViolation(error)) return { ok: false, error: SLOT_TAKEN_MESSAGE };
    throw error;
  }
  return { ok: true };
}

export async function setBookingStatusForAdmin(
  actor: AuthUser | null,
  ids: string[],
  status: BookingStatus,
): Promise<ActionResult> {
  const allowed = gate(actor, "admin");
  if (!allowed.ok) return allowed;
  if (ids.length === 0) return { ok: false, error: "Select at least one booking." };
  await getDb()
    .update(bookings)
    .set({
      status,
      updatedAt: new Date(),
      cancelledAt: status === "cancelled" ? new Date() : null,
    })
    .where(inArray(bookings.id, ids));
  return { ok: true };
}

export async function deleteBookingForAdmin(actor: AuthUser | null, id: string): Promise<ActionResult> {
  const allowed = gate(actor, "admin");
  if (!allowed.ok) return allowed;
  const deleted = await getDb().delete(bookings).where(eq(bookings.id, id)).returning({ id: bookings.id });
  if (deleted.length === 0) return { ok: false, error: "That booking could not be found." };
  return { ok: true };
}

export type BookingListFilters = {
  search?: string;
  status?: string;
  practitionerId?: string;
  serviceId?: string;
  from?: string;
  to?: string;
  sort?: "startAt" | "client" | "status" | "price";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  clientId?: string;
};

export async function queryBookings(filters: BookingListFilters) {
  const clinic = await getSettings();
  const pageSize = filters.pageSize ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [];
  if (filters.clientId) conditions.push(eq(bookings.clientId, filters.clientId));
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.practitionerId) conditions.push(eq(bookings.practitionerId, filters.practitionerId));
  if (filters.serviceId) conditions.push(eq(bookings.serviceId, filters.serviceId));
  if (filters.from) {
    conditions.push(gte(bookings.startAt, fromZonedTime(`${filters.from}T00:00:00`, clinic.timezone)));
  }
  if (filters.to) {
    conditions.push(lte(bookings.startAt, fromZonedTime(`${filters.to}T23:59:59`, clinic.timezone)));
  }
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(ilike(user.name, term), ilike(user.email, term), ilike(services.name, term), ilike(bookings.id, term)),
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const direction = filters.dir === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "client"
      ? user.name
      : filters.sort === "status"
        ? bookings.status
        : filters.sort === "price"
          ? bookings.priceCents
          : bookings.startAt;

  const db = getDb();
  const rows = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      clientName: user.name,
      clientEmail: user.email,
      practitionerId: bookings.practitionerId,
      practitionerName: practitioners.name,
      practitionerColor: practitioners.color,
      serviceId: bookings.serviceId,
      serviceName: services.name,
      serviceColor: services.color,
      durationMin: services.durationMin,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      priceCents: bookings.priceCents,
      clientNote: bookings.clientNote,
      internalNote: bookings.internalNote,
      cancelReason: bookings.cancelReason,
      cancelledAt: bookings.cancelledAt,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(user, eq(bookings.clientId, user.id))
    .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(where)
    .orderBy(direction(sortColumn), asc(bookings.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .innerJoin(user, eq(bookings.clientId, user.id))
    .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(where);

  return {
    rows,
    total: totalRows[0]?.count ?? 0,
    page,
    pageSize,
    timezone: clinic.timezone,
  };
}

export async function getBookingDetail(actor: AuthUser, id: string) {
  const row = (
    await getDb()
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        clientName: user.name,
        clientEmail: user.email,
        clientPhone: user.phone,
        practitionerId: bookings.practitionerId,
        practitionerName: practitioners.name,
        practitionerColor: practitioners.color,
        serviceId: bookings.serviceId,
        serviceName: services.name,
        durationMin: services.durationMin,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        priceCents: bookings.priceCents,
        clientNote: bookings.clientNote,
        internalNote: bookings.internalNote,
        cancelReason: bookings.cancelReason,
        cancelledAt: bookings.cancelledAt,
        createdBy: bookings.createdBy,
      })
      .from(bookings)
      .innerJoin(user, eq(bookings.clientId, user.id))
      .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.id, id))
  )[0];
  if (!row || bookingVisibility(actor, row) === "not_found") return null;
  return row;
}

export function toIcs(booking: {
  id: string;
  serviceName: string;
  practitionerName: string;
  startAt: Date;
  endAt: Date;
}) {
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bookwell//Cedar Physio//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@bookwell.demo`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(booking.startAt)}`,
    `DTEND:${stamp(booking.endAt)}`,
    `SUMMARY:${booking.serviceName} with ${booking.practitionerName}`,
    "LOCATION:Cedar Physio & Wellness",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
