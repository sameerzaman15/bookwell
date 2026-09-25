"use client";

import { Shield, UserRound } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { signInAsDemo } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DemoLoginButtons({ stacked = false }: { stacked?: boolean }) {
  const [pending, start] = useTransition();

  function enter(role: "admin" | "client") {
    start(async () => {
      const result = await signInAsDemo(role);
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <div className={stacked ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
      <div className="rounded-xl border border-border bg-card p-3">
        <Button
          type="button"
          className="h-12 w-full justify-start rounded-xl px-4 text-base"
          disabled={pending}
          onClick={() => enter("admin")}
        >
          <Shield />
          Try demo as admin
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Dashboard, calendar, and the tools to run the clinic.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full justify-start rounded-xl px-4 text-base"
          disabled={pending}
          onClick={() => enter("client")}
        >
          <UserRound />
          Try demo as client
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Book a visit, then reschedule or cancel it from the portal.
        </p>
      </div>
    </div>
  );
}
