import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SiteFooter } from "@/components/site/site-footer";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requirePageRole } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("admin");
  return (
    <SidebarProvider>
      <AdminSidebar name={user.name} />
      <SidebarInset className="min-w-0">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
          <SidebarTrigger />
          <p className="text-sm text-muted-foreground">Clinic admin</p>
        </header>
        <div className="min-w-0 flex-1 px-3 py-4 md:px-6">{children}</div>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
