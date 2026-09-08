import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { ProfileForm } from "@/components/crm/ProfileForm";
import { ROLE_LABELS } from "@/components/crm/UserRowActions";
import { Breadcrumb } from "@/components/crm/Breadcrumb";
import { PageHeader } from "@/components/crm/PageShell";
import { initials, avatarClass } from "@/components/crm/avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perfil", robots: { index: false } };

const ROLE_NOTE: Record<string, string> = {
  admin: "Acceso total, incluida la gestión de usuarios.",
  agent: "Solo trabajas los leads que tienes asignados.",
  viewer: "Ves todos los leads en modo lectura, sin poder editar.",
};

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="crm-fade">
      <Breadcrumb items={[{ label: "Leads", href: "/admin" }, { label: "Perfil" }]} />

      <div className="mt-4">
        <PageHeader
          eyebrow="Cuenta"
          title="Tu perfil"
          description="Edita tu nombre y administra tu contraseña."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="crm-card p-6">
          <div className="flex items-center gap-4">
            <span
              className={`grid size-14 shrink-0 place-items-center rounded-full text-[18px] font-semibold shadow-[0_0_0_1.5px_var(--crm-surface)] ${avatarClass(me.id)}`}
            >
              {initials(me.name)}
            </span>
            <div className="min-w-0">
              <h2 className="crm-h2 truncate">{me.name}</h2>
              <p className="mt-0.5 truncate text-[13px] text-[var(--crm-ink-soft)]">{me.email}</p>
            </div>
          </div>
          <div className="crm-hairline my-5" />
          <ProfileForm name={me.name} email={me.email} />
        </section>

        <aside className="space-y-4">
          <div className="crm-card p-5">
            <p className="crm-eyebrow">Rol</p>
            <p className="mt-2 inline-flex items-center gap-2 text-[16px] font-semibold tracking-tight text-[var(--crm-ink)]">
              <span className="size-1.5 rounded-full bg-[var(--crm-accent)] shadow-[0_0_0_2px_var(--crm-surface-2)]" />
              {ROLE_LABELS[me.role]}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--crm-ink-soft)]">{ROLE_NOTE[me.role]}</p>
          </div>

          <div className="crm-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface-3)] text-[var(--crm-ink-soft)]">
                <KeyRound className="size-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-[var(--crm-ink)]">Contraseña</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--crm-ink-mute)]">
                  Cámbiala cuando quieras desde tu cuenta.
                </p>
              </div>
            </div>
            <Link
              href="/change-password"
              className="crm-btn crm-btn-secondary mt-3.5 w-full"
            >
              Cambiar contraseña
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
