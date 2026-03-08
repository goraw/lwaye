import { Pool } from "pg";

const defaultDatabaseUrl = "postgres://lwaye:lwaye@localhost:5432/lwaye";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl
});
