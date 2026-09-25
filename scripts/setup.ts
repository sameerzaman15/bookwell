import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  const { runMigrations } = await import("./migrate");
  const { seedDatabase } = await import("../db/seed-data");
  await runMigrations();
  const summary = await seedDatabase();
  console.log(`Bookwell is ready. Seeded ${summary.bookings} bookings (${summary.past} past, ${summary.future} upcoming) for ${summary.clients} clients.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
