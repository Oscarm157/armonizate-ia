"use client";

import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

/** Select estilado sobre Radix: menú custom (no nativo), tokens .crm-*. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className = "",
  size = "md",
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-[30px] text-[12.5px]" : "h-9 text-[13.5px]";
  return (
    <RS.Root value={value} onValueChange={onValueChange}>
      <RS.Trigger
        aria-label={ariaLabel}
        className={`inline-flex ${h} w-full items-center justify-between gap-2 rounded-lg border border-[var(--crm-line-strong)] bg-[var(--crm-surface)] px-3 text-[var(--crm-ink)] outline-none transition-colors hover:border-[var(--crm-ink-mute)] focus-visible:border-[var(--crm-wine-soft)] focus-visible:shadow-[0_0_0_3px_var(--crm-wine-ring)] data-[placeholder]:text-[var(--crm-ink-mute)] ${className}`}
      >
        <RS.Value placeholder={placeholder} />
        <RS.Icon>
          <ChevronDown className="size-4 text-[var(--crm-ink-mute)]" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          <RS.Viewport className="p-1">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2.5 pr-8 text-[13px] text-[var(--crm-ink-soft)] outline-none data-[highlighted]:bg-[var(--crm-surface-2)] data-[highlighted]:text-[var(--crm-ink)] data-[state=checked]:text-[var(--crm-wine)]"
              >
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator className="absolute right-2.5">
                  <Check className="size-3.5" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
