"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserRound, LogOut, Sparkles, History } from "lucide-react";
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

type Item = { href: string; label: string; icon: typeof Users };
type Group = { label: string; items: Item[] };

const roleLabels: Record<string, string> = { admin: "Admin", agent: "Vendedor", viewer: "Lector" };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({
  user, showUsers, logoutAction,
}: {
  user: { name: string; role: string };
  showUsers: boolean;
  logoutAction: () => void;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const herramienta: Item[] = [
    { href: "/admin", label: "Simulador", icon: Sparkles },
    { href: "/admin/historial", label: "Historial", icon: History },
  ];

  const cuenta: Item[] = [];
  if (showUsers) cuenta.push({ href: "/admin/users", label: "Usuarios", icon: Users });
  cuenta.push({ href: "/admin/profile", label: "Perfil", icon: UserRound });

  const groups: Group[] = [
    { label: "Herramienta", items: herramienta },
    { label: "Cuenta", items: cuenta },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/admin" className="flex items-center px-2 py-2" aria-label="Clínica Armonízate">
          {collapsed ? (
            <span className="font-bold tracking-tight text-[var(--crm-ink)]">A</span>
          ) : (
            <Image
              src="/logo-armonizate.png"
              alt="Clínica Armonízate"
              width={1410}
              height={377}
              priority
              className="h-8 w-auto"
            />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive(pathname, href)} tooltip={label}>
                      <Link href={href}>
                        <Icon strokeWidth={1.9} />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 pb-1">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--crm-ink-soft)]">
              {user.name}
            </span>
            <Badge variant="secondary" className="bg-[var(--crm-accent-tint)] text-[var(--crm-accent)]">
              {roleLabels[user.role] ?? user.role}
            </Badge>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton asChild tooltip="Salir">
                <button type="submit" aria-label="Salir">
                  <LogOut strokeWidth={1.9} />
                  <span>Salir</span>
                </button>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
