"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelClientBooking, fetchSlots, rescheduleClientBooking } from "@/lib/actions";
import { formatTime, timeZoneLabel } from "@/lib/format";

export function ManageBooking({
  id,
  serviceId,
  practitionerId,
  timeZone,
  canCancel,
  cancelMessage,
}: {
  id: string;
  serviceId: string;
  practitionerId: string;
  timeZone: string;
  canCancel: boolean;
  cancelMessage: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<{ start: string; practitionerId: string }[]>([]);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="mt-6 grid gap-4">
      <div className="rounded-xl border border-border p-4">
        <h2 className="font-semibold">Reschedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick a new open time with the same practitioner.</p>
        <Button type="button" className="mt-3" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide times" : "Choose a new time"}
        </Button>
        {open && (
          <div className="mt-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(next) => {
                if (!next) return;
                setDate(next);
                const day = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
                start(async () => {
                  const result = await fetchSlots({ serviceId, practitionerId, date: day, ignoreBookingId: id });
                  setSlots(result.map((slot) => ({ start: slot.start, practitionerId: slot.practitionerId })));
                });
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">{timeZoneLabel(timeZone)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.start}
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  data-testid="reschedule-slot"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const result = await rescheduleClientBooking({
                        id,
                        practitionerId: slot.practitionerId,
                        startAt: slot.start,
                      });
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success("Appointment moved.");
                        router.refresh();
                        setOpen(false);
                      }
                    });
                  }}
                >
                  {formatTime(new Date(slot.start), timeZone)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <form
        className="rounded-xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await cancelClientBooking({ id, reason });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Appointment cancelled.");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">Cancel</h2>
        {cancelMessage ? (
          <p className="mt-2 text-sm text-destructive" role="status">
            {cancelMessage}
          </p>
        ) : (
          <>
            <label htmlFor="reason" className="mt-3 block text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1" />
            <Button type="submit" variant="destructive" className="mt-3" disabled={pending || !canCancel}>
              Cancel appointment
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
