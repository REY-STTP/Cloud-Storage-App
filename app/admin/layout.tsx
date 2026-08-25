// app/admin/layout.tsx
// Admin workspace shell: sidebar navigation + inset content area.
// The sidebar collapse state persists across navigation via the
// `sidebar_state` cookie that SidebarProvider writes on toggle.
//
// M-3: guard server-side — proxy.ts hanya mengecek keberadaan cookie, sedangkan
// layout ini memverifikasi tanda tangan JWT + role dari DB sebelum me-render.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyJwt } from "@/lib/auth";
import { getUserById } from "@/lib/users";
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

  // --- Guard admin (M-3): JWT valid + user ada + role ADMIN dari DB ---
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;
  const user = payload ? await getUserById(payload.userId) : null;
  if (!user || user.banned || user.role !== "ADMIN") {
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
