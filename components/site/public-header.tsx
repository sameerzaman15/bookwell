import Link from "next/link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/authz";

export function PublicHeader({ user }: { user: AuthUser | null }) {
  return (
    <header className="border-b border-border bg-background/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Cedar Physio
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link href="/#services">Services</Link>
          <Link href="/#team">Practitioners</Link>
          <Link href="/#hours">Hours</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button asChild className="rounded-xl">
              <Link href={user.role === "admin" ? "/admin" : "/portal"}>
                {user.role === "admin" ? "Admin" : "Portal"}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
