import { eq } from "drizzle-orm";
import { settings } from "@/db/schema";
import { seedDatabase } from "@/db/seed-data";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function reset(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  await seedDatabase();
  await getDb().update(settings).set({ lastDemoResetAt: new Date() }).where(eq(settings.id, "singleton"));
  return Response.json({ ok: true });
}

export const GET = reset;
export const POST = reset;
