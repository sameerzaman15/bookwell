import { eq, sql } from "drizzle-orm";
import {
  availabilityRules,
  bookings,
  practitionerServices,
  practitioners,
  services,
  settings,
  timeOff,
  user,
} from "@/db/schema";
import { requireRoleResult, type AuthUser } from "@/lib/authz";
import type { ActionResult, SettingsRow } from "@/lib/booking-service";
import { getDb } from "@/lib/db";
import { fromZonedTime } from "date-fns-tz";

function adminOnly(actor: AuthUser | null): ActionResult {
  const result = requireRoleResult(actor, "admin");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function saveService(
  actor: AuthUser | null,
  input: {
    id?: string;
    name: string;
    description: string;
    durationMin: number;
    bufferMin: number;
    priceCents: number;
    color: string;
    active: boolean;
    practitionerIds: string[];
  },
): Promise<ActionResult<{ id: string }>> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  const db = getDb();
  const id = input.id || crypto.randomUUID();
  await db
    .insert(services)
    .values({
      id,
      name: input.name,
      description: input.description,
      durationMin: input.durationMin,
      bufferMin: input.bufferMin,
      priceCents: input.priceCents,
      color: input.color,
      active: input.active,
    })
    .onConflictDoUpdate({
      target: services.id,
      set: {
        name: input.name,
        description: input.description,
        durationMin: input.durationMin,
        bufferMin: input.bufferMin,
        priceCents: input.priceCents,
        color: input.color,
        active: input.active,
      },
    });
  await db.delete(practitionerServices).where(eq(practitionerServices.serviceId, id));
  if (input.practitionerIds.length) {
    await db.insert(practitionerServices).values(
      input.practitionerIds.map((practitionerId) => ({ practitionerId, serviceId: id })),
    );
  }
  return { ok: true, data: { id } };
}

export async function deleteService(actor: AuthUser | null, id: string): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  const used = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(eq(bookings.serviceId, id));
  if ((used[0]?.count ?? 0) > 0) {
    return { ok: false, error: "This service has bookings, so it was kept. Mark it inactive instead." };
  }
  await getDb().delete(services).where(eq(services.id, id));
  return { ok: true };
}

export async function savePractitioner(
  actor: AuthUser | null,
  input: {
    id?: string;
    name: string;
    title: string;
    bio: string;
    color: string;
    active: boolean;
  },
): Promise<ActionResult<{ id: string }>> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  const id = input.id || crypto.randomUUID();
  await getDb()
    .insert(practitioners)
    .values({ ...input, id, createdAt: new Date() })
    .onConflictDoUpdate({
      target: practitioners.id,
      set: {
        name: input.name,
        title: input.title,
        bio: input.bio,
        color: input.color,
        active: input.active,
      },
    });
  return { ok: true, data: { id } };
}

export async function deletePractitioner(actor: AuthUser | null, id: string): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  const used = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(eq(bookings.practitionerId, id));
  if ((used[0]?.count ?? 0) > 0) {
    return { ok: false, error: "This practitioner has bookings, so the profile was kept. Mark them inactive instead." };
  }
  await getDb().delete(practitioners).where(eq(practitioners.id, id));
  return { ok: true };
}

export async function replaceAvailability(
  actor: AuthUser | null,
  practitionerId: string,
  rules: { weekday: number; startTime: string; endTime: string }[],
): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  for (const rule of rules) {
    if (rule.startTime >= rule.endTime) {
      return { ok: false, error: "Each range needs an end time after the start time." };
    }
  }
  const db = getDb();
  await db.delete(availabilityRules).where(eq(availabilityRules.practitionerId, practitionerId));
  if (rules.length) {
    await db.insert(availabilityRules).values(
      rules.map((rule) => ({
        id: crypto.randomUUID(),
        practitionerId,
        weekday: rule.weekday,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
    );
  }
  return { ok: true };
}

export async function addTimeOff(
  actor: AuthUser | null,
  input: { practitionerId: string; startsAt: Date; endsAt: Date; reason: string },
): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  if (input.endsAt <= input.startsAt) {
    return { ok: false, error: "Time off needs an end after the start." };
  }
  await getDb().insert(timeOff).values({
    id: crypto.randomUUID(),
    practitionerId: input.practitionerId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    reason: input.reason,
  });
  return { ok: true };
}

export async function deleteTimeOff(actor: AuthUser | null, id: string): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  await getDb().delete(timeOff).where(eq(timeOff.id, id));
  return { ok: true };
}

export async function saveSettings(actor: AuthUser | null, input: Omit<SettingsRow, "id" | "lastDemoResetAt">): Promise<ActionResult> {
  const allowed = adminOnly(actor);
  if (!allowed.ok) return allowed;
  await getDb()
    .insert(settings)
    .values({ id: "singleton", ...input })
    .onConflictDoUpdate({
      target: settings.id,
      set: input,
    });
  return { ok: true };
}

export function lastAttendedVisit(
  visits: readonly { startAt: Date; status: string }[],
  now: Date,
): Date | null {
  const cutoff = now.getTime();
  let latest: Date | null = null;
  for (const visit of visits) {
    if (visit.status !== "completed") continue;
    const start = visit.startAt.getTime();
    if (Number.isNaN(start) || start >= cutoff) continue;
    if (!latest || start > latest.getTime()) latest = visit.startAt;
  }
  return latest;
}

export async function listClients(now = new Date()) {
  const db = getDb();
  const [rows, visitRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        bookingCount: sql<number>`count(${bookings.id})::int`,
        lifetimeCents: sql<number>`coalesce(sum(${bookings.priceCents}) filter (where ${bookings.status} = 'completed'), 0)::int`,
      })
      .from(user)
      .leftJoin(bookings, eq(bookings.clientId, user.id))
      .where(eq(user.role, "client"))
      .groupBy(user.id)
      .orderBy(user.name),
    db
      .select({
        clientId: bookings.clientId,
        startAt: bookings.startAt,
        status: bookings.status,
      })
      .from(bookings),
  ]);

  const visitsByClient = new Map<string, { startAt: Date; status: string }[]>();
  for (const visit of visitRows) {
    const stamp = { startAt: visit.startAt, status: visit.status };
    const list = visitsByClient.get(visit.clientId);
    if (list) list.push(stamp);
    else visitsByClient.set(visit.clientId, [stamp]);
  }

  return rows.map((row) => ({
    ...row,
    lastVisit: lastAttendedVisit(visitsByClient.get(row.id) ?? [], now),
  }));
}

export async function getClientDetail(id: string) {
  const clients = await listClients();
  const client = clients.find((row) => row.id === id);
  if (!client) return null;
  const history = await getDb()
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      status: bookings.status,
      priceCents: bookings.priceCents,
      serviceName: services.name,
      practitionerName: practitioners.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
    .where(eq(bookings.clientId, id))
    .orderBy(sql`${bookings.startAt} desc`);
  return { client, history };
}

export function zonedRange(date: string, timeZone: string, endOfDay = false) {
  return fromZonedTime(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`, timeZone);
}
