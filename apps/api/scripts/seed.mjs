import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL ?? "postgres://lwaye:lwaye@127.0.0.1:5432/lwaye";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedFile = path.join(rootDirectory, "db", "seed.sql");

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users_count,
        (SELECT COUNT(*)::int FROM categories) AS categories_count,
        (SELECT COUNT(*)::int FROM locations) AS locations_count
    `);

    const existing = counts.rows[0];
    if (!existing) {
      throw new Error("Unable to determine seed state");
    }

    if (existing.users_count > 0 || existing.categories_count > 0 || existing.locations_count > 0) {
      console.log("Seed skipped: staging data already present.");
      return;
    }

    const sql = readFileSync(seedFile, "utf8");
    await client.query(sql);
    console.log("Seed applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
