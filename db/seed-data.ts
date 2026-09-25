import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { sql } from "drizzle-orm";
import {
  account,
  availabilityRules,
  bookings,
  practitionerServices,
  practitioners,
  services,
  settings,
  timeOff,
  user,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { businessTimeZone } from "@/lib/env";

const MAYA = "prac_maya_chen";
const OMAR = "prac_omar_haddad";
const LENA = "prac_lena_brooks";

const SERVICE = {
  initial: "svc_initial",
  follow: "svc_follow",
  massage: "svc_massage",
  needling: "svc_needling",
  pilates: "svc_pilates",
  posture: "svc_posture",
} as const;

const CLIENT_NOTES = [
  "First visit.",
  "Please text when I arrive.",
  "Afternoon times work best.",
  "I will be a few minutes early.",
  null,
  null,
  null,
];

const INTERNAL_NOTES = [
  "Front desk confirmed the time.",
  "Asked for a quiet room.",
  "Prefers the same practitioner next time.",
  null,
  null,
  null,
];

type Svc = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  color: string;
};

const SERVICE_ROWS: Svc[] = [
  {
    id: SERVICE.initial,
    name: "Initial assessment",
    description: "A first visit to talk through your goals and sketch a plan.",
    durationMin: 60,
    bufferMin: 15,
    priceCents: 9500,
    color: "#3F6B5B",
  },
  {
    id: SERVICE.follow,
    name: "Follow-up",
    description: "A shorter return visit to keep the plan moving.",
    durationMin: 30,
    bufferMin: 10,
    priceCents: 6000,
    color: "#5B8C8A",
  },
  {
    id: SERVICE.massage,
    name: "Sports massage",
    description: "A hands-on session aimed at recovery after training.",
    durationMin: 45,
    bufferMin: 15,
    priceCents: 7500,
    color: "#C2703D",
  },
  {
    id: SERVICE.needling,
    name: "Dry needling",
    description: "A short session focused on tight muscles.",
    durationMin: 30,
    bufferMin: 10,
    priceCents: 6500,
    color: "#D59B2D",
  },
  {
    id: SERVICE.pilates,
    name: "Clinical pilates 1:1",
    description: "A one to one movement session for strength and control.",
    durationMin: 55,
    bufferMin: 10,
    priceCents: 8000,
    color: "#5B8C8A",
  },
  {
    id: SERVICE.posture,
    name: "Posture review",
    description: "A brief look at how you sit, stand, and move day to day.",
    durationMin: 20,
    bufferMin: 10,
    priceCents: 4000,
    color: "#D9C3A0",
  },
];

function dayString(today: string, offset: number, timeZone: string) {
  const noon = fromZonedTime(`${today}T12:00:00`, timeZone);
  return formatInTimeZone(addDays(noon, offset), timeZone, "yyyy-MM-dd");
}

function atTime(day: string, time: string, timeZone: string) {
  return fromZonedTime(`${day}T${time}:00`, timeZone);
}

