import { Pool } from "pg";

const defaultDatabaseUrl = "postgres://lwaye:lwaye@127.0.0.1:5432/lwaye";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl
});

