import Link from "next/link";
import { eq } from "drizzle-orm";
import { DemoLoginButtons } from "@/components/site/demo-login-buttons";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { availabilityRules, practitionerServices, practitioners, services } from "@/db/schema";
import { getSettings } from "@/lib/booking-service";
import { getDb } from "@/lib/db";
import { WEEKDAYS, formatMoney, timeZoneLabel } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  const clinic = await getSettings();
  const db = getDb();
  const [serviceRows, practitionerRows, links, rules] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(practitioners).where(eq(practitioners.active, true)),
    db.select().from(practitionerServices),
    db.select().from(availabilityRules),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              Concept demo by Sameer Zaman
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Book care without the phone tag.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Cedar Physio & Wellness is a fictional clinic. Pick a service, a practitioner, and an open time. Clients keep their visits in a portal. The owner runs the week from one dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-xl px-5">
                <Link href="/book">Book an appointment</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                <a href="#services">See services</a>
              </Button>
            </div>
          </div>
          <aside className="rounded-xl border border-border bg-[#e7efea]/60 p-5 dark:bg-secondary">
            <h2 className="text-lg font-semibold">Step into the demo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One click. No signup. Data resets every night.
            </p>
            <div className="mt-4">
              <DemoLoginButtons stacked />
            </div>
          </aside>
        </section>

        <section id="services" className="mt-16">
          <h2 className="text-2xl font-semibold">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceRows.map((service) => (
              <article key={service.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: service.color }} />
                  {service.name}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                <p className="mt-3 text-sm tabular-nums">
                  {service.durationMin} min · {formatMoney(service.priceCents)}
                </p>
              </article>
            ))}
            {serviceRows.length === 0 && (
              <p className="text-sm text-muted-foreground">Services show up after the database is seeded.</p>
            )}
          </div>
        </section>

        <section id="team" className="mt-16">
          <h2 className="text-2xl font-semibold">Practitioners</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {practitionerRows.map((person) => {
              const personRules = rules.filter((rule) => rule.practitionerId === person.id);
              const offered = links.filter((link) => link.practitionerId === person.id).length;
              return (
                <article key={person.id} className="rounded-xl border border-border bg-card p-4">
                  <div
                    className="flex size-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: person.color }}
                  >
                    {person.name.split(" ").slice(-1)[0]?.slice(0, 1)}
                  </div>
                  <h3 className="mt-3 font-semibold">{person.name}</h3>
                  <p className="text-sm text-muted-foreground">{person.title}</p>
                  <p className="mt-2 text-sm">{person.bio}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{offered} services · {personRules.length} weekly ranges</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="hours" className="mt-16 rounded-xl border border-border bg-card p-5">
          <h2 className="text-2xl font-semibold">Opening hours</h2>
          <p className="mt-1 text-sm text-muted-foreground">{timeZoneLabel(clinic.timezone)} · {clinic.businessName}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {WEEKDAYS.map((label, weekday) => {
              const ranges = rules
                .filter((rule) => rule.weekday === weekday)
                .map((rule) => `${rule.startTime} to ${rule.endTime}`);
              const unique = [...new Set(ranges)];
              return (
                <li key={label} className="flex justify-between gap-4 text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">{unique.length ? unique.join(", ") : "Closed"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
