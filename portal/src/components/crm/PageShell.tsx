import type { ReactNode } from "react";

/**
 * Header consistente para todas las superficies del panel (familia Linear/Rox).
 * Patrón: eyebrow mute opcional + h1 + descripción opcional, con acciones a la
 * derecha. Usado por dashboard, leads, board, usuarios, contenido, etc.
 *
 *   <PageHeader eyebrow="Comercial" title="Leads" actions={<NewLeadButton />}>
 *     <p className="...">descripción opcional</p>
 *   </PageHeader>
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="crm-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="crm-h1 truncate">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-[13.5px] leading-relaxed text-[var(--crm-ink-mute)]">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * Cabecera de sección dentro de una página (sobre cards o bloques).
 * Más chica que PageHeader: h2 + acción opcional.
 */
export function SectionHeader({
  title,
  actions,
  className = "",
}: {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="crm-h2">{title}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
