import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { bookings, practitioners, services } from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";
import { formatWhen, timeZoneLabel } from "@/lib/format";
import { requirePageRole } from "@/lib/session";

export const metadata = { title: "Your portal" };

export default async function PortalHome() {
  const user = await requirePageRole("client");
  const clinic = await getSettings();
  const now = new Date();
  const upcoming = await getDb()
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      serviceName: services.name,
      practitionerName: practitioners.name,
      color: practitioners.color,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
    .where(and(eq(bookings.clientId, user.id), gte(bookings.startAt, now)))
    .orderBy(asc(bookings.startAt));
  const next = upcoming.find((row) => row.status === "confirmed" || row.status === "pending");

  return (
    <div>
      <h1 className="text-3xl font-semibold">Hello, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{timeZoneLabel(clinic.timezone)}</p>
      {next ? (
        <article className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Next appointment</p>
          <h2 className="mt-1 text-xl font-semibold">{next.serviceName}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: next.color }} />
            {next.practitionerName}
          </p>
          <p className="mt-2 text-sm">{formatWhen(next.startAt, clinic.timezone)}</p>
          <div className="mt-3">
            <StatusBadge status={next.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/bookings/${next.id}/ics`}>Add to calendar</a>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/portal/bookings/${next.id}`}>View details</Link>
            </Button>
          </div>
        </article>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-6">
          <p className="font-medium">No upcoming visits</p>
          <p className="mt-1 text-sm text-muted-foreground">Book a time when you are ready.</p>
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Coming up</h2>
        <Button asChild>
          <Link href="/portal/book">Book again</Link>
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {upcoming.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nothing on the calendar yet.</li>}
        {upcoming.map((row) => (
          <li key={row.id}>
            <Link href={`/portal/bookings/${row.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
              <span>
                <span className="block font-medium">{row.serviceName}</span>
                <span className="text-sm text-muted-foreground">{formatWhen(row.startAt, clinic.timezone)}</span>
              </span>
              <StatusBadge status={row.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
