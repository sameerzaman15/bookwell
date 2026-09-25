import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { StatusBadge } from "@/components/booking/status-badge";
import { bookings, practitioners, services } from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requirePageRole } from "@/lib/session";

export const metadata = { title: "Bookings" };

export default async function PortalBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";
  const user = await requirePageRole("client");
  const clinic = await getSettings();
  const now = new Date();
  const rows = await getDb()
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      status: bookings.status,
      serviceName: services.name,
      practitionerName: practitioners.name,
      color: practitioners.color,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(practitioners, eq(bookings.practitionerId, practitioners.id))
    .where(eq(bookings.clientId, user.id))
    .orderBy(desc(bookings.startAt));
  const visible = rows.filter((row) => (tab === "upcoming" ? row.startAt >= now : row.startAt < now));

  return (
    <div>
      <h1 className="text-3xl font-semibold">Your bookings</h1>
      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/portal/bookings?tab=upcoming" className={`rounded-full px-3 py-1 ${tab === "upcoming" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          Upcoming
        </Link>
        <Link href="/portal/bookings?tab=past" className={`rounded-full px-3 py-1 ${tab === "past" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          Past
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
        {visible.length === 0 && <li className="p-4 text-sm text-muted-foreground">No {tab} bookings.</li>}
        {visible.map((row) => (
          <li key={row.id}>
            <Link href={`/portal/bookings/${row.id}`} className="flex items-center justify-between gap-3 p-4">
              <span>
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: row.color }} />
                  {row.serviceName}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {row.practitionerName} · {formatWhen(row.startAt, clinic.timezone)}
                </span>
              </span>
              <StatusBadge status={row.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
