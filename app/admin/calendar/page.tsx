import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { and, gte, lt } from "drizzle-orm";
import { bookings, practitioners } from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";
import { WEEKDAYS } from "@/lib/format";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const clinic = await getSettings();
  const tz = clinic.timezone;
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? params.week! : today;
  const noon = fromZonedTime(`${anchor}T12:00:00`, tz);
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = formatInTimeZone(addDays(noon, mondayOffset), tz, "yyyy-MM-dd");
  const days = Array.from({ length: 7 }, (_, index) => formatInTimeZone(addDays(fromZonedTime(`${monday}T12:00:00`, tz), index), tz, "yyyy-MM-dd"));
  const rangeStart = fromZonedTime(`${days[0]}T00:00:00`, tz);
  const rangeEnd = fromZonedTime(`${days[6]}T23:59:59`, tz);
  const people = await getDb().select().from(practitioners);
  const rows = await getDb()
    .select()
    .from(bookings)
    .where(and(gte(bookings.startAt, rangeStart), lt(bookings.startAt, rangeEnd)));
  const prev = formatInTimeZone(addDays(fromZonedTime(`${monday}T12:00:00`, tz), -7), tz, "yyyy-MM-dd");
  const next = formatInTimeZone(addDays(fromZonedTime(`${monday}T12:00:00`, tz), 7), tz, "yyyy-MM-dd");
  const hours = Array.from({ length: 24 }, (_, index) => 8 * 60 + index * 30);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex gap-2 text-sm">
          <Link className="rounded-full bg-secondary px-3 py-1" href={`/admin/calendar?week=${prev}`}>Previous week</Link>
          <Link className="rounded-full bg-secondary px-3 py-1" href={`/admin/calendar?week=${today}`}>This week</Link>
          <Link className="rounded-full bg-secondary px-3 py-1" href={`/admin/calendar?week=${next}`}>Next week</Link>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        {people.map((person) => (
          <section key={person.id} className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: person.color }} />
              {person.name}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {days.map((day) => {
                const dayBookings = rows.filter(
                  (row) => row.practitionerId === person.id && formatInTimeZone(row.startAt, tz, "yyyy-MM-dd") === day,
                );
                return (
                  <div key={day} className={`rounded-lg border p-2 ${day === today ? "border-accent" : "border-border"}`}>
                    <p className="text-xs font-medium">
                      {WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]?.slice(0, 3)} {day.slice(8)}
                    </p>
                    <div className="relative mt-2 h-64">
                      {hours.filter((_, index) => index % 2 === 0).map((minute) => (
                        <Link
                          key={minute}
                          href={`/admin/bookings/new?practitioner=${person.id}&start=${encodeURIComponent(fromZonedTime(`${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`, tz).toISOString())}`}
                          className="absolute inset-x-0 block h-8 border-t border-dashed border-border/70 text-[10px] text-muted-foreground hover:bg-secondary/60"
                          style={{ top: ((minute - 8 * 60) / 30) * 16 }}
                          aria-label={`Create booking ${day} ${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`}
                        >
                          {String(Math.floor(minute / 60)).padStart(2, "0")}:00
                        </Link>
                      ))}
                      {dayBookings.map((row) => {
                        const startMin = Number(formatInTimeZone(row.startAt, tz, "H")) * 60 + Number(formatInTimeZone(row.startAt, tz, "m"));
                        const endMin = Number(formatInTimeZone(row.endAt, tz, "H")) * 60 + Number(formatInTimeZone(row.endAt, tz, "m"));
                        const top = ((startMin - 8 * 60) / 30) * 16;
                        const height = Math.max(18, ((endMin - startMin) / 30) * 16);
                        return (
                          <Link
                            key={row.id}
                            href={`/admin/bookings/${row.id}`}
                            className="absolute inset-x-1 z-10 overflow-hidden rounded-md px-1 py-0.5 text-[10px] text-white"
                            style={{ top, height, background: person.color }}
                          >
                            {formatInTimeZone(row.startAt, tz, "h:mm a")}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
