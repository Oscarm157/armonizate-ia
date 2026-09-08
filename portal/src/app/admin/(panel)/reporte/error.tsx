"use client";

import { ErrorState } from "@/components/states";

export default function ErrorReporte({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="No se pudo cargar el reporte" reset={reset} />;
}
