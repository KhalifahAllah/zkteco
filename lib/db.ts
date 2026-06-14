import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool: Pool };

export const pool = globalForDb.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2, // Optimizes serverless instance limits for stable data pooling
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;