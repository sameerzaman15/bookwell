import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import {
  availabilityRules,
  bookings,
  practitioners,
  services,
  timeOff,
  user,
} from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";

export type RangeDays = 7 | 30 | 90;

function parseRange(value: string | undefined): RangeDays {
  if (value === "7" || value === "90") return Number(value) as RangeDays;
  return 30;
}

function dayKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

function shiftDay(day: string, amount: number, timeZone: string) {
  const noon = fromZonedTime(`${day}T12:00:00`, timeZone);
  return formatInTimeZone(addDays(noon, amount), timeZone, "yyyy-MM-dd");
}

function eachDay(start: string, end: string, timeZone: string) {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = shiftDay(cursor, 1, timeZone);
  }
  return days;
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboard(rangeParam?: string) {
  const range = parseRange(rangeParam);
  const clinic = await getSettings();
  const tz = clinic.timezone;
  const now = new Date();
  const today = dayKey(now, tz);
  const db = getDb();
  const [bookingRows, ruleRows, offRows, practitionerRows, serviceRows, clientRows] = await Promise.all([
    db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        practitionerId: bookings.practitionerId,
        serviceId: bookings.serviceId,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        priceCents: bookings.priceCents,
        practitionerName: practitioners.name,
        practitionerColor: practitioners.color,
        serviceName: services.name,
        clientName: user.name,
      })
      .from(bookings)
      .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(user, eq(bookings.clientId, user.id)),
    db.select().from(availabilityRules),
    db.select().from(timeOff),
    db.select().from(practitioners),
    db.select().from(services),
    db.select({ id: user.id, createdAt: user.createdAt, role: user.role }).from(user),
  ]);

  const historyStart = shiftDay(today, -range, tz);
  const historyPrevStart = shiftDay(today, -range * 2, tz);
  const historyPrevEnd = shiftDay(today, -range - 1, tz);
  const futureEnd = shiftDay(today, range - 1, tz);
  const futurePrevStart = shiftDay(today, -range, tz);
  const chartStart = shiftDay(today, -range, tz);
  const chartEnd = shiftDay(today, 14, tz);

  const inDayRange = (date: Date, start: string, end: string) => {
    const key = dayKey(date, tz);
    return key >= start && key <= end;
  };

  const countBookings = (start: string, end: string, statuses?: string[]) =>
    bookingRows.filter((row) => {
      if (!inDayRange(row.startAt, start, end)) return false;
      if (statuses && !statuses.includes(row.status)) return false;
      return true;
    }).length;

  const upcomingNow = countBookings(today, futureEnd, ["pending", "confirmed"]);
  const upcomingPrev = countBookings(futurePrevStart, shiftDay(today, -1, tz), ["pending", "confirmed"]);

  const revenueOf = (start: string, end: string) =>
    bookingRows
      .filter((row) => row.status === "completed" && inDayRange(row.startAt, start, end))
      .reduce((sum, row) => sum + row.priceCents, 0);
  const revenue = revenueOf(historyStart, today);
  const revenuePrev = revenueOf(historyPrevStart, historyPrevEnd);

  const rateOf = (start: string, end: string) => {
    const rows = bookingRows.filter((row) => inDayRange(row.startAt, start, end));
    if (rows.length === 0) return 0;
    const bad = rows.filter((row) => row.status === "cancelled" || row.status === "no_show").length;
    return Math.round((bad / rows.length) * 100);
  };

  const newClients = (start: string, end: string) =>
    clientRows.filter(
      (row) => row.role === "client" && inDayRange(row.createdAt, start, end),
    ).length;

  function availableMinutes(start: string, end: string, practitionerId?: string) {
    let total = 0;
    for (const day of eachDay(start, end, tz)) {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const dayStart = fromZonedTime(`${day}T00:00:00`, tz).getTime();
      const dayEnd = fromZonedTime(`${day}T23:59:59`, tz).getTime();
      for (const rule of ruleRows) {
        if (practitionerId && rule.practitionerId !== practitionerId) continue;
        if (rule.weekday !== weekday) continue;
        let minutes = minutesBetween(rule.startTime, rule.endTime);
        const ruleStart = fromZonedTime(`${day}T${rule.startTime}:00`, tz).getTime();
        const ruleEnd = fromZonedTime(`${day}T${rule.endTime}:00`, tz).getTime();
        for (const off of offRows) {
          if (off.practitionerId !== rule.practitionerId) continue;
          const overlapStart = Math.max(ruleStart, off.startsAt.getTime());
          const overlapEnd = Math.min(ruleEnd, off.endsAt.getTime());
          if (overlapEnd > overlapStart) minutes -= Math.round((overlapEnd - overlapStart) / 60000);
        }
        total += Math.max(0, minutes);
        void dayStart;
        void dayEnd;
      }
    }
    return total;
  }

  function bookedMinutes(start: string, end: string, practitionerId?: string) {
    return bookingRows
      .filter((row) => {
        if (practitionerId && row.practitionerId !== practitionerId) return false;
        if (row.status !== "pending" && row.status !== "confirmed" && row.status !== "completed") return false;
        return inDayRange(row.startAt, start, end);
      })
      .reduce((sum, row) => sum + Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000), 0);
  }

  const util = (start: string, end: string) => {
    const available = availableMinutes(start, end);
    if (available <= 0) return 0;
    return Math.round((bookedMinutes(start, end) / available) * 100);
  };

  const nextStart = today;
  const prevUtilStart = shiftDay(today, -range, tz);
  const prevUtilEnd = shiftDay(today, -1, tz);

  const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
  const perDay = eachDay(chartStart, chartEnd, tz).map((day) => {
    const entry: Record<string, string | number | boolean> = {
      day: formatInTimeZone(fromZonedTime(`${day}T12:00:00`, tz), tz, "MMM d"),
      iso: day,
      isToday: day === today,
    };
    for (const status of statuses) entry[status] = 0;
    for (const row of bookingRows) {
      if (dayKey(row.startAt, tz) !== day) continue;
      entry[row.status] = Number(entry[row.status] ?? 0) + 1;
    }
    return entry;
  });

  const revenueByService = serviceRows
    .map((service) => ({
      name: service.name,
      cents: bookingRows
        .filter(
          (row) =>
            row.serviceId === service.id &&
            row.status === "completed" &&
            inDayRange(row.startAt, historyStart, today),
        )
        .reduce((sum, row) => sum + row.priceCents, 0),
    }))
    .filter((row) => row.cents > 0);

  const utilizationByPractitioner = practitionerRows
    .filter((row) => row.active)
    .map((practitioner) => {
      const available = availableMinutes(nextStart, futureEnd, practitioner.id);
      const booked = bookedMinutes(nextStart, futureEnd, practitioner.id);
      return {
        name: practitioner.name.split(" ").slice(-1)[0] ?? practitioner.name,
        fullName: practitioner.name,
        color: practitioner.color,
        percent: available <= 0 ? 0 : Math.round((booked / available) * 100),
      };
    });

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = weekdayNames.map((name, weekday) => ({
    name,
    count: bookingRows.filter(
      (row) =>
        inDayRange(row.startAt, historyStart, today) &&
        new Date(`${dayKey(row.startAt, tz)}T12:00:00Z`).getUTCDay() === weekday,
    ).length,
  }));

  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const heatmap = weekdayNames.map((name, weekday) => ({
    name,
    cells: hours.map((hour) => ({
      hour,
      count: bookingRows.filter((row) => {
        if (!inDayRange(row.startAt, historyStart, today)) return false;
        const key = dayKey(row.startAt, tz);
        if (new Date(`${key}T12:00:00Z`).getUTCDay() !== weekday) return false;
        return Number(formatInTimeZone(row.startAt, tz, "H")) === hour;
      }).length,
    })),
  }));

  const todayRows = bookingRows
    .filter((row) => dayKey(row.startAt, tz) === today)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return {
    range,
    timezone: tz,
    businessName: clinic.businessName,
    today,
    kpis: [
      {
        label: `Bookings, next ${range} days`,
        value: String(upcomingNow),
        delta: delta(upcomingNow, upcomingPrev),
        hint: "Pending and confirmed",
      },
      {
        label: `Revenue, last ${range} days`,
        value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(revenue / 100),
        delta: delta(revenue, revenuePrev),
        hint: "Completed visits",
      },
      {
        label: `Utilization, next ${range} days`,
        value: `${util(nextStart, futureEnd)}%`,
        delta: delta(util(nextStart, futureEnd), util(prevUtilStart, prevUtilEnd)),
        hint: "Booked minutes / open minutes",
      },
      {
        label: `Cancellations and no-shows, last ${range} days`,
        value: `${rateOf(historyStart, today)}%`,
        delta: delta(rateOf(historyStart, today), rateOf(historyPrevStart, historyPrevEnd)),
        hint: "Share of visits in the period",
      },
      {
        label: `New clients, last ${range} days`,
        value: String(newClients(historyStart, today)),
        delta: delta(newClients(historyStart, today), newClients(historyPrevStart, historyPrevEnd)),
        hint: "Client accounts created",
      },
    ],
    perDay,
    todayLabel: formatInTimeZone(now, tz, "MMM d"),
    revenueByService,
    utilizationByPractitioner,
    byWeekday,
    heatmap,
    hours,
    todayRows,
    practitioners: practitionerRows,
  };
}
