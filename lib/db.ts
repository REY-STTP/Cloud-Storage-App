// lib/db.ts
// Postgres connection pool (Supabase) — shared across API routes.
import pg from "pg";

// By default node-postgres returns bigint (int8) as a string to avoid precision
// loss. File sizes and row counts here are far below Number.MAX_SAFE_INTEGER,
// and the frontend expects plain numbers, so parse them eagerly.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "Please define the DATABASE_URL environment variable in .env.local (Supabase connection string)"
  );
}

declare global {
  var __pgPool: pg.Pool | undefined;
}

function createPool(): pg.Pool {
  // M-8: TLS selalu aktif, namun verifikasi sertifikat ketat bersifat opt-in
  // karena Supabase pooler memakai chain yang tidak ada di trust store Node
  // (terbukti gagal saat audit). Cara benar mengaktifkan strict:
  //   DATABASE_SSL_STRICT=true + unduh CA Supabase lalu set NODE_EXTRA_CA_CERTS.
  const sslDisabled = process.env.DATABASE_SSL_DISABLED === "true";
  const strict = process.env.DATABASE_SSL_STRICT === "true";
  return new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: sslDisabled ? false : { rejectUnauthorized: strict },
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
}

// Reuse a single pool across hot reloads in development.
const pool = global.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}

export { pool };

/** Run a parameterized query. */
export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
