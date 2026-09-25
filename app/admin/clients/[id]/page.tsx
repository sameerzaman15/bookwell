import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/booking/status-badge";
import { getSettings } from "@/lib/booking-service";
import { getClientDetail } from "@/lib/catalog";
import { formatMoney, formatWhen } from "@/lib/format";

export const metadata = { title: "Client" };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();
  const clinic = await getSettings();
  const { client, history } = detail;
  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-primary">All clients</Link>
      <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
      <p className="text-sm text-muted-foreground">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Bookings</dt><dd className="text-xl font-semibold tabular-nums">{client.bookingCount}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Last visit</dt><dd>{client.lastVisit ? formatWhen(new Date(client.lastVisit), clinic.timezone) : "None"}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Lifetime value</dt><dd className="text-xl font-semibold tabular-nums">{formatMoney(client.lifetimeCents)}</dd></div>
      </dl>
      <h2 className="mt-6 font-semibold">History</h2>
      <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
        {history.length === 0 && <li className="p-4 text-sm text-muted-foreground">No bookings yet.</li>}
        {history.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <Link href={`/admin/bookings/${row.id}`}>
              <span className="font-medium">{row.serviceName}</span>
              <span className="mt-1 block text-muted-foreground">{row.practitionerName} · {formatWhen(row.startAt, clinic.timezone)}</span>
            </Link>
            <span className="text-right">
              <StatusBadge status={row.status} />
              <span className="mt-1 block tabular-nums">{formatMoney(row.priceCents)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