export async function seedDatabase() {
  const adminEmail = process.env.DEMO_ADMIN_EMAIL;
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const clientEmail = process.env.DEMO_CLIENT_EMAIL;
  const clientPassword = process.env.DEMO_CLIENT_PASSWORD;
  if (!adminEmail || !adminPassword || !clientEmail || !clientPassword) {
    throw new Error("DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CLIENT_EMAIL, and DEMO_CLIENT_PASSWORD are required to seed.");
  }

  faker.seed(20260925);
  const db = getDb();
  const timeZone = businessTimeZone();
  const now = new Date();
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");

  await db.execute(sql`
    TRUNCATE TABLE
      bookings,
      time_off,
      availability_rules,
      practitioner_services,
      services,
      practitioners,
      settings,
      session,
      account,
      verification,
      "user"
    RESTART IDENTITY CASCADE
  `);

  async function insertUser(input: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: "admin" | "client";
    phone: string | null;
    createdAt: Date;
  }) {
    const passwordHash = await hashPassword(input.password);
    await db.insert(user).values({
      id: input.id,
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
      role: input.role,
      phone: input.phone,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
    await db.insert(account).values({
      id: `acct_${input.id}`,
      accountId: input.id,
      providerId: "credential",
      userId: input.id,
      password: passwordHash,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
  }

  await insertUser({
    id: "user_admin",
    name: "Jordan Hale",
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    phone: "555-010-1000",
    createdAt: atTime(dayString(today, -80, timeZone), "09:00", timeZone),
  });
  await insertUser({
    id: "user_demo_client",
    name: "Alex Rivera",
    email: clientEmail,
    password: clientPassword,
    role: "client",
    phone: "555-010-1001",
    createdAt: atTime(dayString(today, -40, timeZone), "09:00", timeZone),
  });

  const clientIds: string[] = ["user_demo_client"];
  for (let index = 1; index <= 30; index += 1) {
    const id = `user_client_${String(index).padStart(2, "0")}`;
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const createdOffset = faker.number.int({ min: 1, max: 70 });
    await insertUser({
      id,
      name: `${first} ${last}`,
      email: faker.internet.email({ firstName: first, lastName: last, provider: "example.com" }).toLowerCase(),
      password: "SeededClient123",
      role: "client",
      phone: `555-010-${String(1100 + index)}`,
      createdAt: atTime(dayString(today, -createdOffset, timeZone), "10:00", timeZone),
    });
    clientIds.push(id);
  }

  await db.insert(practitioners).values([
    {
      id: MAYA,
      name: "Dr. Maya Chen",
      title: "Physiotherapist",
      bio: "Maya likes unhurried first visits and a clear plan you can follow at home.",
      color: "#3F6B5B",
      active: true,
      createdAt: now,
    },
    {
      id: OMAR,
      name: "Omar Haddad",
      title: "Sports massage therapist",
      bio: "Omar focuses on recovery after training. Evenings and Saturday mornings fill first.",
      color: "#C2703D",
      active: true,
      createdAt: now,
    },
    {
      id: LENA,
      name: "Lena Brooks",
      title: "Pilates instructor",
      bio: "Lena keeps sessions steady, practical, and encouraging.",
      color: "#5B8C8A",
      active: true,
      createdAt: now,
    },
  ]);

  await db.insert(services).values(SERVICE_ROWS.map((service) => ({ ...service, active: true })));

  const links: { practitionerId: string; serviceId: string }[] = [
    [MAYA, SERVICE.initial],
    [MAYA, SERVICE.follow],
    [MAYA, SERVICE.needling],
    [MAYA, SERVICE.posture],
    [OMAR, SERVICE.massage],
    [OMAR, SERVICE.follow],
    [LENA, SERVICE.pilates],
    [LENA, SERVICE.posture],
    [LENA, SERVICE.follow],
  ].map(([practitionerId, serviceId]) => ({ practitionerId, serviceId }));
  await db.insert(practitionerServices).values(links);

  const rules: { id: string; practitionerId: string; weekday: number; startTime: string; endTime: string }[] = [];
  const addRule = (practitionerId: string, weekday: number, startTime: string, endTime: string) => {
    rules.push({
      id: `rule_${practitionerId}_${weekday}_${startTime}`,
      practitionerId,
      weekday,
      startTime,
      endTime,
    });
  };
  for (const weekday of [1, 2, 3, 4, 5]) {
    if (weekday === 3) {
      addRule(MAYA, weekday, "09:00", "12:00");
      addRule(MAYA, weekday, "13:00", "18:00");
    } else {
      addRule(MAYA, weekday, "09:00", "17:00");
    }
    addRule(OMAR, weekday, "12:00", "20:00");
  }
  addRule(OMAR, 6, "08:00", "13:00");
  for (const weekday of [2, 3, 4, 5]) addRule(LENA, weekday, "08:00", "16:00");
  addRule(LENA, 6, "09:00", "13:00");
  await db.insert(availabilityRules).values(rules);

  const timeOffStart = atTime(dayString(today, 3, timeZone), "00:00", timeZone);
  const timeOffEnd = atTime(dayString(today, 6, timeZone), "00:00", timeZone);
  await db.insert(timeOff).values({
    id: "timeoff_lena_workshop",
    practitionerId: LENA,
    startsAt: timeOffStart,
    endsAt: timeOffEnd,
    reason: "Teaching workshop",
  });

  await db.insert(settings).values({
    id: "singleton",
    businessName: "Cedar Physio & Wellness",
    timezone: timeZone,
    slotIntervalMin: 30,
    minLeadHours: 2,
    maxAdvanceDays: 21,
    cancellationWindowHours: 24,
    autoConfirm: true,
    lastDemoResetAt: null,
  });

  const serviceById = new Map(SERVICE_ROWS.map((service) => [service.id, service]));
  const offers = new Map<string, string[]>([
    [MAYA, [SERVICE.initial, SERVICE.follow, SERVICE.needling, SERVICE.posture]],
    [OMAR, [SERVICE.massage, SERVICE.follow]],
    [LENA, [SERVICE.pilates, SERVICE.posture, SERVICE.follow]],
  ]);
  const hours = new Map<string, Map<number, { start: string; end: string }[]>>();
  for (const rule of rules) {
    const byDay = hours.get(rule.practitionerId) ?? new Map();
    const list = byDay.get(rule.weekday) ?? [];
    list.push({ start: rule.startTime, end: rule.endTime });
    byDay.set(rule.weekday, list);
    hours.set(rule.practitionerId, byDay);
  }

  const busy = new Map<string, { start: number; end: number }[]>();
  const rows: (typeof bookings.$inferInsert)[] = [];

  function overlaps(practitionerId: string, start: number, end: number) {
    return (busy.get(practitionerId) ?? []).some((item) => start < item.end && item.start < end);
  }
  function occupy(practitionerId: string, start: number, end: number) {
    const list = busy.get(practitionerId) ?? [];
    list.push({ start, end });
    busy.set(practitionerId, list);
  }
  function onTimeOff(practitionerId: string, start: Date, end: Date) {
    if (practitionerId !== LENA) return false;
    return start < timeOffEnd && timeOffStart < end;
  }

  function pushBooking(input: {
    id: string;
    clientId: string;
    practitionerId: string;
    serviceId: string;
    start: Date;
    createdBy: string;
  }) {
    const service = serviceById.get(input.serviceId);
    if (!service) return false;
    const end = new Date(input.start.getTime() + service.durationMin * 60 * 1000);
    if (overlaps(input.practitionerId, input.start.getTime(), end.getTime())) return false;
    if (onTimeOff(input.practitionerId, input.start, end)) return false;
    occupy(input.practitionerId, input.start.getTime(), end.getTime());
    const past = input.start.getTime() < now.getTime();
    let status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show" = "confirmed";
    if (past) {
      const roll = faker.number.float({ min: 0, max: 1 });
      if (roll < 0.7) status = "completed";
      else if (roll < 0.82) status = "cancelled";
      else if (roll < 0.87) status = "no_show";
      else status = "completed";
    } else {
      status = faker.number.float({ min: 0, max: 1 }) < 0.12 ? "pending" : "confirmed";
    }
    rows.push({
      id: input.id,
      clientId: input.clientId,
      practitionerId: input.practitionerId,
      serviceId: input.serviceId,
      startAt: input.start,
      endAt: end,
      status,
      priceCents: service.priceCents,
      clientNote: faker.helpers.arrayElement(CLIENT_NOTES),
      internalNote: faker.helpers.arrayElement(INTERNAL_NOTES),
      createdBy: input.createdBy,
      cancelledAt: status === "cancelled" ? input.start : null,
      cancelReason: status === "cancelled" ? "Schedule changed." : null,
      createdAt: input.start,
      updatedAt: input.start,
    });
    return true;
  }

  const demoPlan = [
    { offset: -21, time: "10:00", practitionerId: MAYA, serviceId: SERVICE.initial },
    { offset: -12, time: "14:00", practitionerId: MAYA, serviceId: SERVICE.follow },
    { offset: -5, time: "17:00", practitionerId: OMAR, serviceId: SERVICE.massage },
    { offset: 4, time: "11:00", practitionerId: LENA, serviceId: SERVICE.pilates },
    { offset: 11, time: "09:30", practitionerId: MAYA, serviceId: SERVICE.follow },
  ];
  demoPlan.forEach((plan, index) => {
    for (let shift = 0; shift < 8; shift += 1) {
      const signed = plan.offset < 0 ? plan.offset - shift : plan.offset + shift;
      const day = dayString(today, signed, timeZone);
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const windows = hours.get(plan.practitionerId)?.get(weekday) ?? [];
      const fits = windows.some((window) => plan.time >= window.start && plan.time < window.end);
      if (!fits) continue;
      const placed = pushBooking({
        id: `book_demo_${index + 1}`,
        clientId: "user_demo_client",
        practitionerId: plan.practitionerId,
        serviceId: plan.serviceId,
        start: atTime(day, plan.time, timeZone),
        createdBy: "user_demo_client",
      });
      if (placed) {
        const row = rows.at(-1);
        if (row && plan.offset < 0) row.status = "completed";
        if (row && plan.offset > 0) row.status = "confirmed";
        if (row) {
          row.cancelledAt = null;
          row.cancelReason = null;
          row.clientNote = index === 0 ? "First visit." : "Please text when I arrive.";
          row.internalNote = null;
        }
        break;
      }
    }
  });

  let sequence = 1;
  const practitionerIds = [MAYA, OMAR, LENA];
  const otherClients = clientIds.filter((id) => id !== "user_demo_client");

  function fillRange(startOffset: number, endOffset: number, target: number, perDay: number, boost: number) {
    for (let offset = startOffset; offset <= endOffset && rows.length < target; offset += 1) {
      const day = dayString(today, offset, timeZone);
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      let placedToday = 0;
      for (const practitionerId of practitionerIds) {
        if (rows.length >= target || placedToday >= perDay) break;
        const windows = hours.get(practitionerId)?.get(weekday) ?? [];
        for (const window of windows) {
          const [sh, sm] = window.start.split(":").map(Number);
          const [eh, em] = window.end.split(":").map(Number);
          for (let minute = sh * 60 + sm; minute + 30 <= eh * 60 + em; minute += 30) {
            if (rows.length >= target || placedToday >= perDay) break;
            const hh = String(Math.floor(minute / 60)).padStart(2, "0");
            const mm = String(minute % 60).padStart(2, "0");
            const hour = Math.floor(minute / 60);
            let chance = 0.22 + boost;
            if (weekday >= 1 && weekday <= 5 && hour >= 16) chance = 0.55 + boost;
            else if (weekday === 6 && hour < 12) chance = 0.62 + boost;
            else if (weekday === 0) chance = 0.04;
            const serviceId = faker.helpers.arrayElement(offers.get(practitionerId) ?? []);
            const service = serviceById.get(serviceId);
            if (!service || minute + service.durationMin > eh * 60 + em) continue;
            if (faker.number.float({ min: 0, max: 1 }) > chance) continue;
            const placed = pushBooking({
              id: `book_${String(sequence).padStart(4, "0")}`,
              clientId: faker.helpers.arrayElement(otherClients),
              practitionerId,
              serviceId,
              start: atTime(day, `${hh}:${mm}`, timeZone),
              createdBy: "user_admin",
            });
            if (placed) {
              sequence += 1;
              placedToday += 1;
            }
          }
        }
      }
    }
  }

  fillRange(1, 21, 500, 4, 0.12);
  fillRange(-60, 0, 350, 7, 0);

  if (rows.length) await db.insert(bookings).values(rows);

  const past = rows.filter((row) => row.startAt < now).length;
  const future = rows.length - past;
  return { bookings: rows.length, past, future, clients: clientIds.length, today };
}
