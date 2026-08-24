// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";
import { SwrProvider } from "@/components/SwrProvider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Cloud Storage",
    template: "%s — Cloud Storage",
  },
  description:
    "Upload, rename, download, and organize your files from a simple, secure dashboard with role-based admin tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={cn("font-sans", geist.variable)}>
      <body className={`${geist.variable} min-h-screen font-sans antialiased`}>
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
