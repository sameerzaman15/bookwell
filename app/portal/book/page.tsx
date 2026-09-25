import { BookingWizard } from "@/components/booking/booking-wizard";
import { getBookingCatalog } from "@/lib/catalog-view";

export const metadata = { title: "Book" };

export default async function PortalBookPage() {
  const catalog = await getBookingCatalog();
  return (
    <div>
      <h1 className="text-3xl font-semibold">Book a visit</h1>
      <p className="mt-1 text-muted-foreground">Four short steps. You can change your mind before confirming.</p>
      <div className="mt-6">
        <BookingWizard {...catalog} signedIn mode="portal" />
      </div>
    </div>
  );
}
