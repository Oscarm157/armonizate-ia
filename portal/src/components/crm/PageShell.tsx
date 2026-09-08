import type { ReactNode } from "react";

/**
 * Cabecera de cada vista. Es la que fija el tono: título en serif peso 400, bajada en
 * sans gris. El aire de arriba es a propósito, la vista respira antes de empezar.
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
    <div className="mb-10 flex flex-col gap-4 pt-2 sm:mb-14 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && <p className="crm-eyebrow mb-3">{eyebrow}</p>}
        <h1 className="crm-display">{title}</h1>
        {description && (
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-[var(--crm-ink-mute)]">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 sm:pt-1">{actions}</div>
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
