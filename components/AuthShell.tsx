// components/AuthShell.tsx
// Shared two-column layout for auth pages (login, register, forgot/reset password).
import { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export default function AuthShell({
  left,
  card,
}: {
  left: ReactNode;
  card: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main id="main-content" className="hero-wash flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl items-center gap-12 md:grid-cols-2">
          <section className="hidden md:block">{left}</section>

          <section className="flex justify-center">
            <div className="shadow-lift w-full max-w-[440px] rounded-2xl border bg-card p-6 text-card-foreground sm:p-7">
              {card}
            </div>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
