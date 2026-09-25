"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminDeleteService, adminSaveService } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  color: string;
  active: boolean;
  practitionerIds: string[];
};

export function ServiceManager({
  services,
  practitioners,
}: {
  services: ServiceItem[];
  practitioners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const blank: ServiceItem = {
    id: "",
    name: "",
    description: "",
    durationMin: 30,
    bufferMin: 10,
    priceCents: 6000,
    color: "#3F6B5B",
    active: true,
    practitionerIds: practitioners.slice(0, 1).map((person) => person.id),
  };

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const practitionerIds = practitioners.filter((person) => data.get(`p-${person.id}`) === "on").map((person) => person.id);
    start(async () => {
      const result = await adminSaveService({
        id: editing?.id || undefined,
        name: data.get("name"),
        description: data.get("description"),
        durationMin: Number(data.get("durationMin")),
        bufferMin: Number(data.get("bufferMin")),
        priceCents: Math.round(Number(data.get("price")) * 100),
        color: data.get("color"),
        active: data.get("active") === "on",
        practitionerIds,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Service saved.");
        setEditing(null);
        router.refresh();
      }
    });
  }

  const current = editing ?? blank;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ul className="grid gap-3">
        {services.map((service) => (
          <li key={service.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: service.color }} />
                  {service.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                <p className="mt-2 text-sm tabular-nums">
                  {service.durationMin} min · buffer {service.bufferMin} min · {formatMoney(service.priceCents)} · {service.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(service)}>Edit</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm("Delete this service?")) return;
                    start(async () => {
                      const result = await adminDeleteService(service.id);
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success("Service deleted.");
                        router.refresh();
                      }
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form key={current.id || "new"} onSubmit={save} className="grid h-fit gap-3 rounded-xl border border-border p-4">
        <h2 className="font-semibold">{editing?.id ? "Edit service" : "New service"}</h2>
        <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={current.name} required /></div>
        <div className="grid gap-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={current.description} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5"><Label htmlFor="durationMin">Duration</Label><Input id="durationMin" name="durationMin" type="number" defaultValue={current.durationMin} /></div>
          <div className="grid gap-1.5"><Label htmlFor="bufferMin">Buffer</Label><Input id="bufferMin" name="bufferMin" type="number" defaultValue={current.bufferMin} /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor="price">Price (USD)</Label><Input id="price" name="price" type="number" step="0.01" defaultValue={(current.priceCents / 100).toFixed(2)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" defaultValue={current.color} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={current.active} /> Active</label>
        <fieldset>
          <legend className="text-sm font-medium">Practitioners</legend>
          <div className="mt-2 grid gap-1">
            {practitioners.map((person) => (
              <label key={person.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`p-${person.id}`} defaultChecked={current.practitionerIds.includes(person.id)} />
                {person.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={pending}>Save service</Button>
        {editing && <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Clear</Button>}
      </form>
    </div>
  );
}
