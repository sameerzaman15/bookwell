import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/booking-service";
import { isDemoMode } from "@/lib/env";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const clinic = await getSettings();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes here shape new bookings. The nightly reset restores the seeded clinic.
      </p>
      <div className="mt-6">
        <SettingsForm demo={isDemoMode()} initial={clinic} />
      </div>
    </div>
  );
}
