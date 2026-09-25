/** US Eastern. Used when BUSINESS_TIMEZONE is omitted or not a real IANA name. */
export const DEFAULT_BUSINESS_TIMEZONE = "America/New_York";

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

export function isIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function businessTimeZone() {
  const configured = process.env.BUSINESS_TIMEZONE?.trim();
  if (configured && isIanaTimeZone(configured)) return configured;
  return DEFAULT_BUSINESS_TIMEZONE;
}

export function databaseTarget(): { url: string; source: "DATABASE_URL_UNPOOLED" | "DATABASE_URL" } | null {
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (unpooled) return { url: unpooled, source: "DATABASE_URL_UNPOOLED" };
  const pooled = process.env.DATABASE_URL?.trim();
  if (pooled) return { url: pooled, source: "DATABASE_URL" };
  return null;
}

export function demoEmails() {
  return [process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_CLIENT_EMAIL].filter(
    (value): value is string => Boolean(value),
  );
}

export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export function databaseUrl() {
  return databaseTarget()?.url ?? "";
}
