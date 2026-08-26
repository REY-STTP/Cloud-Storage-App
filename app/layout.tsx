// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";
import { SwrProvider } from "@/components/SwrProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "cloud storage",
    "private cloud drive",
    "secure file storage",
    "encrypted file sharing",
    "expiring download links",
    "personal cloud",
    "file backup",
    "presigned URLs",
    "private bucket storage",
    "self-hosted file storage",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    ...(siteConfig.twitterHandle
      ? { site: siteConfig.twitterHandle, creator: siteConfig.twitterHandle }
      : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  ...(siteConfig.googleVerification
    ? { verification: { google: siteConfig.googleVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn("font-sans", geistSans.variable, geistMono.variable, outfit.variable)}
    >
      <body
        className={cn(
          geistSans.variable,
          "min-h-screen font-sans antialiased"
        )}
      >
        <div
          aria-hidden
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
  Direction contract (seed 04b7fb47, canon):
  THESIS: The category-standard cloud-storage SaaS, executed at Modern-SaaS-polish craft — the arrangement everyone knows, built like the best in class. No irony, no smuggled quirk.
  OWN-WORLD: Near-white blue-tinted grounds, deep navy-slate ink, one confident blue primary, crisp 12-16px cards, soft layered shadows; Outfit display, Geist body, Geist Mono data.
  STORY: A visitor recognizes the product in one glance and trusts it because nothing hides — presigned expiring links, quota, and the private bucket are shown plainly.
  FIRST VIEWPORT: Editorial split — headline, sub, dual CTA left; CSS-built product preview right.
  FORM: Canon (category standard), chosen by the user over the dealt hand.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->`,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ToastProvider>
          <SwrProvider>
            <ConfirmDialogProvider>
              {children}
              <ThemeToggle />
              <Toaster position="top-center" richColors />
            </ConfirmDialogProvider>
          </SwrProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
