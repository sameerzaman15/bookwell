import { eq } from "drizzle-orm";
import { availabilityRules, practitionerServices, practitioners, services, timeOff } from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";

export async function getBookingCatalog() {
  const db = getDb();
  const clinic = await getSettings();
  const [serviceRows, practitionerRows, links] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(practitioners).where(eq(practitioners.active, true)),
    db.select().from(practitionerServices),
  ]);
  return {
    timeZone: clinic.timezone,
    services: serviceRows.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
      color: service.color,
    })),
    practitioners: practitionerRows.map((person) => ({
      id: person.id,
      name: person.name,
      title: person.title,
      color: person.color,
      serviceIds: links.filter((link) => link.practitionerId === person.id).map((link) => link.serviceId),
    })),
  };
}

export async function getAdminCatalog() {
  const db = getDb();
  const [serviceRows, practitionerRows, links, rules, off] = await Promise.all([
    db.select().from(services),
    db.select().from(practitioners),
    db.select().from(practitionerServices),
    db.select().from(availabilityRules),
    db.select().from(timeOff),
  ]);
  return { serviceRows, practitionerRows, links, rules, off };
}
