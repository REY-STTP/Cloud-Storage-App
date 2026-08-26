# ☁️ Cloud Storage App

A full-featured, production-ready **personal cloud storage platform** built with the modern web stack. Users can securely upload, organize, rename, download, and delete files from a clean dashboard — while administrators manage the entire user base from a dedicated panel with real-time analytics.

Every file lives in a **private Cloudflare R2 bucket**. Downloads are served via **presigned URLs that expire in 60 minutes** — there are no permanent public links. Authentication is powered by **JWT sessions stored in httpOnly cookies**, and passwords are hashed with **bcrypt** (10 salt rounds).

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2-F38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## ✨ Features

### User Features
- **File Upload** — Drag-and-drop or click-to-upload with real-time progress. Supports images, videos, audio, and documents with per-category size limits.
- **File Management** — Rename, download (via presigned URL), or delete individual files.
- **Batch Operations** — Select multiple files for bulk download (streamed as a single `.zip` archive) or bulk delete.
- **Storage Quota** — Visual progress bar showing used vs. remaining storage (configurable per-user, default 1 GB).
- **Search & Pagination** — Filter files by name with cursor-based pagination.
- **Profile Management** — Update display name, change password (with current password verification), and view account details.
- **Email Verification** — Token-based email verification flow on registration with beautifully designed HTML emails.
- **Password Reset** — Forgot-password flow with time-limited reset tokens delivered via email.
- **Dark Mode** — System-aware theme toggle that persists across sessions.

### Admin Features
- **Admin Dashboard** — Overview cards showing total users, admins, banned accounts, verified users, and total storage consumed.
- **Analytics Charts** — Monthly sign-up trends and per-user storage usage visualized with interactive Recharts bar charts.
- **User Management** — Full CRUD: search users, ban/unban accounts, delete users (cascades to their files), with batch selection support.
- **Role Separation** — Admin routes (`/admin/*`) are fully separated from user routes (`/dashboard/*`) with middleware-level protection.

