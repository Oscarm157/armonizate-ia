import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageUsers } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
// Provider legacy para los tooltips de UserRowActions (se migra a shadcn en la 2ª tanda).
import { TooltipProvider } from "@/components/crm/ui/Tooltip";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.mustChangePassword) redirect("/change-password");

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <AppSidebar
          user={{ name: me.name, role: me.role }}
          showUsers={canManageUsers(me.role)}
          logoutAction={logout}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--crm-line)] bg-[var(--crm-bg)]/80 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-5" />
            <span className="text-[13px] font-medium text-[var(--crm-ink-soft)]">Simulador de otomodelación</span>
          </header>
          <main className="mx-auto w-full max-w-[1380px] px-4 py-7 sm:px-7 sm:py-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
