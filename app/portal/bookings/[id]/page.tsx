import Link from "next/link";
import { notFound } from "next/navigation";
import { ManageBooking } from "@/components/booking/manage-booking";
import { StatusBadge } from "@/components/booking/status-badge";
import { Button } from "@/components/ui/button";
import { cancellationBlock } from "@/lib/authz";
import { getBookingDetail, getSettings } from "@/lib/booking-service";
import { formatMoney, formatWhen, timeZoneLabel } from "@/lib/format";
import { requirePageRole } from "@/lib/session";

export const metadata = { title: "Booking" };

export default async function PortalBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole("client");
  const booking = await getBookingDetail(user, id);
  if (!booking) notFound();
  const clinic = await getSettings();
  const movable = booking.status === "pending" || booking.status === "confirmed";
  const block = cancellationBlock(new Date(), booking.startAt, clinic.cancellationWindowHours);

  return (
    <div className="max-w-xl">
      <Link href="/portal/bookings" className="text-sm text-primary">
        All bookings
      </Link>
      <h1 className="mt-2 text-3xl font-semibold">{booking.serviceName}</h1>
      <div className="mt-3">
        <StatusBadge status={booking.status} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Practitioner</dt>
          <dd className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: booking.practitionerColor }} />
            {booking.practitionerName}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">When</dt>
          <dd>{formatWhen(booking.startAt, clinic.timezone)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Length</dt>
          <dd>{booking.durationMin} min</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="tabular-nums">{formatMoney(booking.priceCents)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">{timeZoneLabel(clinic.timezone)}</p>
      {booking.clientNote && <p className="mt-4 text-sm">Note: {booking.clientNote}</p>}
      <Button asChild variant="outline" className="mt-4">
        <a href={`/api/bookings/${booking.id}/ics`}>Add to calendar</a>
      </Button>
      {movable && (
        <ManageBooking
          id={booking.id}
          serviceId={booking.serviceId}
          practitionerId={booking.practitionerId}
          timeZone={clinic.timezone}
          canCancel={!block}
          cancelMessage={block}
        />
      )}
    </div>
  );
}
