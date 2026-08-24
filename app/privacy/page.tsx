// app/privacy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Cloud Storage handles your data and files.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main-content" className="flex-1">
        <article className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy</h1>
          <p className="mt-3 text-muted-foreground">
            The short version: your files are yours. We store them, serve them
            back to you, and never expose them publicly.
          </p>

          <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Your files</h2>
              <p>
                Uploaded files are stored in a private object-storage bucket
                with no public access. When you download a file, we generate a
                signed link that expires after one hour. Nobody can reach your
                files through a permanent URL.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Your account</h2>
              <p>
                We store your name, email address, and a securely hashed
                password. Your email is used for sign-in, address verification,
                and password resets — nothing else. Sessions use signed,
                http-only cookies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Deleting data</h2>
              <p>
                Deleting a file removes it permanently. Deleting your account
                removes your account and every file in it, with no grace
                period and no recovery.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Questions</h2>
              <p>
                If you have questions about your data, sign in and use the{" "}
                <Link href="/dashboard/profile" className="text-primary hover:underline">
                  profile page
                </Link>{" "}
                to manage or delete your account.
              </p>
            </section>
          </div>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
