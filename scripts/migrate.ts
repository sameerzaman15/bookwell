import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

config({ path: ".env" });

export async function runMigrations() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL or DATABASE_URL_UNPOOLED before migrating.");
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS btree_gist`);
  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING gist (
          practitioner_id WITH =,
          tstzrange(start_at, end_at, '[)') WITH &&
        )
        WHERE (status IN ('pending', 'confirmed'));
    EXCEPTION
      WHEN duplicate_table OR duplicate_object THEN NULL;
    END $$;
  `);
  await pool.end();
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied.");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
