"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const statusConfig = {
  confirmed: { label: "Confirmed", theme: { light: "#3F6B5B", dark: "#8FBFA9" } },
  pending: { label: "Pending", theme: { light: "#D59B2D", dark: "#E0B85A" } },
  completed: { label: "Completed", theme: { light: "#64748B", dark: "#94A3B8" } },
  cancelled: { label: "Cancelled", theme: { light: "#BE4B5A", dark: "#E07A86" } },
  no_show: { label: "No-show", theme: { light: "#A8A29E", dark: "#C8C0B4" } },
} satisfies ChartConfig;

const revenueConfig = {
  cents: { label: "Revenue", theme: { light: "#3F6B5B", dark: "#8FBFA9" } },
} satisfies ChartConfig;

const utilConfig = {
  percent: { label: "Utilization", theme: { light: "#C2703D", dark: "#E0915E" } },
} satisfies ChartConfig;

export function DashboardCharts({
  perDay,
  todayLabel,
  revenueByService,
  utilizationByPractitioner,
  byWeekday,
  heatmap,
  hours,
}: {
  perDay: Record<string, string | number | boolean>[];
  todayLabel: string;
  revenueByService: { name: string; cents: number }[];
  utilizationByPractitioner: { name: string; percent: number; color: string }[];
  byWeekday: { name: string; count: number }[];
  heatmap: { name: string; cells: { hour: number; count: number }[] }[];
  hours: number[];
}) {
  const maxHeat = Math.max(1, ...heatmap.flatMap((row) => row.cells.map((cell) => cell.count)));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4 xl:col-span-2">
        <h2 className="font-semibold">Bookings per day</h2>
        <ChartContainer config={statusConfig} className="mt-3 aspect-[16/7] w-full">
          <BarChart data={perDay}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={todayLabel} stroke="var(--accent)" strokeDasharray="3 3" />
            <Bar dataKey="confirmed" stackId="s" fill="var(--color-confirmed)" />
            <Bar dataKey="pending" stackId="s" fill="var(--color-pending)" />
            <Bar dataKey="completed" stackId="s" fill="var(--color-completed)" />
            <Bar dataKey="cancelled" stackId="s" fill="var(--color-cancelled)" />
            <Bar dataKey="no_show" stackId="s" fill="var(--color-no_show)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Revenue by service</h2>
        <ChartContainer config={revenueConfig} className="mt-3 aspect-[4/3] w-full">
          <BarChart data={revenueByService.map((row) => ({ ...row, dollars: Math.round(row.cents / 100) }))}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-20} height={70} textAnchor="end" />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="dollars" fill="var(--color-cents)" radius={6} />
          </BarChart>
        </ChartContainer>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Utilization by practitioner</h2>
        <ChartContainer config={utilConfig} className="mt-3 aspect-[4/3] w-full">
          <BarChart data={utilizationByPractitioner} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" unit="%" tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={72} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="percent" fill="var(--color-percent)" radius={6} />
          </BarChart>
        </ChartContainer>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Bookings by weekday</h2>
        <ChartContainer config={{ count: { label: "Bookings", theme: { light: "#5B8C8A", dark: "#5B8C8A" } } }} className="mt-3 aspect-[4/3] w-full">
          <BarChart data={byWeekday}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} />
          </BarChart>
        </ChartContainer>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Busiest hours</h2>
        <div className="mt-3 overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-[48px_repeat(14,minmax(0,1fr))] gap-1 text-[10px] text-muted-foreground">
            <span />
            {hours.map((hour) => (
              <span key={hour} className="text-center tabular-nums">
                {hour}
              </span>
            ))}
            {heatmap.map((row) => (
              <div key={row.name} className="contents">
                <span className="self-center">{row.name}</span>
                {row.cells.map((cell) => (
                  <span
                    key={`${row.name}-${cell.hour}`}
                    title={`${row.name} ${cell.hour}:00, ${cell.count} bookings`}
                    className="aspect-square rounded-sm"
                    style={{
                      background: `color-mix(in srgb, var(--primary) ${Math.round((cell.count / maxHeat) * 100)}%, var(--muted))`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
