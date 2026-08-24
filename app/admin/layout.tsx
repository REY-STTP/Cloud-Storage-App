// app/admin/layout.tsx
// Admin workspace shell: sidebar navigation + inset content area.
// The sidebar collapse state persists across navigation via the
// `sidebar_state` cookie that SidebarProvider writes on toggle.
import { cookies } from "next/headers";
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
