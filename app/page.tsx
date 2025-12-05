import Link from "next/link";

export default function Home() {
  return (
    <main className="home-landing min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full grid gap-10 md:grid-cols-2 items-center">
        <section className="space-y-6">
          <span className="landing-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] shadow-sm">
            ☁️ Simple Cloud Storage
          </span>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Store, manage, and control your files
            </h1>
            <p className="text-sm md:text-base leading-relaxed opacity-80">
              A minimal cloud storage dashboard with role-based access.
              Users can upload, rename, download, and delete files. Admin
              can manage users, ban accounts, and clean up data — all secured
              with JWT authentication.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/register"
              className="btn btn-primary px-4 py-2 rounded-full shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
            >
              Get Started – Register
            </Link>

            <Link
              href="/login"
              className="btn btn-outline-secondary px-4 py-2 rounded-full border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5"
            >
              Login
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="landing-pill inline-flex items-center gap-1 rounded-full px-3 py-1">
              <span>✅</span> JWT Auth
            </span>
            <span className="landing-pill inline-flex items-center gap-1 rounded-full px-3 py-1">
              <span>🗂️</span> File CRUD
            </span>
            <span className="landing-pill inline-flex items-center gap-1 rounded-full px-3 py-1">
              <span>🛡️</span> Admin Dashboard
            </span>
          </div>
        </section>

        <section className="relative">
          <div className="absolute -top-6 -right-4 h-24 w-24 rounded-full bg-sky-400/40 blur-3xl" />
          <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-emerald-400/40 blur-3xl" />

          <div className="landing-card relative rounded-3xl border border-slate-200/70 shadow-2xl backdrop-blur-md p-5 space-y-4">
            
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-medium opacity-70">
                Dashboard preview
              </span>
            </div>

            <div className="flex gap-2 text-xs mb-2">
              <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-50">
                User
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                Admin
              </span>
            </div>

            <div className="landing-mini-card rounded-2xl border border-slate-200 text-xs overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-200 flex justify-between">
                <span className="font-medium">Files</span>
                <span className="text-[10px] opacity-70">3 items</span>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">report-q1.pdf</p>
                    <p className="text-[10px] opacity-70">
                      1.2 MB • Uploaded today
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px]">
                    ✓ Synced
                  </span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">design.sketch</p>
                    <p className="text-[10px] opacity-70">
                      8.4 MB • Edited 3h ago
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-600 px-2 py-0.5 text-[10px]">
                    ⏳ In use
                  </span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">invoice-0325.xlsx</p>
                    <p className="text-[10px] opacity-70">
                      320 KB • Shared
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-500/10 text-slate-600 px-2 py-0.5 text-[10px]">
                    🔗 Shared
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] mt-2">
              <div className="landing-mini-card rounded-2xl border border-slate-200 p-3 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  🧑‍💼 Admin tools
                </p>
                <p className="opacity-80">
                  Ban users, reset access, and remove all user files with one
                  click.
                </p>
              </div>
              <div className="landing-mini-card rounded-2xl border border-slate-200 p-3 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  🔐 Secure by design
                </p>
                <p className="opacity-80">
                  JWT-based auth, role-based routing, and protected dashboards.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
