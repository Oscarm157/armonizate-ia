import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { BarraNav } from "./BarraNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="min-h-[100dvh] bg-[var(--crm-bg)]">
      <BarraNav esAdmin={isAdmin(me.role)} />
      {/* 85%: dentro de ArmoAdmin el marco mide ~1,090 × 660 px. La escala se aplica a
          todo el panel para que textos, botones y tablas bajen parejo. */}
      <main className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-16 [zoom:0.85] sm:px-8">{children}</main>
    </div>
  );
}
