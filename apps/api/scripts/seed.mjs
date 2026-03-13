import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL ?? "postgres://lwaye:lwaye@127.0.0.1:5432/lwaye";
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedFile = path.join(rootDirectory, "db", "seed.sql");

const localizationPatchSql = `
  UPDATE categories
  SET label_am = CASE id
    WHEN 'cat-electronics' THEN 'ኤሌክትሮኒክስ'
    WHEN 'cat-phones' THEN 'ስልኮች'
    WHEN 'cat-home' THEN 'የቤት ዕቃዎች'
    WHEN 'cat-fashion' THEN 'ፋሽን'
    WHEN 'cat-baby' THEN 'የሕፃናት ዕቃዎች'
    ELSE label_am
  END
  WHERE id IN ('cat-electronics', 'cat-phones', 'cat-home', 'cat-fashion', 'cat-baby');

  UPDATE locations
  SET area_label_am = CASE id
    WHEN 'loc-bole' THEN 'ቦሌ'
    WHEN 'loc-kirkos' THEN 'ቂርቆስ'
    WHEN 'loc-yeka' THEN 'የካ'
    WHEN 'loc-arada' THEN 'አራዳ'
    ELSE area_label_am
  END
  WHERE id IN ('loc-bole', 'loc-kirkos', 'loc-yeka', 'loc-arada');
`;

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

    if (existing.users_count === 0 && existing.categories_count === 0 && existing.locations_count === 0) {
      const sql = readFileSync(seedFile, "utf8");
      await client.query(sql);
      console.log("Seed applied successfully.");
      return;
    }

    await client.query(localizationPatchSql);
    console.log("Seed skipped: staging data already present. Applied localization patch.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
