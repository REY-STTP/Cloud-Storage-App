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

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl items-center gap-12 md:grid-cols-2">
          <section className="hidden md:block">{left}</section>

          <section className="flex justify-center">
            <div className="w-full max-w-[430px] rounded-2xl border bg-card p-4 text-card-foreground shadow-xl sm:p-5">
              {card}
            </div>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
