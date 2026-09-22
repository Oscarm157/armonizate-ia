"use client";

import { useEffect, useState } from "react";
import { BotonReservar } from "./BotonReservar";

/**
 * Barra fija abajo, solo en celular, visible mientras el botón principal no está en
 * pantalla (al abrir queda debajo de la foto): el botón siempre está a la mano sin verse
 * dos veces seguidas.
 */
export function BarraReservar({ href, texto, vigilar }: { href: string; texto: string; vigilar: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(vigilar);
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.intersectionRatio < 0.9), { threshold: [0, 0.9, 1] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [vigilar]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 bg-[var(--crm-bg)]/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_24px_-12px_rgba(18,19,51,0.25)] sm:hidden">
      <BotonReservar href={href} texto={texto} />
    </div>
  );
}
