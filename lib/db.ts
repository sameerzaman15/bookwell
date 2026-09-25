import { neon, neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "@/db/schema";

neonConfig.webSocketConstructor = ws;

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { bookwellDb?: Database };

function isNeonUrl(url: string) {
  return url.includes("neon.tech");
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

export function getDb() {
  if (globalForDb.bookwellDb) return globalForDb.bookwellDb;
  const url = getDatabaseUrl();
  const db = isNeonUrl(url)
    ? (drizzleNeon(new NeonPool({ connectionString: url }), { schema }) as unknown as Database)
    : drizzlePg(new PgPool({ connectionString: url }), { schema });
  globalForDb.bookwellDb = db;
  return db;
}

export async function pingDatabase() {
  const url = getDatabaseUrl();
  if (isNeonUrl(url)) {
    const sql = neon(url);
    await sql`select 1 as ok`;
    return;
  }
  const { sql } = await import("drizzle-orm");
  await getDb().execute(sql`select 1`);
}

export function isExclusionViolation(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && (current as { code?: string }).code === "23P01") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

export const SLOT_TAKEN_MESSAGE = "That time was just booked. Please pick another slot.";
