import { config } from "dotenv";
import { databaseTarget } from "../lib/env";

config({ path: ".env" });

async function main() {
  const target = databaseTarget();
  if (!target) {
    console.log("No DATABASE_URL or DATABASE_URL_UNPOOLED set. Skipping migrate and seed.");
    return;
  }

  console.log(`Database URL found. Migrating and seeding demo data with ${target.source}.`);
  process.env.DATABASE_URL_UNPOOLED = target.url;
  process.env.DATABASE_URL = target.url;

  const { runMigrations } = await import("./migrate");
  const { seedDatabase } = await import("../db/seed-data");
  await runMigrations();
  const summary = await seedDatabase();
  console.log(
    `Seeded ${summary.bookings} bookings (${summary.past} past, ${summary.future} upcoming) for ${summary.clients} clients.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
