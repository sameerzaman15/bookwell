"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminSetStatus } from "@/lib/actions";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/validators";

const quick: BookingStatus[] = ["confirmed", "completed", "no_show", "cancelled"];

export function TodayList({
  rows,
}: {
  rows: {
    id: string;
    serviceName: string;
    clientName: string;
    practitionerName: string;
    color: string;
    status: string;
    when: string;
  }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.practitionerName) ?? [];
    list.push(row);
    groups.set(row.practitionerName, list);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Today</h2>
      {rows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No appointments today.</p>}
      {[...groups.entries()].map(([name, items]) => (
        <div key={name} className="mt-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <span className="size-2.5 rounded-full" style={{ background: items[0]?.color }} />
            {name}
          </h3>
          <ul className="mt-2 divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.serviceName} · {item.when}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.status} />
                  {quick.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || item.status === status}
                      onClick={() => {
                        start(async () => {
                          const result = await adminSetStatus({ ids: [item.id], status });
                          if (!result.ok) toast.error(result.error);
                          else {
                            toast.success("Status updated.");
                            router.refresh();
                          }
                        });
                      }}
                    >
                      {status === "no_show" ? "No-show" : status[0].toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
