// app/not-found.tsx
import Link from "next/link";
import { CloudOffIcon, HouseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="hero-wash flex min-h-dvh flex-col items-center justify-center px-5 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border bg-card text-muted-foreground shadow-card">
        <CloudOffIcon className="size-6" />
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        This page isn&rsquo;t in storage
      </h1>
      <p className="mt-4 max-w-[44ch] leading-relaxed text-muted-foreground">
        The address may be mistyped, or the page moved. Your files are safe —
        they live in your dashboard, not here.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>
          <HouseIcon data-icon="inline-start" />
          Back to home
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" prefetch={false} />}>
          Go to your drive
        </Button>
      </div>
    </main>
  );
}
