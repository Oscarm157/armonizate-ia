"use client";

import { ErrorState } from "@/components/states";

export default function ErrorEjecutivos({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="No se pudo cargar la lista de ejecutivos" reset={reset} />;
}
