import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";
import { BarraNav } from "./BarraNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="min-h-[100dvh] bg-[var(--crm-bg)]">
      <BarraNav esAdmin={isAdmin(me.role)} logoutAction={logout} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-16 sm:px-8">{children}</main>
    </div>
  );
}
