// components/AppFooter.tsx
// Public marketing footer: copyright plus quick links.
import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="w-full border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8">
        <span>© {new Date().getFullYear()} Cloud Storage. All rights reserved.</span>
      </div>
    </footer>
  );
}
