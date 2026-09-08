import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllUsers, consumoDelEquipo, TOPE_MENSUAL } from "@/lib/datos";
import { canManageUsers } from "@/lib/permissions";
import { fmtDate } from "@/lib/crm-format";
import { AddUserModal } from "@/components/crm/AddUserModal";
import {
  UserRowActions,
  UserRoleSelect,
  ROLE_LABELS,
} from "@/components/crm/UserRowActions";
import { Breadcrumb } from "@/components/crm/Breadcrumb";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { initials, avatarClass } from "@/components/crm/avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios", robots: { index: false } };

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canManageUsers(me.role)) redirect("/admin");

  const all = await getAllUsers();
  const consumo = await consumoDelEquipo();
  const activeCount = all.filter((u) => u.active).length;
  const adminCount = all.filter((u) => u.role === "admin").length;
  const agentCount = all.filter((u) => u.role === "agent").length;
  const viewerCount = all.filter((u) => u.role === "viewer").length;

  const num = (n: number) => <span className="crm-num">{n}</span>;

  return (
    <div className="crm-fade mx-auto max-w-[1280px]">
      <Breadcrumb items={[{ label: "Simulador", href: "/admin" }, { label: "Usuarios" }]} />

      <div className="mt-4">
        <PageHeader
          eyebrow="Equipo"
          title="Usuarios"
          description="Da de alta vendedores, asigna roles y revisa cuántas simulaciones lleva cada uno este mes."
          actions={<AddUserModal />}
        />
      </div>

      <div className="mb-5">
        <KeyFacts
          items={[
            { label: "Personas", value: num(all.length) },
            {
              label: "Activas",
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[var(--crm-accent)] shadow-[0_0_0_2px_var(--crm-surface)]" />
                  {num(activeCount)}
                </span>
              ),
            },
            { label: "Inactivas", value: num(all.length - activeCount) },
            { label: ROLE_LABELS.admin, value: num(adminCount) },
            { label: ROLE_LABELS.agent, value: num(agentCount) },
            { label: ROLE_LABELS.viewer, value: num(viewerCount) },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-[var(--crm-r-lg)] border border-[var(--crm-line)]">
        <div className="overflow-x-auto">
          <table className="crm-table min-w-[720px]">
            <thead className="crm-thead">
              <tr>
                <th className="crm-th">Nombre</th>
                <th className="crm-th">Correo</th>
                <th className="crm-th">Rol</th>
                <th className="crm-th">Estado</th>
                <th className="crm-th">Este mes</th>
                <th className="crm-th">Alta</th>
                <th className="crm-th w-10" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {all.map((u, i) => {
                const isSelf = u.id === me.id;
                return (
                  <tr
                    key={u.id}
                    className="crm-row crm-fade group"
                    style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}
                  >
                    <td className="crm-td">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold shadow-[0_0_0_1.5px_var(--crm-surface)] ${avatarClass(u.id)}`}
                        >
                          {initials(u.name)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold text-[var(--crm-ink)]">{u.name}</span>
                          {isSelf && (
                            <span className="rounded border border-[var(--crm-line-strong)] px-1 py-px text-[10px] font-medium text-[var(--crm-ink-mute)]">
                              tú
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="crm-td text-[13px] text-[var(--crm-ink-soft)]">{u.email}</td>
                    <td className="crm-td">
                      <UserRoleSelect
                        userId={u.id}
                        role={u.role}
                        locked={isSelf && u.role === "admin"}
                      />
                    </td>
                    <td className="crm-td">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12.5px] ${
                          u.active ? "text-[var(--crm-ink-soft)]" : "text-[var(--crm-ink-mute)]"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full shadow-[0_0_0_2px_var(--crm-surface)] ${
                            u.active ? "bg-[var(--crm-accent)]" : "bg-[var(--crm-ink-faint)]"
                          }`}
                        />
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="crm-td whitespace-nowrap">
                      {u.role === "viewer" ? (
                        <span className="text-[12.5px] text-[var(--crm-ink-faint)]">—</span>
                      ) : (
                        <span className="crm-num text-[12.5px] text-[var(--crm-ink-soft)]">
                          {consumo.get(u.id) ?? 0}
                          <span className="text-[var(--crm-ink-faint)]"> / {TOPE_MENSUAL}</span>
                        </span>
                      )}
                    </td>
                    <td className="crm-td crm-num whitespace-nowrap text-[12px] text-[var(--crm-ink-mute)]">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="crm-td w-10 pr-4">
                      <UserRowActions
                        user={{ id: u.id, name: u.name, email: u.email, role: u.role }}
                        active={u.active}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
