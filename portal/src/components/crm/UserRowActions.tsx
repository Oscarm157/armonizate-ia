"use client";

import { useState, useTransition } from "react";
import * as RS from "@radix-ui/react-select";
import { KeyRound, UserX, UserCheck, Copy, Check, ChevronDown, Loader2 } from "lucide-react";
import { resetUserPassword, setUserActive, updateUserRole } from "@/app/admin/users-actions";
import type { UserRole } from "@/lib/schema";
import { EditUserModal } from "@/components/crm/EditUserModal";
import { Tooltip } from "@/components/crm/ui/Tooltip";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  agent: "Agente",
  viewer: "Lector",
};

const ROLE_CHIP: Record<UserRole, string> = {
  admin: "border-transparent bg-[var(--crm-accent-tint)] text-[var(--crm-accent-strong)]",
  agent: "border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] text-[var(--crm-ink-soft)]",
  viewer: "border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] text-[var(--crm-ink-soft)]",
};

/** Role chip + inline selector. Locked for the acting admin on their own row. */
export function UserRoleSelect({
  userId,
  role,
  locked,
}: {
  userId: string;
  role: UserRole;
  locked?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<UserRole>(role);

  if (locked) {
    return (
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[12px] font-medium ${ROLE_CHIP[value]}`}>
        {ROLE_LABELS[value]}
      </span>
    );
  }

  return (
    <RS.Root
      value={value}
      disabled={pending}
      onValueChange={(v) => {
        const next = v as UserRole;
        setValue(next);
        startTransition(() => updateUserRole(userId, next));
      }}
    >
      <RS.Trigger
        aria-label="Cambiar rol"
        className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-2 text-[12px] font-medium outline-none transition-[box-shadow,border-color] focus-visible:shadow-[0_0_0_3px_var(--crm-accent-ring)] disabled:opacity-60 ${ROLE_CHIP[value]}`}
      >
        <RS.Value />
        <RS.Icon>
          {pending ? <Loader2 className="size-3 animate-spin opacity-70" /> : <ChevronDown className="size-3 opacity-70" />}
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className="z-50 overflow-hidden rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          <RS.Viewport className="p-1">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <RS.Item
                key={r}
                value={r}
                className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2.5 pr-8 text-[13px] text-[var(--crm-ink-soft)] outline-none data-[highlighted]:bg-[var(--crm-surface-2)] data-[highlighted]:text-[var(--crm-ink)]"
              >
                <RS.ItemText>{ROLE_LABELS[r]}</RS.ItemText>
                <RS.ItemIndicator className="absolute right-2.5">
                  <Check className="size-3.5 text-[var(--crm-accent-strong)]" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}

export function UserRowActions({
  user,
  active,
  isSelf,
}: {
  user: { id: string; name: string; email: string; role: UserRole };
  active: boolean;
  isSelf: boolean;
}) {
  const userId = user.id;
  const [pending, startTransition] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Acciones discretas: aparecen al pasar el cursor por la fila o al enfocar.
  // Si hay una contraseña temporal visible, se mantienen para no ocultarla.
  const reveal = temp
    ? "opacity-100"
    : "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100";

  return (
    <div className={`flex items-center justify-end gap-1.5 ${reveal}`}>
      <EditUserModal user={user} />

      {temp ? (
        <span className="inline-flex items-center gap-2 rounded-md border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-2 py-1">
          <code className="crm-num text-[12.5px] font-medium text-[var(--crm-ink)]">{temp}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(temp);
              setCopied(true);
            }}
            className="text-[var(--crm-accent-strong)] transition-colors hover:opacity-80"
            title="Copiar"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </span>
      ) : (
        <Tooltip content="Restablecer contraseña">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await resetUserPassword(userId);
                setTemp(res.tempPassword);
              })
            }
            aria-label="Restablecer contraseña"
            className="rounded-md p-1.5 text-[var(--crm-ink-mute)] transition-colors hover:bg-[var(--crm-accent-tint)] hover:text-[var(--crm-accent-strong)] disabled:opacity-50"
          >
            {pending && !temp ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" strokeWidth={1.7} />}
          </button>
        </Tooltip>
      )}

      {!isSelf && (
        <Tooltip content={active ? "Desactivar" : "Reactivar"}>
          <button
            disabled={pending}
            onClick={() => startTransition(() => setUserActive(userId, !active))}
            aria-label={active ? "Desactivar" : "Reactivar"}
            className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
              active
                ? "text-[var(--crm-ink-mute)] hover:bg-[var(--crm-surface-3)] hover:text-[var(--crm-ink)]"
                : "text-[var(--crm-accent-strong)] hover:bg-[var(--crm-accent-tint)]"
            }`}
          >
            {active ? <UserX className="size-4" strokeWidth={1.7} /> : <UserCheck className="size-4" strokeWidth={1.7} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
