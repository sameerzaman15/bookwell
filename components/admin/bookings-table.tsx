"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import { adminSetStatus } from "@/lib/actions";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { BookingStatus } from "@/lib/validators";

export type BookingRow = {
  id: string;
  clientName: string;
  practitionerName: string;
  practitionerColor: string;
  serviceName: string;
  when: string;
  status: string;
  price: string;
};

export function BookingsTable({
  rows,
  page,
  pageSize,
  total,
  query,
}: {
  rows: BookingRow[];
  page: number;
  pageSize: number;
  total: number;
  query: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(rows, (state, update: { ids: string[]; status: string }) =>
    state.map((row) => (update.ids.includes(row.id) ? { ...row, status: update.status } : row)),
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = Object.entries(selected).filter(([, on]) => on).map(([id]) => id);

  const columns = useMemo<LegacyColumnDef<BookingRow>[]>(
    () => [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <Checkbox
            checked={Boolean(selected[row.original.id])}
            onCheckedChange={(value) => setSelected((current) => ({ ...current, [row.original.id]: Boolean(value) }))}
            aria-label={`Select ${row.original.clientName}`}
          />
        ),
      },
      { accessorKey: "when", header: "When" },
      { accessorKey: "clientName", header: "Client" },
      {
        accessorKey: "practitionerName",
        header: "Practitioner",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: row.original.practitionerColor }} />
            {row.original.practitionerName}
          </span>
        ),
      },
      { accessorKey: "serviceName", header: "Service" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      { accessorKey: "price", header: "Price" },
      {
        id: "open",
        header: "",
        cell: ({ row }) => (
          <Link href={`/admin/bookings/${row.original.id}`} className="text-sm font-medium text-primary">
            Open
          </Link>
        ),
      },
    ],
    [selected],
  );

  const table = useLegacyTable({ data: optimistic, columns, getCoreRowModel: getCoreRowModel() });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function bulk(status: BookingStatus) {
    if (selectedIds.length === 0) {
      toast.error("Select at least one booking.");
      return;
    }
    start(async () => {
      setOptimistic({ ids: selectedIds, status });
      const result = await adminSetStatus({ ids: selectedIds, status });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Status updated.");
        setSelected({});
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => bulk("completed")}>
          Mark completed
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => bulk("no_show")}>
          Mark no-show
        </Button>
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 sm:hidden">
        {optimistic.map((row) => (
          <li key={row.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.clientName}</p>
                <p className="text-sm text-muted-foreground">{row.serviceName}</p>
                <p className="mt-1 text-sm">{row.when}</p>
                <p className="mt-1 flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: row.practitionerColor }} />
                  {row.practitionerName}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(selected[row.id])}
                  onCheckedChange={(value) => setSelected((current) => ({ ...current, [row.id]: Boolean(value) }))}
                />
                Select
              </label>
              <Link href={`/admin/bookings/${row.id}`} className="text-sm font-medium text-primary">
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {optimistic.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No bookings match these filters.</p>}
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total} bookings · page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={`/admin/bookings?${query}&page=${page - 1}`}>Previous</Link>
          </Button>
          <Button asChild variant="outline" size="sm" disabled={page >= pages}>
            <Link href={`/admin/bookings?${query}&page=${page + 1}`}>Next</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
