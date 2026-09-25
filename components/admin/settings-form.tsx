"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminResetDemo, adminSaveSettings } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const zones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "UTC",
];

export function SettingsForm({
  initial,
  demo,
}: {
  demo: boolean;
  initial: {
    businessName: string;
    timezone: string;
    slotIntervalMin: number;
    minLeadHours: number;
    maxAdvanceDays: number;
    cancellationWindowHours: number;
    autoConfirm: boolean;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid max-w-xl gap-8">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          start(async () => {
            const result = await adminSaveSettings({
              businessName: data.get("businessName"),
              timezone: data.get("timezone"),
              slotIntervalMin: Number(data.get("slotIntervalMin")),
              minLeadHours: Number(data.get("minLeadHours")),
              maxAdvanceDays: Number(data.get("maxAdvanceDays")),
              cancellationWindowHours: Number(data.get("cancellationWindowHours")),
              autoConfirm: data.get("autoConfirm") === "on",
            });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Settings saved.");
              router.refresh();
            }
          });
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" defaultValue={initial.businessName} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select id="timezone" name="timezone" defaultValue={initial.timezone} className="h-9 rounded-lg border border-input bg-background px-2">
            {!zones.includes(initial.timezone) && <option value={initial.timezone}>{initial.timezone}</option>}
            {zones.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="slotIntervalMin">Slot interval</Label>
          <select id="slotIntervalMin" name="slotIntervalMin" defaultValue={String(initial.slotIntervalMin)} className="h-9 rounded-lg border border-input bg-background px-2">
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="minLeadHours">Minimum lead time (hours)</Label>
          <Input id="minLeadHours" name="minLeadHours" type="number" defaultValue={initial.minLeadHours} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="maxAdvanceDays">Max days ahead</Label>
          <Input id="maxAdvanceDays" name="maxAdvanceDays" type="number" defaultValue={initial.maxAdvanceDays} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cancellationWindowHours">Cancellation window (hours)</Label>
          <Input id="cancellationWindowHours" name="cancellationWindowHours" type="number" defaultValue={initial.cancellationWindowHours} />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
          <span>Auto-confirm new bookings</span>
          <input type="checkbox" name="autoConfirm" defaultChecked={initial.autoConfirm} className="size-4 accent-primary" />
        </label>
        <Button type="submit" disabled={pending}>Save settings</Button>
      </form>
      {demo && (
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-semibold">Reset demo data now</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rebuilds the fictional clinic from today. Limited to once every 5 minutes.
          </p>
          <Button
            type="button"
            className="mt-3"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const result = await adminResetDemo();
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Demo data reset.");
                  router.refresh();
                }
              });
            }}
          >
            Reset demo data now
          </Button>
        </div>
      )}
    </div>
  );
}
