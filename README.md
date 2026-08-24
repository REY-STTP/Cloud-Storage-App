# Cloud Storage App

A cloud storage dashboard built with **Next.js 16**, **Tailwind CSS v4 + shadcn/ui**, **Supabase (Postgres)**, **Cloudflare R2**, and JWT authentication.

Users can upload, rename, download, and delete files. Admins can manage users (ban/unban/delete) from a separate dashboard.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run [`scripts/supabase-schema.sql`](scripts/supabase-schema.sql). It creates the `users` and `files` tables, the `updated_at` triggers, the indexes, and enables RLS so the auto-generated PostgREST API cannot reach these tables (the app connects as the table owner and enforces access in its own API routes).
3. Copy your connection string from **Project Settings → Database → Connection string**. Use the **session pooler** URI (port 5432) unless your host has IPv6.

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Supabase — session pooler (port 5432) works from IPv4-only networks.
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
JWT_SECRET="a-long-random-secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"
MAX_STORAGE_BYTES=1073741824
# SMTP (verification & password reset emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SENDER="<no-reply@yourdomain.com>"
# Cloudflare R2 (object storage untuk file user)
# Dash.cloudflare.com → R2 Object Storage → buat bucket + API token (Object Read & Write)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=cloud-storage-app
R2_FOLDER=cloud-storage-app
# Opsional: custom domain publik; kosongkan untuk mode privat (link presigned 1 jam)
R2_PUBLIC_BASE_URL=
```

### 4. Seed the admin account

```bash
npm run seed
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Create the initial admin account |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Next.js 16** (App Router, proxy/middleware route protection)
- **Supabase Postgres** via `pg` connection pool (raw parameterized SQL)
- **JWT auth** (httpOnly cookie) + bcrypt password hashing
- **Cloudflare R2** (S3-compatible) for file storage — private bucket with presigned download URLs
- **Tailwind CSS v4 + Bootstrap 5** for styling

## Database Notes

- Both tables use `uuid` primary keys (`gen_random_uuid()`); `files.owner` references `users(id)` with `on delete cascade`.
- Columns are `snake_case` in Postgres; queries alias them to `camelCase` (`created_at as "createdAt"`) so the API response shape is unchanged.
- `size` and `count(*)` are `bigint`; `lib/db.ts` registers an `int8` parser so they arrive as JS numbers instead of strings.
- Re-running `scripts/supabase-schema.sql` is safe — every statement is idempotent.
