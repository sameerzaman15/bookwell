import { BookingForm } from "@/components/admin/booking-form";
import { getSettings } from "@/lib/booking-service";
import { listClients } from "@/lib/catalog";
import { getAdminCatalog } from "@/lib/catalog-view";

export const metadata = { title: "New booking" };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ practitioner?: string; start?: string }>;
}) {
  const params = await searchParams;
  const [catalog, clients, clinic] = await Promise.all([getAdminCatalog(), listClients(), getSettings()]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">New booking</h1>
      {params.start && <p className="mt-1 text-sm text-muted-foreground">Suggested start: {params.start}</p>}
      <div className="mt-6">
        <BookingForm
          mode="create"
          timeZone={clinic.timezone}
          clients={clients.map((client) => ({ id: client.id, name: client.name, email: client.email }))}
          practitioners={catalog.practitionerRows.filter((row) => row.active).map((row) => ({ id: row.id, name: row.name }))}
          services={catalog.serviceRows.filter((row) => row.active).map((row) => ({ id: row.id, name: row.name }))}
          initial={params.practitioner ? {
            id: "",
            clientId: "",
            practitionerId: params.practitioner,
            serviceId: catalog.serviceRows[0]?.id ?? "",
            status: clinic.autoConfirm ? "confirmed" : "pending",
            clientNote: "",
            internalNote: "",
          } : undefined}
        />
      </div>
    </div>
  );
}
