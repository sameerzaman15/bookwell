"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { signOut } from "@/lib/actions";
import { ThemeToggle } from "@/components/site/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/services", label: "Services", icon: Sparkles },
  { href: "/admin/practitioners", label: "Practitioners", icon: UserRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <Sidebar className="top-(--demo-banner-h) h-[calc(100svh-var(--demo-banner-h))]">
      <SidebarHeader className="px-4 py-3">
        <Link href="/admin" className="font-semibold">
          Cedar Physio
        </Link>
        <p className="text-xs text-muted-foreground">Admin · {name}</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinic</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
