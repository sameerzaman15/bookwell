import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type WeekdayRule = {
  practitionerId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

export type TimeOffRange = {
  practitionerId: string;
  startsAt: Date;
  endsAt: Date;
};

export type BusyBooking = {
  practitionerId: string;
  startAt: Date;
  endAt: Date;
  status: string;
};

export type AvailabilitySettings = {
  timezone: string;
  slotIntervalMin: number;
  minLeadHours: number;
  maxAdvanceDays: number;
};

export type ServiceTiming = {
  durationMin: number;
  bufferMin: number;
};

export type OpenSlot = {
  start: Date;
  end: Date;
  practitionerId: string;
};

const BLOCKING_STATUSES = new Set(["pending", "confirmed"]);

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function parseMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function calendarWeekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function maxBookableDate(now: Date, timeZone: string, maxAdvanceDays: number) {
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const noon = fromZonedTime(`${today}T12:00:00`, timeZone);
  return formatInTimeZone(addDays(noon, maxAdvanceDays), timeZone, "yyyy-MM-dd");
}

export function getOpenSlots(input: {
  rules: WeekdayRule[];
  timeOff: TimeOffRange[];
  bookings: BusyBooking[];
  service: ServiceTiming;
  settings: AvailabilitySettings;
  date: string;
  now: Date;
  practitionerIds: string[];
  mode?: "one" | "any";
}): OpenSlot[] {
  const { settings, service, date, now } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  if (service.durationMin <= 0 || settings.slotIntervalMin <= 0) return [];

  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  if (date < today) return [];
  if (date > maxBookableDate(now, settings.timezone, settings.maxAdvanceDays)) return [];

  const weekday = calendarWeekday(date);
  const leadCutoff = now.getTime() + settings.minLeadHours * 60 * 60 * 1000;
  const durationMs = service.durationMin * 60 * 1000;
  const bufferMs = service.bufferMin * 60 * 1000;

  const counts = new Map<string, number>();
  for (const id of input.practitionerIds) counts.set(id, 0);
  for (const booking of input.bookings) {
    if (booking.status === "cancelled") continue;
    counts.set(booking.practitionerId, (counts.get(booking.practitionerId) ?? 0) + 1);
  }

  const collected: OpenSlot[] = [];

  for (const practitionerId of input.practitionerIds) {
    const rules = input.rules.filter(
      (rule) => rule.practitionerId === practitionerId && rule.weekday === weekday,
    );
    const seen = new Set<number>();

    for (const rule of rules) {
      const windowStart = parseMinutes(rule.startTime);
      const windowEnd = parseMinutes(rule.endTime);
      if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) continue;

      for (
        let minute = windowStart;
        minute + service.durationMin <= windowEnd;
        minute += settings.slotIntervalMin
      ) {
        const hours = String(Math.floor(minute / 60)).padStart(2, "0");
        const mins = String(minute % 60).padStart(2, "0");
        const wall = `${hours}:${mins}`;
        const start = fromZonedTime(`${date}T${wall}:00`, settings.timezone);
        const startMs = start.getTime();
        if (Number.isNaN(startMs) || seen.has(startMs)) continue;
        if (formatInTimeZone(start, settings.timezone, "HH:mm") !== wall) continue;
        if (startMs < leadCutoff) continue;

        const endMs = startMs + durationMs;
        const blockedEnd = endMs + bufferMs;

        const hitsTimeOff = input.timeOff.some(
          (entry) =>
            entry.practitionerId === practitionerId &&
            overlaps(startMs, endMs, entry.startsAt.getTime(), entry.endsAt.getTime()),
        );
        if (hitsTimeOff) continue;

        const hitsBooking = input.bookings.some((booking) => {
          if (booking.practitionerId !== practitionerId) return false;
          if (!BLOCKING_STATUSES.has(booking.status)) return false;
          const bookingBlockedEnd = booking.endAt.getTime() + bufferMs;
          return overlaps(startMs, blockedEnd, booking.startAt.getTime(), bookingBlockedEnd);
        });
        if (hitsBooking) continue;

        seen.add(startMs);
        collected.push({
          start,
          end: new Date(endMs),
          practitionerId,
        });
      }
    }
  }

  if (input.mode !== "any") {
    return collected.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  const byStart = new Map<number, OpenSlot[]>();
  for (const slot of collected) {
    const group = byStart.get(slot.start.getTime()) ?? [];
    group.push(slot);
    byStart.set(slot.start.getTime(), group);
  }

  const chosen: OpenSlot[] = [];
  for (const group of byStart.values()) {
    group.sort((a, b) => {
      const countDiff = (counts.get(a.practitionerId) ?? 0) - (counts.get(b.practitionerId) ?? 0);
      if (countDiff !== 0) return countDiff;
      return a.practitionerId.localeCompare(b.practitionerId);
    });
    chosen.push(group[0]);
  }

  return chosen.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function groupSlotsByDayPart<T extends { start: Date }>(
  slots: T[],
  timeZone: string,
) {
  const groups: { morning: T[]; afternoon: T[]; evening: T[] } = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const slot of slots) {
    const hour = Number(formatInTimeZone(slot.start, timeZone, "H"));
    if (hour < 12) groups.morning.push(slot);
    else if (hour < 17) groups.afternoon.push(slot);
    else groups.evening.push(slot);
  }
  return groups;
}
