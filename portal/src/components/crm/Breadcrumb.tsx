import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-[13px]" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight className="size-3.5 text-[var(--crm-ink-mute)]" strokeWidth={2} />
          )}
          {c.href ? (
            <Link
              href={c.href}
              className="rounded px-1 py-0.5 text-[var(--crm-ink-mute)] transition-colors hover:text-[var(--crm-wine)]"
            >
              {c.label}
            </Link>
          ) : (
            <span className="max-w-[260px] truncate px-1 py-0.5 font-medium text-[var(--crm-ink)]">
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
