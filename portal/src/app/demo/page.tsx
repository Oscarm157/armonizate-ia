import Image from "next/image";
import { Comparar } from "@/components/simulador/Comparar";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";

// Es material de venta, no una simulación de nadie: no hay token ni caducidad.
export const metadata = {
  title: "Simulación de otomodelación · Clínica Armonízate",
  robots: { index: false, follow: false },
};

const PASOS = [
  "Una fotografía de frente, con el cabello recogido y las orejas descubiertas.",
  "Su correo electrónico.",
  "El asesor le envía su simulación por un enlace como este.",
];

/**
 * El ejemplo que el asesor manda antes de pedirle la fotografía a un prospecto.
 *
 * La persona es ficticia y generada con inteligencia artificial, y la página lo dice
 * con todas sus letras. Usar aquí el antes y después de una paciente real sería enseñar
 * su cara a desconocidos, y presentarlo sin avisar sería vender un resultado ajeno como
 * si fuera lo que le va a pasar a quien mira.
 */
export default function Demo() {
  return (
    <main className="crm-root flex min-h-[100dvh] flex-col items-center bg-[var(--crm-bg)] px-5 py-10 sm:px-8">
      <div className="w-full max-w-[760px]">
        <Image
          src="/logo-armonizate.png"
          alt="Clínica Armonízate"
          width={1410}
          height={377}
          priority
          className="mx-auto mb-9 h-9 w-auto"
        />

        <h1 className="crm-display text-center text-[30px]!">Así se ve una simulación</h1>
        <p className="mx-auto mt-3 mb-8 max-w-[48ch] text-center text-[14.5px] leading-relaxed text-[var(--crm-ink-mute)]">
          Mantenga pulsada la imagen para ver la simulación. Al soltar vuelve la fotografía
          original.
        </p>

        <figure className="crm-flotante overflow-hidden">
          <Comparar
            actual="/demo/antes.jpg"
            simulacion="/demo/despues.jpg"
            className="aspect-[4/5] w-full sm:aspect-[3/4]"
          />
        </figure>

        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-[var(--crm-ink-faint)]">
          Ejemplo con una persona ficticia generada con inteligencia artificial. No es una
          paciente de la clínica.
        </p>

        <section className="mt-8 rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-6">
          <p className="crm-eyebrow mb-4">Para tener la suya</p>
          <ol className="space-y-3">
            {PASOS.map((paso, i) => (
              <li key={paso} className="flex gap-3">
                <span className="crm-num w-4 shrink-0 text-[15px] font-light text-[var(--crm-accent)]">
                  {i + 1}
                </span>
                <span className="text-[14.5px] leading-relaxed text-[var(--crm-ink-soft)]">{paso}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] bg-[var(--crm-surface)] px-6 py-6">
          <p className="text-[15px] font-medium text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--crm-ink-soft)]">{LEGAL_CUERPO}</p>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-[var(--crm-ink-faint)]">
          clinicaarmonizate.mx
        </p>
      </div>
    </main>
  );
}
