import type { Grado } from "@/lib/simulador/grado";

// Cuánto sale la oreja del contorno de la cabeza en el dibujo, en unidades del viewBox.
const SALIENTE: Record<Grado, number> = { bajo: 3, medio: 7, alto: 12 };

/** Oreja izquierda: el hélix por fuera y el antihélix por dentro. */
function oreja(p: number) {
  const x = 23;
  return {
    helix: `M${x} 36 C${x - p} 32 ${x - p - 3} 44 ${x - p * 0.8} 52 C${x - p * 0.55} 58 ${x - 1} 61 ${x + 2} 60`,
    antihelix: `M${x - 0.5} 40 C${x - p * 0.55} 41 ${x - p * 0.6} 49 ${x + 0.5} 54`,
  };
}

/**
 * Dibujo de referencia de cada grado: una cabeza de frente, en línea fina, con las
 * orejas más o menos separadas. Va siempre a la vista junto a cada opción, sin fotos
 * de pacientes, para que el ejecutivo lo compare con la foto que tiene al lado.
 */
export function DibujoGrado({ grado, className = "" }: { grado: Grado; className?: string }) {
  const o = oreja(SALIENTE[grado]);
  return (
    <svg
      viewBox="4 4 92 96"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M50 8 C31 8 23 23 23 40 C23 52 25 61 29 69 C34 80 42 87 50 87 C58 87 66 80 71 69 C75 61 77 52 77 40 C77 23 69 8 50 8 Z" />
      <path d="M38 83 L37 98 M62 83 L63 98" />
      {[false, true].map((espejo) => (
        <g key={String(espejo)} transform={espejo ? "matrix(-1 0 0 1 100 0)" : undefined}>
          <path d={o.helix} />
          <path d={o.antihelix} strokeWidth={1.1} opacity={0.7} />
        </g>
      ))}
    </svg>
  );
}
