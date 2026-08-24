// app/terms/page.tsx
import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that govern your use of Cloud Storage.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main-content" className="flex-1">
        <article className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Terms</h1>
          <p className="mt-3 text-muted-foreground">
            Plain-language terms for using Cloud Storage.
          </p>

          <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Your account</h2>
              <p>
                You are responsible for the activity on your account and for
                keeping your password private. Verify your email address so
                you can recover access if you lose your password.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Acceptable use</h2>
              <p>
                Do not use the service to store or share unlawful content, to
                attack the service or other users, or to exceed the storage
                quota through automated abuse. Accounts used this way may be
                suspended or removed by an administrator.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Storage quota</h2>
              <p>
                Each account includes a fixed amount of storage. When your
                drive is full, uploads stop working until you delete files.
                Quota is always shown plainly in your dashboard.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Availability and loss</h2>
              <p>
                The service is provided as-is. Keep your own backup of
                anything you cannot afford to lose; deleted files and deleted
                accounts cannot be recovered.
              </p>
            </section>
          </div>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
