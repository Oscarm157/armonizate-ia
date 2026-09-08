"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Plus, Copy, Check, ShieldCheck, UserCog, Eye } from "lucide-react";
import { createUser } from "@/app/admin/users-actions";
import type { UserRole } from "@/lib/schema";
import { Modal } from "@/components/crm/Modal";

const labelCls = "mb-1 block text-[12.5px] font-medium text-[var(--crm-ink)]";

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string; icon: typeof ShieldCheck }[] = [
  { value: "agent", label: "Agente", hint: "Solo trabaja los leads que tiene asignados", icon: UserCog },
  { value: "admin", label: "Administrador", hint: "Todo, incluida la gestión de usuarios", icon: ShieldCheck },
  { value: "viewer", label: "Lector", hint: "Ve todos los leads, no puede editar", icon: Eye },
];

export function AddUserModal() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("agent");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setError(null);
    setCreated(null);
    setCopied(false);
    setRole("agent");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="crm-btn crm-btn-primary">
        <Plus className="size-[15px]" strokeWidth={2.1} />
        Nuevo usuario
      </button>

      <Modal open={open} onClose={close} title={created ? "Usuario creado" : "Nuevo usuario"} maxWidth={420}>
        {created ? (
          <div className="space-y-4">
            <p className="text-[13.5px] text-[var(--crm-ink-soft)]">
              Comparte esta contraseña temporal con <strong>{created.name}</strong>. La cambiará en su primer inicio de sesión. Se muestra una sola vez.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] px-3.5 py-2.5">
              <code className="crm-num text-[15px] font-medium tracking-wide text-[var(--crm-ink)]">{created.password}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(created.password);
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1 text-[12.5px] text-[var(--crm-accent-strong)] transition-colors hover:opacity-80"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button onClick={close} className="crm-btn crm-btn-secondary w-full">Listo</button>
          </div>
        ) : (
          <form
            action={(fd) =>
              startTransition(async () => {
                setError(null);
                const res = await createUser(fd);
                if (res.error) setError(res.error);
                else if (res.tempPassword)
                  setCreated({ name: String(fd.get("name")), password: res.tempPassword });
              })
            }
            className="space-y-3.5"
          >
            <div>
              <label className={labelCls} htmlFor="u-name">Nombre</label>
              <input id="u-name" name="name" required autoFocus className="crm-input" placeholder="Nombre completo" />
            </div>
            <div>
              <label className={labelCls} htmlFor="u-email">Correo</label>
              <input id="u-email" name="email" type="email" required className="crm-input" placeholder="nombre@bgc.mx" />
            </div>
            <div>
              <label className={labelCls} htmlFor="u-password">Contraseña temporal</label>
              <input id="u-password" name="password" minLength={8} className="crm-input" placeholder="Déjalo en blanco para generarla automáticamente" />
              <p className="mt-1 text-[12.5px] text-[var(--crm-ink-mute)]">En blanco genera una aleatoria. Al menos 8 caracteres.</p>
            </div>

            <fieldset>
              <span className={labelCls}>Rol</span>
              <input type="hidden" name="role" value={role} />
              <div className="space-y-1.5">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const sel = role === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setRole(opt.value)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        sel
                          ? "border-[var(--crm-accent-ring)] bg-[var(--crm-accent-tint)]"
                          : "border-[var(--crm-line)] bg-[var(--crm-surface)] hover:border-[var(--crm-line-strong)]"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${sel ? "text-[var(--crm-accent-strong)]" : "text-[var(--crm-ink-mute)]"}`} strokeWidth={1.8} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-medium ${sel ? "text-[var(--crm-accent-strong)]" : "text-[var(--crm-ink)]"}`}>{opt.label}</span>
                        <span className="block text-[12.5px] text-[var(--crm-ink-mute)]">{opt.hint}</span>
                      </span>
                      {sel && (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {error && <p className="text-[12.5px] text-[var(--destructive)]">{error}</p>}
            <button type="submit" disabled={pending} className="crm-btn crm-btn-primary w-full">
              {pending ? "Creando…" : "Crear usuario"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
