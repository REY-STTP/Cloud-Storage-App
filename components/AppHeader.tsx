// components/AppHeader.tsx
// Public marketing header: brand mark plus auth actions.
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
            <BrandMark className="size-6" />
          </span>
          <span className="font-heading text-[1.05rem] font-semibold tracking-tight text-foreground">
            Cloud Storage
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Login
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Get started
          </Button>
        </nav>
      </div>
    </header>
  );
}
