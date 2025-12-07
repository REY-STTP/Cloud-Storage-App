import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Cloud Storage App",
  description: "Simple cloud storage with user & admin dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ToastProvider>
          {children}
          <ThemeToggle />
        </ToastProvider>
      </body>
    </html>
  );
}
