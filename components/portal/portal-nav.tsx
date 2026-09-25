"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Plus, UserRound } from "lucide-react";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/portal", label: "Home", icon: House },
  { href: "/portal/book", label: "Book", icon: Plus },
  { href: "/portal/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export function PortalNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="font-semibold">
            Cedar Physio
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "font-semibold text-foreground" : "text-muted-foreground"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background md:hidden">
        <ul className="grid grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="sr-only">Signed in as {name}</p>
    </>
  );
}
