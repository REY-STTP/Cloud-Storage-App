// app/admin/layout.tsx
// Admin workspace shell: sidebar navigation + inset content area.
// The sidebar collapse state persists across navigation via the
// `sidebar_state` cookie that SidebarProvider writes on toggle.
//
// P1-3 (dulu M-3): gerbang cepat tanpa DB — tanda tangan + expiry JWT +
// klaim role ADMIN yang terverifikasi. Nol RTT Postgres di sini, menghemat
// 1 lookup serial di setiap navigasi /admin.
//
// Penegakan otoritatif TETAP di API guards (requireAdmin memvalidasi ulang
// role/banned/deleted dari DB per request). Konsekuensinya: pemegang token
// basi (di-demote/di-ban <24 jam, sesudah ganti password) masih me-render
// shell kosong — tapi semua fetch data 401/403 dan overview menampilkan
// kartu error. Tidak ada kebocoran data: shell tidak memuat data user.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJwt } from "@/lib/auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // --- Guard admin (P1-3): klaim dari JWT terverifikasi, tanpa DB ---
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;
  if (!payload || payload.role !== "ADMIN") {
    redirect("/login");
  }

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <TooltipProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="!h-5" />
            <span className="text-sm font-medium text-muted-foreground">Admin workspace</span>
          </header>
          {children}
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
