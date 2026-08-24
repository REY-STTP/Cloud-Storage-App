// scripts/seed.mjs — create the initial admin account in Supabase (Postgres).
import { config as loadEnv } from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";

// Next.js reads .env.local first; mirror that order here.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Please define the DATABASE_URL environment variable in .env.local");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL_DISABLED === "true"
    ? false
    : { rejectUnauthorized: false },
});

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin123!";

  const existing = await pool.query("select id from users where email = $1 limit 1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    console.log("Admin already exists:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    `insert into users (name, email, password, role, verified, banned)
     values ($1, $2, $3, 'ADMIN', true, false)`,
    ["Super Admin", email, hashed]
  );

  console.log("Admin created:");
  console.log("Email   :", email);
  console.log("Password:", password);
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    try { await pool.end(); } catch {}
    process.exit(1);
  });
