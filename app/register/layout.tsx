// app/register/layout.tsx
// Keep the sign-up page out of search indexes (thin form page;
// siblings forgot/reset/verify-email already do the same).
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
