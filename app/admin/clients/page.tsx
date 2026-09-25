import Link from "next/link";
import { listClients } from "@/lib/catalog";
import { formatMoney, formatDay } from "@/lib/format";
import { getSettings } from "@/lib/booking-service";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const [clients, clinic] = await Promise.all([listClients(), getSettings()]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Clients</h1>
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Bookings</th>
              <th className="px-3 py-2">Last visit</th>
              <th className="px-3 py-2">Lifetime value</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-border">
                <td className="px-3 py-2"><Link className="font-medium text-primary" href={`/admin/clients/${client.id}`}>{client.name}</Link></td>
                <td className="px-3 py-2">{client.email}</td>
                <td className="px-3 py-2 tabular-nums">{client.bookingCount}</td>
                <td className="px-3 py-2">{client.lastVisit ? formatDay(new Date(client.lastVisit), clinic.timezone) : "None"}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(client.lifetimeCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 grid gap-3 sm:hidden">
        {clients.map((client) => (
          <li key={client.id} className="rounded-xl border border-border p-4">
            <Link href={`/admin/clients/${client.id}`} className="font-medium">{client.name}</Link>
            <p className="text-sm text-muted-foreground">{client.email}</p>
            <p className="mt-2 text-sm tabular-nums">{client.bookingCount} bookings · {formatMoney(client.lifetimeCents)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
