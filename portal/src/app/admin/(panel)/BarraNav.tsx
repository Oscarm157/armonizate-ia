"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

// Barra arriba y no menú lateral: el portal vive dentro del panel de la clínica, que ya
// trae su propio menú a la izquierda, y el marco mide unos 1,090 × 660 px. Sin logo por
// lo mismo: la marca ya está en el panel que lo contiene.
export function BarraNav({ esAdmin, logoutAction }: { esAdmin: boolean; logoutAction: () => void }) {
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/admin", label: "Simulador" },
    { href: "/admin/historial", label: "Historial" },
  ];
  if (esAdmin) {
    items.push(
      { href: "/admin/ejecutivos", label: "Ejecutivos" },
      { href: "/admin/reporte", label: "Reporte" },
      // Validación es medición interna sobre fotos de pacientes reales: solo administración.
      { href: "/admin/validacion", label: "Validación" },
    );
  }

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 pt-3 pb-2 sm:px-8">
      <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {items.map(({ href, label }) => {
          const activo = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              // El activo se marca con una línea fina y tinta fuerte, no con relleno: el
              // relleno es lo que la vuelve una consola genérica (ver DESIGN.md).
              className={`border-b-2 px-2.5 py-1.5 text-[14px] transition-colors ${
                activo
                  ? "border-[var(--crm-accent)] font-medium text-[var(--crm-ink)]"
                  : "border-transparent text-[var(--crm-ink-mute)] hover:text-[var(--crm-ink)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {/* Salir para los dos: con dos claves compartidas, cambiar de una a otra es lo que
          se hace a diario, y sin salida hay que borrar la cookie a mano. */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[12px] text-[var(--crm-ink-faint)]">
          {esAdmin ? "Administración" : "Ejecutivo"}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-[13px] text-[var(--crm-ink-mute)] underline underline-offset-4 hover:text-[var(--crm-ink)]"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
