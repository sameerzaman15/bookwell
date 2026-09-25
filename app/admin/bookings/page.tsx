import Link from "next/link";
import { BookingsTable } from "@/components/admin/bookings-table";
import { Button } from "@/components/ui/button";
import { queryBookings } from "@/lib/booking-service";
import { getAdminCatalog } from "@/lib/catalog-view";
import { formatMoney, formatWhen } from "@/lib/format";
import { bookingStatuses } from "@/lib/validators";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const data = await queryBookings({
    search: params.q,
    status: params.status,
    practitionerId: params.practitioner,
    serviceId: params.service,
    from: params.from,
    to: params.to,
    sort: (params.sort as "startAt" | "client" | "status" | "price") || "startAt",
    dir: params.dir === "asc" ? "asc" : "desc",
    page,
    pageSize: 20,
  });
  const catalog = await getAdminCatalog();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Button asChild>
          <Link href="/admin/bookings/new">New booking</Link>
        </Button>
      </div>
      <form className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6" action="/admin/bookings">
        <input name="q" defaultValue={params.q} placeholder="Search" aria-label="Search bookings" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
        <select name="status" defaultValue={params.status ?? ""} aria-label="Status" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          <option value="">Any status</option>
          {bookingStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select name="practitioner" defaultValue={params.practitioner ?? ""} aria-label="Practitioner" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          <option value="">Any practitioner</option>
          {catalog.practitionerRows.map((person) => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </select>
        <select name="service" defaultValue={params.service ?? ""} aria-label="Service" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          <option value="">Any service</option>
          {catalog.serviceRows.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={params.from} aria-label="From date" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" />
        <input type="date" name="to" defaultValue={params.to} aria-label="To date" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" />
        <Button type="submit" variant="secondary" className="sm:col-span-2">Apply filters</Button>
      </form>
      <div className="mt-4">
        <BookingsTable
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          query={query.toString()}
          rows={data.rows.map((row) => ({
            id: row.id,
            clientName: row.clientName,
            practitionerName: row.practitionerName,
            practitionerColor: row.practitionerColor,
            serviceName: row.serviceName,
            when: formatWhen(row.startAt, data.timezone),
            status: row.status,
            price: formatMoney(row.priceCents),
          }))}
        />
      </div>
    </div>
  );
}
