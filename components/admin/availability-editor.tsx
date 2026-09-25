"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminAddTimeOff, adminDeleteTimeOff, adminSaveAvailability } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEEKDAYS, formatWhen } from "@/lib/format";

type Rule = { weekday: number; startTime: string; endTime: string };

export function AvailabilityEditor({
  practitionerId,
  rules,
  timeOff,
  timeZone,
}: {
  practitionerId: string;
  rules: Rule[];
  timeOff: { id: string; startsAt: string; endsAt: string; reason: string }[];
  timeZone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Rule[]>(rules);

  function update(index: number, patch: Partial<Rule>) {
    setDraft((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
  }

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await adminSaveAvailability({ practitionerId, rules: draft });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Hours saved.");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">Weekly hours</h2>
        {WEEKDAYS.map((label, weekday) => (
          <div key={label} className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium">{label}</p>
            <div className="mt-2 grid gap-2">
              {draft.map((rule, index) =>
                rule.weekday === weekday ? (
                  <div key={`${weekday}-${index}`} className="flex flex-wrap items-center gap-2">
                    <Input aria-label={`${label} start`} type="time" value={rule.startTime} onChange={(event) => update(index, { startTime: event.target.value })} className="w-32" />
                    <span className="text-sm">to</span>
                    <Input aria-label={`${label} end`} type="time" value={rule.endTime} onChange={(event) => update(index, { endTime: event.target.value })} className="w-32" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((current) => current.filter((_, ruleIndex) => ruleIndex !== index))}>
                      Remove
                    </Button>
                  </div>
                ) : null,
              )}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDraft((current) => [...current, { weekday, startTime: "09:00", endTime: "17:00" }])}>
              Add range
            </Button>
          </div>
        ))}
        <Button type="submit" disabled={pending}>Save hours</Button>
      </form>
      <div>
        <h2 className="font-semibold">Time off</h2>
        <ul className="mt-2 grid gap-2">
          {timeOff.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <span>
                {formatWhen(new Date(entry.startsAt), timeZone)} to {formatWhen(new Date(entry.endsAt), timeZone)}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  start(async () => {
                    const result = await adminDeleteTimeOff(entry.id, practitionerId);
                    if (!result.ok) toast.error(result.error);
                    else router.refresh();
                  });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
          {timeOff.length === 0 && <li className="text-sm text-muted-foreground">No time off.</li>}
        </ul>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            start(async () => {
              const result = await adminAddTimeOff({
                practitionerId,
                startsAt: new Date(String(data.get("startsAt"))).toISOString(),
                endsAt: new Date(String(data.get("endsAt"))).toISOString(),
                reason: data.get("reason"),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Time off added.");
                form.reset();
                router.refresh();
              }
            });
          }}
        >
          <Input aria-label="Time off starts" type="datetime-local" name="startsAt" required />
          <Input aria-label="Time off ends" type="datetime-local" name="endsAt" required />
          <Input aria-label="Reason" name="reason" placeholder="Reason" className="sm:col-span-2" />
          <Button type="submit" variant="secondary" disabled={pending}>Add time off</Button>
        </form>
      </div>
    </div>
  );
}
