"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updateProfile } from "@/app/admin/actions";

const labelCls = "mb-1.5 block text-[12.5px] font-medium text-[var(--crm-ink)]";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [current, setCurrent] = useState(name);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setSaved(false);
          await updateProfile(fd);
          setCurrent(String(fd.get("name") ?? "").trim() || current);
          setSaved(true);
          setTimeout(() => setSaved(false), 2200);
        })
      }
      className="space-y-4"
    >
      <div>
        <label className={labelCls} htmlFor="p-name">Nombre</label>
        <input id="p-name" name="name" required defaultValue={current} className="crm-input" placeholder="Tu nombre" />
      </div>

      <div>
        <label className={labelCls} htmlFor="p-email">Correo</label>
        <input id="p-email" value={email} disabled className="crm-input cursor-not-allowed opacity-60" />
        <p className="mt-1 text-[12.5px] text-[var(--crm-ink-mute)]">Un administrador cambia tu correo desde Usuarios.</p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="crm-btn crm-btn-primary">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-[12.5px] text-[var(--crm-accent-strong)]"
            >
              <Check className="size-3.5" /> Guardado
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
