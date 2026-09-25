import { BookingWizard } from "@/components/booking/booking-wizard";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getBookingCatalog } from "@/lib/catalog-view";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Book" };

export default async function BookPage() {
  const [user, catalog] = await Promise.all([getCurrentUser(), getBookingCatalog()]);
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-semibold">Book an appointment</h1>
        <p className="mt-2 text-muted-foreground">Choose a time, then sign in to confirm it.</p>
        <div className="mt-6">
          <BookingWizard {...catalog} signedIn={Boolean(user)} mode="public" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
