"use client";

import * as TP from "@radix-ui/react-tooltip";

export const TooltipProvider = TP.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TP.Root>
      <TP.Trigger asChild>{children}</TP.Trigger>
      <TP.Portal>
        <TP.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-md border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-2 py-1 text-[12px] text-[var(--crm-ink)] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]"
        >
          {content}
          <TP.Arrow className="fill-[var(--crm-surface-2)]" />
        </TP.Content>
      </TP.Portal>
    </TP.Root>
  );
}
