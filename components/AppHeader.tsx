// components/AppHeader.tsx
// Public marketing header: brand mark plus auth actions.
import Link from "next/link";
import { CloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  return (
    <header className="w-full border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CloudIcon className="size-4" />
          </span>
          <span className="font-heading text-[0.95rem] font-semibold tracking-tight text-foreground">
            Cloud Storage
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Login
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Register
          </Button>
        </nav>
      </div>
    </header>
  );
}
