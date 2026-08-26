// app/page.tsx
// Landing — category standard at modern SaaS polish (direction contract in app/layout.tsx).
import Link from "next/link";
import {
  ChevronRightIcon,
  ClockIcon,
  CloudUploadIcon,
  FolderIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  MoonIcon,
  ShieldIcon,
  UsersIcon,
  FileArchiveIcon,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import HeroPreview from "@/components/landing/HeroPreview";
import Reveal from "@/components/landing/Reveal";
import PinnedPrivacy from "@/components/landing/PinnedPrivacy";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { siteConfig } from "@/lib/site";

const marqueeFacts = [
  "Presigned links that expire in 60 minutes",
  "Private bucket — no public URLs",
  "JWT sessions in http-only cookies",
  "bcrypt-hashed passwords",
  "Batch download as one ZIP",
  "Rate-limited sign-in",
  "Role-separated admin space",
  "Quota shown in plain numbers",
];

// FAQ content — kept as plain, extractable prose so both search engines and
// generative AI engines (GEO) can quote concise, factual answers. The same
// data backs the FAQPage structured data below.
const faqs: { q: string; a: string }[] = [
  {
    q: "Is Cloud Storage actually private?",
    a: "Yes. Your files are kept in a private object-storage bucket with no public URLs. There is no permanent link that points at your data — not for you and not for anyone else.",
  },
  {
    q: "How do the expiring download links work?",
    a: "Every time you download a file, the app mints a signed URL that stops working after 60 minutes. If a link leaks, it ages out on its own, so there are no permanent public URLs to worry about.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. Every account starts with 1 GB of free storage and includes email verification. No credit card is required to create an account.",
  },
  {
    q: "Can administrators see my files?",
    a: "No. Admins manage accounts — banning, unbanning, and removing users — from a separate, role-gated dashboard. They cannot access user files, and admin accounts are kept out of the regular user space.",
  },
  {
    q: "How are my password and sessions protected?",
    a: "Passwords are bcrypt-hashed, sessions are signed JWTs stored in http-only cookies, and sign-in is rate-limited. The API enforces access itself, so the database is never directly exposed.",
  },
  {
    q: "What if I forget my password?",
    a: "You can request a password reset by email. A reset link is sent to your verified address so you can choose a new password.",
  },
];

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description: siteConfig.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Private object-storage bucket with no public URLs",
    "Download links that expire after 60 minutes",
    "Bulk upload, inline rename, and batch ZIP download",
    "Email verification and email password reset",
    "Role-separated admin dashboard",
    "JWT sessions in http-only cookies and bcrypt-hashed passwords",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main id="main-content" className="flex-1 overflow-x-clip">
        {/* Attention — editorial split hero */}
        <section className="hero-wash border-b">
          <Reveal
            immediate
            className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-5 py-16 sm:px-8 md:grid-cols-2 lg:gap-20 lg:py-24"
          >
            <div>
              <h1
                data-reveal
                className="max-w-xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.5rem] lg:max-w-2xl"
              >
                File storage that stays private by default
              </h1>
              <p
                data-reveal
                className="mt-5 max-w-[52ch] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
              >
                Upload, rename, download, and delete your files from one clean
                dashboard. Files live in a sealed private bucket, and every
                download link expires in an hour — nothing is public unless
                you make it public.
              </p>
              <div data-reveal className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                  Create an account
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Login
                </Button>
              </div>
              <p data-reveal className="tnum mt-4 text-sm text-muted-foreground">
                1 GB free &middot; no credit card &middot; email verification included
              </p>
            </div>

            <div data-reveal>
              <HeroPreview />
            </div>
          </Reveal>
        </section>

        {/* Interest — capability marquee, real facts only */}
        <div className="overflow-hidden border-b bg-secondary/40 py-3.5" aria-hidden>
          <div className="marquee-track flex w-max items-center gap-10 pr-10">
            {[...marqueeFacts, ...marqueeFacts].map((fact, i) => (
              <span
                key={i}
                className="tnum flex shrink-0 items-center gap-2.5 text-[13px] font-medium text-muted-foreground"
              >
                <span className="size-1 rounded-full bg-primary" aria-hidden />
                {fact}
              </span>
            ))}
          </div>
        </div>

        {/* Interest — gapless bento */}
        <Reveal className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 md:py-32">
          <h2
            data-reveal
            className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Everything a personal drive owes you, and nothing it doesn&rsquo;t
          </h2>

          <div className="mt-12 grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* File verbs — wide card with staged row */}
            <div
              data-reveal
              className="shadow-card rounded-2xl border bg-card p-6 lg:col-span-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CloudUploadIcon className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                Every file verb, one place
              </h3>
              <p className="mt-2 max-w-[48ch] leading-relaxed text-muted-foreground">
                Upload in bulk, rename inline, download on demand, delete for
                good. Search finds a file by name; pagination keeps long
                drives quick.
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                  <FolderIcon className="size-4" />
                </span>
                <p className="tnum min-w-0 grow truncate text-xs text-muted-foreground">
                  rename: lease-agreement.docx &rarr; lease-2026-final.docx
                </p>
              </div>
            </div>

            {/* Quota meter */}
            <div
              data-reveal
              className="shadow-card flex flex-col rounded-2xl border bg-card p-6 lg:col-span-2"
            >
              <h3 className="text-xl font-semibold tracking-tight">
                Quota in plain numbers
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Always visible, never a dark pattern.
              </p>
              <div className="mt-auto space-y-2 pt-5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="tnum text-muted-foreground">521 MB of 1 GB</span>
                  <span className="tnum font-semibold">47.3%</span>
                </div>
                <Progress value={47.3} aria-label="Storage 47.3 percent used" />
              </div>
            </div>

            {/* Batch ZIP */}
            <div
              data-reveal
              className="shadow-card rounded-2xl border bg-card p-6 lg:col-span-2"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileArchiveIcon className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                Batch as one ZIP
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Select any number of files and download them as a single
                archive, in one request.
              </p>
            </div>

            {/* Email verification */}
            <div
              data-reveal
              className="shadow-card rounded-2xl border bg-card p-6 lg:col-span-2"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MailIcon className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                Verified email, resettable password
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sign-up confirms your address; resets arrive by email when
                you&rsquo;re locked out.
              </p>
            </div>

            {/* Dark mode */}
            <div
              data-reveal
              className="shadow-card rounded-2xl border bg-card p-6 lg:col-span-2"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MoonIcon className="size-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                Dark mode included
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A deep navy theme that keeps every contrast checked, not an
                inverted afterthought.
              </p>
            </div>

            {/* Admin separation — full-width close */}
            <div
              data-reveal
              className="shadow-card flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center lg:col-span-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UsersIcon className="size-5" />
              </span>
              <div className="max-w-[60ch]">
                <h3 className="text-xl font-semibold tracking-tight">
                  Admins work in their own space
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Account management — banning, unbanning, removing — lives
                  behind a separate, role-gated dashboard. Regular users never
                  see it, and admin accounts can&rsquo;t be locked out by accident.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Desire — pinned privacy mechanics, stacking cards */}
        <div className="border-y bg-secondary/30">
          <PinnedPrivacy
            title="Nothing here is public by accident"
            lede={
              <>
                Three mechanisms do the quiet work. Each one is real, running
                in the app right now — not a promise on a slide.
              </>
            }
          >
            <div
              data-stack-card
              className="shadow-card rounded-2xl border bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldIcon className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">A sealed bucket</h3>
              </div>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Your files are stored in a private object-storage bucket with
                no public access. There is no permanent URL that points at
                your data — not for you, not for anyone else.
              </p>
            </div>

            <div
              data-stack-card
              className="shadow-card rounded-2xl border bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClockIcon className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">Links that expire</h3>
              </div>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Each download mints a signed link that stops working after
                sixty minutes. Leaked links age out on their own.
              </p>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-dashed p-3 text-xs">
                <LinkIcon className="size-3.5 shrink-0 text-primary" />
                <p className="tnum min-w-0 grow truncate text-muted-foreground">
                  presigned: report-q1.pdf &middot; valid 60 min
                </p>
              </div>
            </div>

            <div
              data-stack-card
              className="shadow-card rounded-2xl border bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRoundIcon className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">Separate keys</h3>
              </div>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Sessions are signed JWTs in http-only cookies; passwords are
                bcrypt-hashed; sign-in is rate-limited. The API enforces
                access itself — the database is never exposed.
              </p>
            </div>
          </PinnedPrivacy>
        </div>

        {/* Desire → Trust — FAQ, plain extractable prose (GEO) */}
        <Reveal className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-8 md:py-32">
          <h2
            data-reveal
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Questions, answered plainly
          </h2>
          <p data-reveal className="mt-3 max-w-[52ch] leading-relaxed text-muted-foreground">
            The privacy mechanics aren&rsquo;t fine print. Here is exactly how
            Cloud Storage keeps your files yours.
          </p>

          <div data-reveal className="mt-10 divide-y rounded-2xl border bg-card shadow-card">
            {faqs.map(({ q, a }) => (
              <div key={q} className="px-6 py-5 sm:px-7">
                <h3 className="text-lg font-semibold tracking-tight">{q}</h3>
                <p className="mt-2 max-w-[60ch] leading-relaxed text-muted-foreground">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Action — closing CTA */}
        <Reveal className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 md:py-32">
          <div
            data-reveal
            className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center text-background sm:px-12"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(36rem_20rem_at_50%_-20%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_70%)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Start with a gigabyte. Keep it private.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-background/70">
                Create an account, verify your email, and upload your first
                file in under a minute.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  variant="secondary"
                  nativeButton={false}
                  render={<Link href="/register" />}
                >
                  Create your account
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      <AppFooter />

      {/* Structured data for search and generative engines (SEO + GEO). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
