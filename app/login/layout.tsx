// app/login/layout.tsx
// Keep the sign-in page out of search indexes (thin form page;
// siblings forgot/reset/verify-email already do the same).
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
