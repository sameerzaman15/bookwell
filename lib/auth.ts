import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { authSchema } from "@/db/schema";
import { getDb } from "@/lib/db";

const globalForAuth = globalThis as unknown as {
  bookwellAuth?: ReturnType<typeof createAuth>;
};

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: authSchema,
    }),
    secret: process.env.BETTER_AUTH_SECRET || "build-time-placeholder-secret-not-for-sessions",
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "client",
          input: false,
        },
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
    },
    trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
      (value): value is string => Boolean(value),
    ),
    plugins: [nextCookies()],
  });
}

export function getAuth() {
  if (!globalForAuth.bookwellAuth) globalForAuth.bookwellAuth = createAuth();
  return globalForAuth.bookwellAuth;
}
