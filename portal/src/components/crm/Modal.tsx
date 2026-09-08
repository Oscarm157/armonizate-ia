"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

/**
 * Shell de modal robusto para el CRM. Renderiza en un portal a <body> para
 * escapar cualquier ancestro con transform/overflow, y deja que TODO el overlay
 * scrollee (el panel es un hijo normal centrado, nunca se recorta arriba/abajo
 * en pantallas bajas). Cierra con Esc y click fuera; bloquea el scroll del body.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 460,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Patrón de montaje para el portal (evita mismatch SSR).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const target =
      panel.querySelector<HTMLElement>("[autofocus]") ??
      panel.querySelector<HTMLElement>("input:not([disabled]), select, textarea");
    target?.focus();
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ background: "rgba(4,6,10,0.62)" }}
          className="crm-root fixed inset-0 z-50 overflow-y-auto overscroll-contain backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.985 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              style={{ maxWidth }}
              className="crm-card w-full p-6 shadow-[var(--crm-shadow-pop)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="font-semibold text-[20px] tracking-tight text-[var(--crm-ink)]">{title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="crm-btn crm-btn-ghost crm-btn-sm !px-1.5"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
