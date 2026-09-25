"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmClientBooking, fetchSlots } from "@/lib/actions";
import { formatMoney, formatTime, formatWhen, timeZoneLabel } from "@/lib/format";
import { groupSlotsByDayPart } from "@/lib/availability";

export type WizardService = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  color: string;
};

export type WizardPractitioner = {
  id: string;
  name: string;
  title: string;
  color: string;
  serviceIds: string[];
};

type Slot = {
  start: string;
  end: string;
  practitionerId: string;
  practitionerName: string;
  practitionerColor: string;
};

export function BookingWizard({
  services,
  practitioners,
  timeZone,
  signedIn,
  mode,
}: {
  services: WizardService[];
  practitioners: WizardPractitioner[];
  timeZone: string;
  signedIn: boolean;
  mode: "public" | "portal";
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [practitionerId, setPractitionerId] = useState("any");
  const [date, setDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const service = services.find((item) => item.id === serviceId);
  const choices = practitioners.filter((item) => item.serviceIds.includes(serviceId));
  const practitioner = practitioners.find((item) => item.id === (selected?.practitionerId ?? practitionerId));

  const groups = useMemo(() => {
    const dated = slots.map((slot) => ({ ...slot, startDate: new Date(slot.start) }));
    const grouped = groupSlotsByDayPart(
      dated.map((slot) => ({ ...slot, start: slot.startDate })),
      timeZone,
    );
    return grouped;
  }, [slots, timeZone]);

  function loadDay(next: Date) {
    setDate(next);
    setSelected(null);
    const day = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    start(async () => {
      const result = await fetchSlots({
        serviceId,
        practitionerId,
        date: day,
      });
      setSlots(result);
      if (result.length === 0) toast.message("No open times that day.");
    });
  }

  function confirm() {
    if (!selected || !service) return;
    if (!signedIn) {
      const next = `/${mode === "portal" ? "portal/book" : "book"}?service=${service.id}&practitioner=${selected.practitionerId}&start=${encodeURIComponent(selected.start)}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    start(async () => {
      const result = await confirmClientBooking({
        serviceId: service.id,
        practitionerId: selected.practitionerId,
        startAt: selected.start,
        clientNote: note,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Appointment booked.");
      router.push(mode === "portal" ? "/portal/bookings" : "/portal");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto text-sm lg:flex-col">
        {["Service", "Practitioner", "Date and time", "Review"].map((label, index) => (
          <li
            key={label}
            className={`rounded-xl px-3 py-2 ${step === index + 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        {step === 1 && (
          <div className="grid gap-3">
            <h2 className="text-xl font-semibold">Choose a service</h2>
            {services.filter((item) => practitioners.some((person) => person.serviceIds.includes(item.id))).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setServiceId(item.id);
                  setPractitionerId("any");
                  setSelected(null);
                  setStep(2);
                }}
                data-testid={`service-${item.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-4 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {item.durationMin} min
                  <span className="mt-1 block font-semibold">{formatMoney(item.priceCents)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <h2 className="text-xl font-semibold">Choose a practitioner</h2>
            <button
              type="button"
              className="rounded-xl border border-border p-4 text-left hover:border-primary"
              onClick={() => {
                setPractitionerId("any");
                setStep(3);
              }}
            >
              <span className="font-medium">Any available</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                We will hold the time with the practitioner who has the lightest schedule.
              </span>
            </button>
            {choices.map((person) => (
              <button
                key={person.id}
                type="button"
                data-testid={`practitioner-${person.id}`}
                className="rounded-xl border border-border p-4 text-left hover:border-primary"
                onClick={() => {
                  setPractitionerId(person.id);
                  setStep(3);
                }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: person.color }} />
                  {person.name}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{person.title}</span>
              </button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div>
              <h2 className="mb-3 text-xl font-semibold">Pick a day</h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(next) => next && loadDay(next)}
                disabled={{ before: new Date() }}
              />
              <p className="mt-2 text-xs text-muted-foreground">{timeZoneLabel(timeZone)}</p>
            </div>
            <div>
              <h3 className="font-medium">Open times</h3>
              {!date && <p className="mt-3 text-sm text-muted-foreground">Choose a date to see times.</p>}
              {date && slots.length === 0 && !pending && (
                <p className="mt-3 text-sm text-muted-foreground">Nothing open that day. Try another date.</p>
              )}
              {(["morning", "afternoon", "evening"] as const).map((part) =>
                groups[part].length ? (
                  <div key={part} className="mt-4">
                    <p className="mb-2 text-sm font-medium capitalize">{part}</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`${part} times`}>
                      {groups[part].map((slot) => {
                        const match = slots.find((item) => item.start === slot.start.toISOString() && item.practitionerId === slot.practitionerId);
                        if (!match) return null;
                        const active = selected?.start === match.start && selected.practitionerId === match.practitionerId;
                        return (
                          <button
                            key={`${match.practitionerId}-${match.start}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelected(match)}
                            data-testid="slot-pill"
                            className={`rounded-full border px-3 py-1.5 text-sm tabular-nums ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary"}`}
                          >
                            {formatTime(new Date(match.start), timeZone)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null,
              )}
              <div className="mt-6 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" data-testid="continue-time" disabled={!selected} onClick={() => setStep(4)}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && service && selected && (
          <div className="mx-auto max-w-md">
            <h2 className="text-xl font-semibold">Review and confirm</h2>
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cedar Physio & Wellness</p>
              <p className="mt-3 text-lg font-semibold">{service.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: practitioner?.color }} />
                {selected.practitionerName}
              </p>
              <p className="mt-3 text-sm">{formatWhen(new Date(selected.start), timeZone)}</p>
              <p className="text-sm text-muted-foreground">{service.durationMin} minutes</p>
              <div className="my-4 border-t border-dashed border-border" />
              <div className="flex items-center justify-between font-semibold tabular-nums">
                <span>Total</span>
                <span>{formatMoney(service.priceCents)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{timeZoneLabel(timeZone)}</p>
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="client-note">
              Note for the clinic (optional)
            </label>
            <Textarea
              id="client-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1"
              maxLength={500}
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button type="button" data-testid="confirm-booking" disabled={pending} onClick={confirm}>
                {signedIn ? "Confirm booking" : "Sign in to confirm"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
