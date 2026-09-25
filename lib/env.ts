export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

export function businessTimeZone() {
  return process.env.BUSINESS_TIMEZONE || "America/New_York";
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
  return process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
}
