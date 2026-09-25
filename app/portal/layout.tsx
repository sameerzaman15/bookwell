import { PortalNav } from "@/components/portal/portal-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { requirePageRole } from "@/lib/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("client");
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <PortalNav name={user.name} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
      <SiteFooter className="mb-2" />
    </div>
  );
}
