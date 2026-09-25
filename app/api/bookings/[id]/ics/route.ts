import { getBookingDetail } from "@/lib/booking-service";
import { toIcs } from "@/lib/booking-service";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { id } = await context.params;
  const booking = await getBookingDetail(user, id);
  if (!booking) return new Response("Not found", { status: 404 });
  const body = toIcs(booking);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cedar-${booking.id}.ics"`,
    },
  });
}
