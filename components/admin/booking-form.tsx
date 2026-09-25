"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminCreateBooking, adminDeleteBooking, adminUpdateBooking, fetchSlots } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTime } from "@/lib/format";
import { bookingStatuses, type BookingStatus } from "@/lib/validators";

type Person = { id: string; name: string; color?: string; title?: string; email?: string };
type ServiceOption = { id: string; name: string };

export function BookingForm({
  mode,
  clients,
  practitioners,
  services,
  timeZone,
  initial,
}: {
  mode: "create" | "edit";
  clients: Person[];
  practitioners: Person[];
  services: ServiceOption[];
  timeZone: string;
  initial?: {
    id: string;
    clientId: string;
    practitionerId: string;
    serviceId: string;
    status: string;
    clientNote: string;
    internalNote: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [openClients, setOpenClients] = useState(false);
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? services[0]?.id ?? "");
  const [practitionerId, setPractitionerId] = useState(initial?.practitionerId ?? practitioners[0]?.id ?? "");
  const [status, setStatus] = useState<BookingStatus>((initial?.status as BookingStatus) || "confirmed");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ start: string; practitionerId: string }[]>([]);
  const [startAt, setStartAt] = useState("");
  const client = clients.find((item) => item.id === clientId);

  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const payload = {
          id: initial?.id,
          clientId,
          serviceId,
          practitionerId,
          startAt: startAt || undefined,
          status,
          clientNote: String(data.get("clientNote") ?? ""),
          internalNote: String(data.get("internalNote") ?? ""),
        };
        start(async () => {
          const result = mode === "create" ? await adminCreateBooking(payload) : await adminUpdateBooking(payload);
          if (result && !result.ok) toast.error(result.error);
          else if (mode === "edit") {
            toast.success("Booking saved.");
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label>Client</Label>
        <Popover open={openClients} onOpenChange={setOpenClients}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="justify-start">
              {client ? `${client.name} (${client.email})` : "Search clients"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name" />
              <CommandList>
                <CommandEmpty>No clients.</CommandEmpty>
                <CommandGroup>
                  {clients.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} ${item.email}`}
                      onSelect={() => {
                        setClientId(item.id);
                        setOpenClients(false);
                      }}
                    >
                      {item.name}
                      <span className="ml-2 text-xs text-muted-foreground">{item.email}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="service">Service</Label>
        <select id="service" className="h-9 rounded-lg border border-input bg-background px-2" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="practitioner">Practitioner</Label>
        <select id="practitioner" className="h-9 rounded-lg border border-input bg-background px-2" value={practitionerId} onChange={(event) => setPractitionerId(event.target.value)}>
          {practitioners.map((person) => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(event) => {
            const next = event.target.value;
            setDate(next);
            start(async () => {
              const result = await fetchSlots({ serviceId, practitionerId, date: next, ignoreBookingId: initial?.id });
              setSlots(result);
            });
          }}
        />
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              aria-pressed={startAt === slot.start}
              className={`rounded-full border px-3 py-1 text-sm ${startAt === slot.start ? "bg-primary text-primary-foreground" : "border-border"}`}
              onClick={() => {
                setStartAt(slot.start);
                setPractitionerId(slot.practitionerId);
              }}
            >
              {formatTime(new Date(slot.start), timeZone)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select id="status" className="h-9 rounded-lg border border-input bg-background px-2" value={status} onChange={(event) => setStatus(event.target.value as BookingStatus)}>
          {bookingStatuses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="clientNote">Client note</Label>
        <Textarea id="clientNote" name="clientNote" defaultValue={initial?.clientNote ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="internalNote">Internal note</Label>
        <Textarea id="internalNote" name="internalNote" defaultValue={initial?.internalNote ?? ""} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{mode === "create" ? "Create booking" : "Save changes"}</Button>
        {mode === "edit" && initial && (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this booking?")) return;
              start(async () => {
                const result = await adminDeleteBooking(initial.id);
                if (result && !result.ok) toast.error(result.error);
              });
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
