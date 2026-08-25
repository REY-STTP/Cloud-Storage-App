// app/dashboard/layout.tsx
// M-3: guard server-side halaman dashboard — verifikasi JWT + status user
// dari DB (proxy.ts hanya mengecek keberadaan cookie tanpa verifikasi).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJwt } from "@/lib/auth";
import { getUserById } from "@/lib/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;
  const user = payload ? await getUserById(payload.userId) : null;

  if (!user || user.banned) {
    redirect("/login");
  }

  return <>{children}</>;
}
