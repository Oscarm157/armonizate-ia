"use client";

import { ErrorState } from "@/components/states";

export default function ErrorSimulador({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="No se pudo abrir el simulador" reset={reset} />;
}
