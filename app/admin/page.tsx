import Link from "next/link";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { TodayList } from "@/components/admin/today-list";
import { formatWhen } from "@/lib/format";
import { getDashboard } from "@/lib/dashboard";
import { timeZoneLabel } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboard(params.range);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.businessName}</h1>
          <p className="text-sm text-muted-foreground">{timeZoneLabel(data.timezone)}</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin?range=${days}`}
              className={`rounded-full px-3 py-1 text-sm ${data.range === days ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {days} days
            </Link>
          ))}
        </div>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{kpi.value}</p>
            <p className={`mt-1 text-xs tabular-nums ${kpi.delta >= 0 ? "text-primary" : "text-destructive"}`}>
              {kpi.delta >= 0 ? "+" : ""}
              {kpi.delta}% vs previous
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          </article>
        ))}
      </section>
      <DashboardCharts
        perDay={data.perDay}
        todayLabel={data.todayLabel}
        revenueByService={data.revenueByService}
        utilizationByPractitioner={data.utilizationByPractitioner}
        byWeekday={data.byWeekday}
        heatmap={data.heatmap}
        hours={data.hours}
      />
      <TodayList
        rows={data.todayRows.map((row) => ({
          id: row.id,
          serviceName: row.serviceName,
          clientName: row.clientName,
          practitionerName: row.practitionerName,
          color: row.practitionerColor,
          status: row.status,
          when: formatWhen(row.startAt, data.timezone),
        }))}
      />
    </div>
  );
}
