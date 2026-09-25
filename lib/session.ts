import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { asRole, type AuthUser } from "@/lib/authz";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  const user = session.user as typeof session.user & {
    role?: string | null;
    phone?: string | null;
  };
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: asRole(user.role),
    phone: user.phone ?? null,
  };
}

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageRole(role: "admin" | "client") {
  const user = await requirePageUser();
  if (user.role !== role) {
    redirect(user.role === "admin" ? "/admin" : "/portal");
  }
  return user;
}