### Security & Infrastructure
- **Private Bucket** — All files are stored in a private Cloudflare R2 bucket. No public URLs exist by default.
- **Presigned Downloads** — Each download generates a 1-hour presigned URL. Expired links cannot be reused.
- **JWT Authentication** — Stateless sessions via signed JWTs (1-day expiry) stored in httpOnly, secure cookies.
- **bcrypt Hashing** — Passwords are hashed with bcrypt (cost factor 10) before storage. Plain-text passwords are never persisted.
- **Rate Limiting** — Fixed-window in-memory rate limiter on sign-in to prevent brute-force attacks.
- **Row Level Security** — Supabase RLS is enabled with zero policies, locking the PostgREST API completely. The app bypasses RLS as the table owner and enforces access in its own API routes.
- **Input Validation** — UUID format validation, file type/size checks, and parameterized SQL queries throughout.
- **CORS-Safe** — All API responses use `Cache-Control: no-store` headers for sensitive data.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, API Routes, Proxy middleware for route protection |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict typing across all files |
| **Database** | [Supabase Postgres](https://supabase.com/) | Connected via `pg` pool — raw parameterized SQL, no ORM |
| **Object Storage** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) | S3-compatible API via `@aws-sdk/client-s3` |
| **Authentication** | JWT + bcrypt | `jsonwebtoken` for signing/verifying, `bcryptjs` for hashing |
| **Email** | [Nodemailer](https://nodemailer.com/) | SMTP transport (Gmail, etc.) with Ethereal fallback for development |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | 25 UI components, custom design tokens |
| **Charts** | [Recharts 3](https://recharts.org/) | Interactive bar charts on the admin dashboard |
| **Animations** | [GSAP 3](https://gsap.com/) | Landing page scroll-triggered reveal animations |
| **Data Fetching** | [SWR 2](https://swr.vercel.app/) | Client-side data fetching with automatic revalidation |
| **Icons** | [Lucide React](https://lucide.dev/) | Consistent icon system across the entire UI |
| **ZIP Archiver** | [Archiver](https://www.archiverjs.com/) + [Axios](https://axios-http.com/) | Server-side ZIP streaming for batch downloads |
| **Fonts** | Google Fonts | Outfit (display), Geist (body), Geist Mono (data/code) |

---

## 📂 Project Structure

```
cloud-storage-app/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, providers, theme
│   ├── page.tsx                    # Landing page (hero, features, marquee)
│   ├── not-found.tsx               # Custom 404 page
│   ├── globals.css                 # Global styles & design tokens
│   │
│   ├── login/                      # Login page
│   ├── register/                   # Registration page
│   ├── forgot-password/            # Forgot password page
│   ├── reset-password/             # Reset password page (token-based)
│   ├── verify-email/               # Email verification page (token-based)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # User file manager (upload, list, actions)
│   │   └── profile/
│   │       └── page.tsx            # Profile settings (name, password, verification)
│   │
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout with sidebar
│   │   ├── page.tsx                # Admin overview (stats + charts)
│   │   └── users/
│   │       └── page.tsx            # User management (search, ban, delete)
│   │
│   ├── privacy/                    # Privacy policy page
│   ├── terms/                      # Terms of service page
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/              # POST — authenticate, set cookie
│       │   ├── logout/             # POST — clear cookie
│       │   ├── register/           # POST — create account, send verification
│       │   ├── verify/             # GET  — verify email token
│       │   ├── verify-request/     # POST — resend verification email
│       │   ├── forgot/             # POST — send password reset email
│       │   └── reset/              # POST — reset password with token
│       │
│       ├── files/
│       │   ├── route.ts            # GET (list + search) / POST (upload)
│       │   ├── [id]/
│       │   │   └── route.ts        # GET (download) / PATCH (rename) / DELETE
│       │   └── batch/
│       │       ├── route.ts        # DELETE — bulk delete
│       │       └── download/
│       │           └── route.ts    # POST — bulk download as ZIP
│       │
│       ├── admin/
│       │   └── users/              # GET (list) / PATCH (ban/unban) / DELETE
│       │
│       └── user/
│           ├── profile/            # GET / PATCH — profile info & update
│           └── storage/            # GET — storage quota usage
│
├── components/
│   ├── AppHeader.tsx               # Landing page header
│   ├── AppFooter.tsx               # Landing page footer
│   ├── AppNavbar.tsx               # Dashboard/profile top navbar
│   ├── AuthShell.tsx               # Shared auth page layout wrapper
│   ├── BrandMark.tsx               # SVG cloud logo (geometric brand mark)
│   ├── ThemeToggle.tsx             # Dark/light mode toggle button
│   ├── ToastProvider.tsx           # Toast notification context
│   ├── ConfirmDialogProvider.tsx   # Confirm dialog context
│   ├── SwrProvider.tsx             # SWR configuration provider
│   ├── admin/
│   │   └── AdminSidebar.tsx        # Admin panel sidebar navigation
│   ├── landing/
│   │   ├── HeroPreview.tsx         # CSS-built product preview component
│   │   ├── PinnedPrivacy.tsx       # GSAP-pinned privacy section
│   │   └── Reveal.tsx              # Scroll-triggered reveal animation
│   └── ui/                        # 25 shadcn/ui components
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── empty.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── spinner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── textarea.tsx
│       └── tooltip.tsx
│
├── lib/
│   ├── auth.ts                     # JWT sign/verify + bcrypt hash/compare
│   ├── db.ts                       # Postgres pool (pg) with int8 parser
│   ├── env.ts                      # Validated environment variables (fail-closed)
│   ├── guards.ts                   # Centralized API route guards (auth, user, admin)
│   ├── http.ts                     # Shared HTTP response helpers
│   ├── mail.ts                     # Email transporter, templates, send helpers
│   ├── rate-limit.ts               # Fixed-window in-memory rate limiter
│   ├── storage.ts                  # Cloudflare R2 client (S3-compatible)
│   ├── types.ts                    # Shared TypeScript types (UserRow, FileRow)
│   ├── users.ts                    # User lookup helpers
│   ├── useDarkMode.ts              # Dark mode hook (system-aware)
│   └── utils.ts                    # Utility functions (cn)
│
├── hooks/
│   └── use-mobile.ts               # Responsive breakpoint hook
│
├── scripts/
│   ├── seed.mjs                    # Seed initial admin account
│   └── supabase-schema.sql         # Full database schema (idempotent)
│
├── proxy.ts                        # Next.js middleware — route protection
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies and scripts
├── .env.example                    # Environment variable template
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A [Supabase](https://supabase.com) project (free tier works)
- A [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) bucket (free tier: 10 GB storage, 10M requests/month)
- *(Optional)* An SMTP service for email (Gmail App Password, Resend, etc.)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/cloud-storage-app.git
cd cloud-storage-app
npm install
```

### 2. Set Up the Database

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of [`scripts/supabase-schema.sql`](scripts/supabase-schema.sql).

   This script is **fully idempotent** — safe to re-run at any time. It creates:
   - `users` table — stores accounts with `uuid` PKs, role (`USER`/`ADMIN`), verification and ban status
   - `files` table — stores file metadata with `owner` FK that cascades on user deletion
   - `set_updated_at()` trigger function — auto-updates `updated_at` on row changes
   - Performance indexes on `owner`, `created_at`, `role`, and `banned` columns
   - **Row Level Security** with zero policies + revoked `anon`/`authenticated` access

3. Copy your connection string from **Project Settings → Database → Connection string**. Use the **Session pooler** URI (port `5432`) — it works from IPv4-only networks.

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# ──────────────── Database ────────────────
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# ──────────────── Authentication ────────────────
JWT_SECRET="generate-with: openssl rand -base64 32"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"

# ──────────────── Storage Quota ────────────────
MAX_STORAGE_BYTES=1073741824          # 1 GB per user

# ──────────────── SMTP (Email) ────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS="xxxx xxxx xxxx xxxx"       # Gmail App Password
SENDER="<no-reply@yourdomain.com>"

# ──────────────── Cloudflare R2 ────────────────
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=cloud-storage-app
R2_FOLDER=cloud-storage-app           # Optional prefix inside the bucket

# Optional: public domain (e.g. files.domain.com). Leave blank for presigned links.
R2_PUBLIC_BASE_URL=

# ──────────────── Base URL ────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **💡 Tip:** If you don't configure SMTP, the app automatically falls back to [Ethereal Email](https://ethereal.email/) in development — preview URLs are logged to the console.

### 4. Seed the Admin Account

```bash
npm run seed
```

This creates a `Super Admin` account using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env.local`. The script is safe to re-run — it skips creation if the admin already exists.

### 5. Start the Development Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — you'll see the landing page. Log in at `/login` with your admin credentials.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Next.js development server with hot reload |
| `npm run build` | Create an optimized production build |
| `npm run start` | Serve the production build locally |
| `npm run seed` | Create the initial admin account in Supabase |
| `npm run lint` | Run ESLint across the project |

---

## 🔌 API Reference

All API routes live under `/api`. Authentication is via the `token` cookie (JWT). Responses use `Content-Type: application/json` unless otherwise noted.

### Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new user account and send verification email |
| `POST` | `/api/auth/login` | Authenticate and set JWT cookie (rate-limited) |
| `POST` | `/api/auth/logout` | Clear the JWT cookie |
| `GET` | `/api/auth/verify?token=` | Verify email address with token |
| `POST` | `/api/auth/verify-request` | Resend the verification email |
| `POST` | `/api/auth/forgot` | Send a password reset email |
| `POST` | `/api/auth/reset` | Reset password using a valid token |

### Files

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/files` | List user's files (supports `?search=`, `?page=`, `?perPage=`) |
| `POST` | `/api/files` | Upload a file (multipart/form-data) |
| `GET` | `/api/files/:id` | Download a file (redirects to presigned URL) |
| `PATCH` | `/api/files/:id` | Rename a file |
| `DELETE` | `/api/files/:id` | Delete a file (removes from R2 + database) |
| `DELETE` | `/api/files/batch` | Bulk delete files by IDs |
| `POST` | `/api/files/batch/download` | Bulk download files as a `.zip` archive |

### User

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Get the authenticated user's profile |
| `PATCH` | `/api/user/profile` | Update name or password |
| `GET` | `/api/user/storage` | Get storage quota usage (`usedBytes`, `maxBytes`, `usedPercent`) |

### Admin

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | List all users with file counts and storage usage |
| `PATCH` | `/api/admin/users` | Ban or unban a user |
| `DELETE` | `/api/admin/users` | Delete a user (cascades to all their files in R2 + DB) |

---

## 📋 Allowed File Types

The upload API validates files by both **extension** and **MIME type**, with per-category size limits:

| Category | Extensions | Max Size |
| :--- | :--- | :--- |
| **Images** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`, `.ico` | 10 MB |
| **Videos** | `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`, `.webm` | 100 MB |
| **Audio** | `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`, `.aac` | 20 MB |
| **Documents** | `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv` | 50 MB |

Files that don't match any category are rejected. The overall per-user storage quota is controlled by `MAX_STORAGE_BYTES` (default: 1 GB).

---

## 🗄️ Database Schema

The application uses two tables in Supabase Postgres. The full schema is in [`scripts/supabase-schema.sql`](scripts/supabase-schema.sql).

### `users`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `uuid` | PK, auto-generated via `gen_random_uuid()` |
| `name` | `text` | Display name |
| `email` | `text` | Unique, stored lowercase |
| `password` | `text` | bcrypt hash |
| `role` | `text` | `'USER'` or `'ADMIN'` (check constraint) |
| `verified` | `boolean` | Email verification status |
| `banned` | `boolean` | Account ban status |
| `pwd_changed_at` | `timestamptz` | Set on password change — invalidates older JWTs |
| `created_at` | `timestamptz` | Auto-set on insert |
| `updated_at` | `timestamptz` | Auto-updated via trigger |

### `files`

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `uuid` | PK, auto-generated |
| `filename` | `text` | Display filename (can be renamed) |
| `original_name` | `text` | Original upload filename |
| `mime_type` | `text` | Detected MIME type |
| `resource_type` | `text` | Category (images, videos, etc.) |
| `url` | `text` | Canonical storage URL (not used for downloads) |
| `public_id` | `text` | R2 object key — used for presigning |
| `size` | `bigint` | File size in bytes |
| `owner` | `uuid` | FK → `users(id)` with `ON DELETE CASCADE` |
| `created_at` | `timestamptz` | Auto-set on insert |
| `updated_at` | `timestamptz` | Auto-updated via trigger |

### Indexes

| Index | Columns | Purpose |
| :--- | :--- | :--- |
| `files_owner_idx` | `owner` | Fast file lookups by user |
| `files_owner_created_at_idx` | `owner, created_at DESC` | Paginated file listing |
| `users_role_idx` | `role` | Filter by role in admin panel |
| `users_banned_idx` | `banned` | Filter banned users |
| `users_created_at_idx` | `created_at DESC` | Admin user listing |

### Design Notes

- Columns are `snake_case` in Postgres; SQL queries alias them to `camelCase` (e.g., `created_at AS "createdAt"`) so the API response shape stays consistent.
- `size` and `count(*)` return `bigint`; [`lib/db.ts`](lib/db.ts) registers a custom `int8` parser so they arrive as JavaScript `Number` instead of strings.
- The connection pool is created once and reused across hot reloads in development via `global.__pgPool`.

---

## 🔒 Security Model

| Concern | Implementation |
| :--- | :--- |
| **Password Storage** | bcrypt with 10 salt rounds — never stored in plain text |
| **Session Management** | JWT signed with `JWT_SECRET`, stored in `httpOnly` cookie, 1-day expiry |
| **Route Protection** | `proxy.ts` middleware redirects unauthenticated requests from `/dashboard/*` and `/admin/*` to `/login` |
| **API Authorization** | Every API route independently verifies the JWT and checks user role/status |
| **File Access** | Files are only accessible via presigned URLs generated server-side for the authenticated owner |
| **SQL Injection** | All queries use parameterized placeholders (`$1`, `$2`, …) — no string concatenation |
| **Brute Force** | Fixed-window rate limiter on login (1 attempt per key per 60s window) |
| **Password-Change Invalidation** | Sessions issued before the last password change are rejected (`pwd_changed_at > iat`) |
| **PostgREST Lockdown** | RLS enabled with zero policies; `anon` and `authenticated` roles have all privileges revoked |
| **Email Tokens** | Verification and reset tokens expire in 1 hour and are single-use JWT |
| **UUID Validation** | All route parameters are validated against UUID regex before reaching the database |

---

## 🌐 Deployment

The app can be deployed to any Node.js hosting platform. Some recommendations:

| Platform | Notes |
| :--- | :--- |
| **Vercel** | Zero-config for Next.js. Set all env vars in the dashboard. |
| **Railway** | Full Node.js support. Connect Supabase DB via `DATABASE_URL`. |
| **Fly.io** | Deploy as a Docker container with persistent connections. |
| **Self-hosted** | `npm run build` → `npm run start`. Ensure `DATABASE_URL` and R2 credentials are set. |

> **⚠️ Important:** The in-memory rate limiter works for single-instance deployments. For multi-instance or serverless environments, replace it with a shared store (Redis, Upstash, etc.) in [`lib/rate-limit.ts`](lib/rate-limit.ts).

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
