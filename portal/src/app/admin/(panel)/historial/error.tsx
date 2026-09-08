"use client";

import { ErrorState } from "@/components/states";

export default function ErrorHistorial({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="No se pudo cargar el historial" reset={reset} />;
}
