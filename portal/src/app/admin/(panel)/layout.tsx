import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageUsers, isAdmin } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
// Provider legacy para los tooltips de UserRowActions.
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
          showValidacion={isAdmin(me.role)}
          logoutAction={logout}
        />
        <SidebarInset className="bg-[var(--crm-bg)]">
          {/* La barra flota sobre el lienzo: sin fondo propio, sin borde y sin sombra.
              El separador visual lo hace el aire, no una línea. */}
          <header className="flex h-16 shrink-0 items-center px-5 sm:px-8">
            <SidebarTrigger className="-ml-2 text-[var(--crm-ink-mute)]" />
          </header>
          <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
