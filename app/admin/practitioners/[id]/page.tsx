import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { PractitionerForm } from "@/components/admin/practitioner-form";
import { getSettings } from "@/lib/booking-service";
import { getAdminCatalog } from "@/lib/catalog-view";

export const metadata = { title: "Practitioner" };

export default async function PractitionerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [catalog, clinic] = await Promise.all([getAdminCatalog(), getSettings()]);
  const person = catalog.practitionerRows.find((row) => row.id === id);
  if (!person) notFound();
  return (
    <div className="grid gap-6">
      <Link href="/admin/practitioners" className="text-sm text-primary">All practitioners</Link>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <PractitionerForm
          initial={{
            id: person.id,
            name: person.name,
            title: person.title,
            bio: person.bio,
            color: person.color,
            active: person.active,
          }}
        />
        <AvailabilityEditor
          practitionerId={person.id}
          timeZone={clinic.timezone}
          rules={catalog.rules
            .filter((rule) => rule.practitionerId === person.id)
            .map((rule) => ({ weekday: rule.weekday, startTime: rule.startTime, endTime: rule.endTime }))}
          timeOff={catalog.off
            .filter((entry) => entry.practitionerId === person.id)
            .map((entry) => ({
              id: entry.id,
              startsAt: entry.startsAt.toISOString(),
              endsAt: entry.endsAt.toISOString(),
              reason: entry.reason,
            }))}
        />
      </div>
    </div>
  );
}
