export type AppRole = "admin" | "client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  phone: string | null;
};

export type AccessResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404; error: string };

export function asRole(value: unknown): AppRole {
  return value === "admin" ? "admin" : "client";
}

export function requireUserResult(user: AuthUser | null): AccessResult {
  if (!user) return { ok: false, status: 401, error: "You need to sign in." };
  return { ok: true };
}

export function requireRoleResult(user: AuthUser | null, role: AppRole): AccessResult {
  if (!user) return { ok: false, status: 401, error: "You need to sign in." };
  if (user.role !== role) {
    return { ok: false, status: 403, error: "You do not have access to that." };
  }
  return { ok: true };
}

export function bookingVisibility(
  user: Pick<AuthUser, "id" | "role">,
  booking: { clientId: string } | null,
): "ok" | "not_found" {
  if (!booking) return "not_found";
  if (user.role !== "admin" && booking.clientId !== user.id) return "not_found";
  return "ok";
}

export function cancellationBlock(
  now: Date,
  startAt: Date,
  windowHours: number,
): string | null {
  const latestCancelAt = startAt.getTime() - windowHours * 60 * 60 * 1000;
  if (now.getTime() > latestCancelAt) {
    return `This appointment is inside the ${windowHours} hour cancellation window. Please contact the clinic if you need to change it.`;
  }
  return null;
}

export function isDemoAccount(email: string, demoEmails: string[]) {
  const normalized = email.trim().toLowerCase();
  return demoEmails.some((demo) => demo.trim().toLowerCase() === normalized);
}

export function credentialChangeBlock(email: string, demoEmails: string[]) {
  if (!isDemoAccount(email, demoEmails)) return null;
  return "This shared demo account cannot change its email or password.";
}
