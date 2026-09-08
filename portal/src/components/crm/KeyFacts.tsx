import type { ReactNode } from "react";

/** Fila de cifras al inicio de una vista. Se separan por hairline, sin cajas. */
export function KeyFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-wrap items-stretch gap-x-8 gap-y-3 rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] px-5 py-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-[86px]">
          <dt className="crm-eyebrow">{it.label}</dt>
          <dd className="mt-1 text-[15px] font-semibold text-[var(--crm-ink)]">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
