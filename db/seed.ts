import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  const { seedDatabase } = await import("./seed-data");
  const summary = await seedDatabase();
  console.log(`Seeded ${summary.bookings} bookings (${summary.past} past, ${summary.future} upcoming).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
