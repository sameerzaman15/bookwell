import { notFound } from "next/navigation";
import { BookingForm } from "@/components/admin/booking-form";
import { getBookingDetail, getSettings } from "@/lib/booking-service";
import { listClients } from "@/lib/catalog";
import { getAdminCatalog } from "@/lib/catalog-view";
import { formatWhen } from "@/lib/format";
import { requirePageRole } from "@/lib/session";

export const metadata = { title: "Edit booking" };

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageRole("admin");
  const booking = await getBookingDetail(actor, id);
  if (!booking) notFound();
  const [catalog, clients, clinic] = await Promise.all([getAdminCatalog(), listClients(), getSettings()]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">{formatWhen(booking.startAt, clinic.timezone)}</p>
      <div className="mt-6">
        <BookingForm
          mode="edit"
          timeZone={clinic.timezone}
          clients={clients.map((client) => ({ id: client.id, name: client.name, email: client.email }))}
          practitioners={catalog.practitionerRows.map((row) => ({ id: row.id, name: row.name }))}
          services={catalog.serviceRows.map((row) => ({ id: row.id, name: row.name }))}
          initial={{
            id: booking.id,
            clientId: booking.clientId,
            practitionerId: booking.practitionerId,
            serviceId: booking.serviceId,
            status: booking.status,
            clientNote: booking.clientNote ?? "",
            internalNote: booking.internalNote ?? "",
          }}
        />
      </div>
    </div>
  );
}
