import { ServiceManager } from "@/components/admin/service-manager";
import { getAdminCatalog } from "@/lib/catalog-view";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const catalog = await getAdminCatalog();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Services</h1>
      <div className="mt-4">
        <ServiceManager
          practitioners={catalog.practitionerRows.map((row) => ({ id: row.id, name: row.name }))}
          services={catalog.serviceRows.map((service) => ({
            ...service,
            practitionerIds: catalog.links.filter((link) => link.serviceId === service.id).map((link) => link.practitionerId),
          }))}
        />
      </div>
    </div>
  );
}
