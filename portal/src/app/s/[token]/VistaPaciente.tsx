import Image from "next/image";
import { Clock, Footprints, Infinity as Permanente, Sparkles } from "lucide-react";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";
import { Comparador } from "./Comparador";
import { BotonReservar } from "./BotonReservar";

// Datos de clinicaarmonizate.mx (home y /otomodelacion, revisados el 2026-09-21),
// acortados para leerse de un vistazo. No se agrega nada que el sitio no diga.
const VENTAJAS = [
  { texto: "60 min en consultorio", icono: Clock },
  { texto: "Ambulatorio, sin incapacidad", icono: Footprints },
  { texto: "Sin cortes ni cicatrices", icono: Sparkles },
  { texto: "Resultado permanente", icono: Permanente },
];

type Sim = { id: string; sede: string | null; comparativaPathname: string | null };

/** Lo que ve el paciente. Separado de la página para poder revisarlo sin base de datos. */
export function VistaPaciente({ token, sim }: { token: string; sim: Sim | null }) {
  // Sin número: abre WhatsApp y el paciente vuelve a la conversación que ya tiene con
  // su ejecutivo, que es donde le llegó este enlace.
  const whatsapp = "https://api.whatsapp.com/send";

  return (
    <main className="crm-root min-h-[100dvh] bg-[var(--crm-bg)] pb-12">
      {/* Franja de marca: el paciente tiene que reconocer a la clínica antes que nada. */}
      <header className="bg-[var(--crm-accent)] px-5 py-5">
        <Image
          src="/logo-armonizate.png"
          alt="Clínica Armonízate"
          width={1410}
          height={377}
          priority
          className="mx-auto h-12 w-auto brightness-0 invert"
        />
      </header>

      <div className="mx-auto w-full max-w-[520px] px-5 pt-7">
        {!sim ? (
          <div className="rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-10 text-center">
            <h1 className="text-[28px] font-medium text-[var(--crm-ink)]">Este enlace ya venció</h1>
            <p className="mx-auto mt-3 mb-7 max-w-[38ch] text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
              Los enlaces duran {HORAS_VIGENCIA} horas. Escríbenos por WhatsApp y te lo mandamos de nuevo.
            </p>
            <BotonReservar href={whatsapp} texto="Volver a WhatsApp" />
          </div>
        ) : (
          <>
            <h1 className="text-center text-[30px] leading-tight font-semibold text-[var(--crm-ink)]">
              ¡Hola! Tu simulación está lista
            </h1>
            <p className="mx-auto mt-2 mb-5 max-w-[38ch] text-center text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
              Así se verían tus orejas con la Otomodelación.
            </p>

            {/* Primero la comparativa: es la que muestra el cambio de golpe, y es la pieza
                con logo y aviso impresos que el paciente puede guardar. */}
            {sim.comparativaPathname && (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/s/${token}/comparativa`}
                  alt="Estado actual y simulación"
                  className="w-full rounded-[var(--crm-r-lg)]"
                />
              </figure>
            )}

            <div className="mt-5 mx-auto max-w-[min(100%,calc(50dvh*0.8))]">
              <BotonReservar href={whatsapp} texto="Volver a WhatsApp" />
            </div>

            <section className="mt-12">
              <h2 className="text-center text-[24px] font-semibold text-[var(--crm-ink)]">Ventajas de la Otomodelación</h2>
              <ul className="mx-auto mt-4 max-w-[400px] divide-y divide-[var(--crm-line)] rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-5">
                {VENTAJAS.map(({ texto, icono: Icono }) => (
                  <li key={texto} className="flex items-center gap-3 py-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[var(--crm-accent)] text-[var(--crm-on-accent)]">
                      <Icono className="size-5" />
                    </span>
                    <span className="text-[16px] leading-snug font-medium text-[var(--crm-ink)]">{texto}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-center text-[20px] font-semibold text-[var(--crm-ink)]">Compara tu foto actual</h2>
              <p className="mt-1 text-center text-[16px] text-[var(--crm-ink-mute)]">
                Arrastra el control sobre la foto.
              </p>
              <div className="mt-4">
                <Comparador token={token} />
              </div>
            </section>

            <div className="mt-10 mx-auto max-w-[min(100%,calc(50dvh*0.8))]">
              <BotonReservar href={whatsapp} texto="Volver a WhatsApp" />
            </div>

            <div className="mt-10 rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-6">
              <p className="text-[17px] font-medium text-[var(--crm-ink)]">📌 {LEGAL_TITULO}</p>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--crm-ink-soft)]">{LEGAL_CUERPO}</p>
            </div>

            <p className="mt-6 text-center text-[15px] text-[var(--crm-ink-mute)]">
              Este enlace estará disponible por {HORAS_VIGENCIA} horas. clinicaarmonizate.mx
            </p>

          </>
        )}
      </div>
    </main>
  );
}
