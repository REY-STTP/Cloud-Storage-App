// components/AppNavbar.tsx
// Shared top navigation for dashboard, admin, and profile pages.
"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppNavbarProps {
  title: string;
  brandHref?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  children?: ReactNode;
}

export default function AppNavbar({
  title,
  brandHref = "/dashboard",
  search,
  children,
}: AppNavbarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchField = (autoFocus = false) => (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={search!.value}
        onChange={(e) => search!.onChange(e.target.value)}
        placeholder={search!.placeholder}
        aria-label={search!.placeholder}
        autoFocus={autoFocus}
        className="pr-8 pl-8"
      />
      {search!.value && (
        <button
          type="button"
          onClick={() => search!.onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={brandHref} className="flex items-center gap-2.5 no-underline">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrandMark className="size-[18px]" />
          </span>
          <span className="font-heading text-[0.95rem] font-semibold tracking-tight text-foreground">
            {title}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {search && (
            <>
              <div className="hidden md:block">{searchField()}</div>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label="Toggle search"
                aria-expanded={mobileSearchOpen}
              >
                <SearchIcon />
              </Button>
            </>
          )}
          {children}
        </div>
      </div>

      {search && mobileSearchOpen && (
        <div className="flex items-center gap-2 border-t px-4 py-2 md:hidden">
          {searchField(true)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileSearchOpen(false)}
          >
            Close
          </Button>
        </div>
      )}
    </nav>
  );
}
