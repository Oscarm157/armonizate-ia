import { Loader2, Inbox, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Estado de carga neutro. Úsalo en loading.tsx o en suspense fallbacks. */
export function Loading({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Estado vacío: cuando una lista no tiene datos todavía. */
export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** Estado de error: úsalo en error.tsx ("use client"); reset reintenta el render. */
export function ErrorState({
  title = "Algo salió mal",
  hint = "No se pudo cargar el contenido. Intenta de nuevo.",
  reset,
}: {
  title?: string;
  hint?: string;
  reset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {reset ? (
        <Button variant="outline" size="sm" onClick={reset} className="mt-1">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
