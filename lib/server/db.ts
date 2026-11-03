import "server-only";
import { Pool } from "pg";

/**
 * Database connection for Installer.report agency features
 * Uses the same Postgres connection as Bops persist layer
 */

let pool: Pool | null = null;

export function getDb(): Pool {
  if (pool) return pool;
  
  const connectionString = process.env.BOPS_DATABASE_URL;
  if (!connectionString) {
    throw new Error('BOPS_DATABASE_URL not configured');
  }
  
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  return pool;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const db = getDb();
  const result = await db.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount,
  };
}
