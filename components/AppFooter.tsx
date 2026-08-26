// components/AppFooter.tsx
// Public marketing footer: brand, product links, and legal links.
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function AppFooter() {
  return (
    <footer className="w-full border-t bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrandMark className="size-[18px]" />
            </span>
            <span className="font-heading text-[0.95rem] font-semibold tracking-tight text-foreground">
              Cloud Storage
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A private personal cloud drive. Your files stay in a sealed
            bucket, and every download link expires.
          </p>
        </div>

        <nav className="flex flex-col gap-8 sm:flex-row sm:gap-14" aria-label="Footer">
          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Product</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                <Link href="/register" className="transition-colors hover:text-foreground">
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  Login
                </Link>
              </li>
              <li>
                {/* prefetch={false}: jangan prefetch saat belum login, agar proxy
                    tidak menyimpan redirect /dashboard -> /login di router cache. */}
                <Link
                  href="/dashboard"
                  prefetch={false}
                  className="transition-colors hover:text-foreground"
                >
                  Your drive
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Legal</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="transition-colors hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-foreground">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="border-t">
        <div className="mx-auto w-full max-w-6xl px-5 py-4 text-xs text-muted-foreground sm:px-8">
          &copy; {new Date().getFullYear()} Cloud Storage. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
