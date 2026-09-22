import Image from "next/image";
import { Clock, Footprints, ShieldCheck, Sparkles, Syringe, Users } from "lucide-react";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";
import { enlaceWhatsApp, nombreSede } from "@/lib/sedes";
import { Comparador } from "./Comparador";
import { BotonReservar } from "./BotonReservar";

// Datos de clinicaarmonizate.mx (home y /otomodelacion, revisados el 2026-09-21),
// acortados para leerse de un vistazo. No se agrega nada que el sitio no diga.
const VENTAJAS = [
  { texto: "60 min en consultorio", icono: Clock },
  { texto: "Ambulatorio, sin incapacidad", icono: Footprints },
  { texto: "Sin cortes ni cicatrices", icono: Sparkles },
  { texto: "Anestesia local leve", icono: Syringe },
  { texto: "+2,500 pacientes", icono: Users },
  { texto: "Garantía médica de 3 meses", icono: ShieldCheck },
];

type Sim = { id: string; sede: string | null; comparativaPathname: string | null };

/** Lo que ve el paciente. Separado de la página para poder revisarlo sin base de datos. */
export function VistaPaciente({ token, sim }: { token: string; sim: Sim | null }) {
  const whatsapp = sim
    ? enlaceWhatsApp(sim.sede, `Hola, vi mi simulación de otomodelación y quiero reservar mi cupo. Folio: ${sim.id.slice(0, 8)}`)
    : enlaceWhatsApp(null, "Hola, mi enlace de simulación de otomodelación venció. ¿Me lo pueden mandar de nuevo?");

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
            <BotonReservar href={whatsapp} texto="Escribir por WhatsApp" />
          </div>
        ) : (
          <>
            <h1 className="text-center text-[30px] leading-tight font-semibold text-[var(--crm-ink)]">
              ¡Hola! Tu simulación está lista
            </h1>
            <p className="mx-auto mt-2 mb-5 max-w-[38ch] text-center text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
              Así se verían tus orejas con la otomodelación. Usa los botones para comparar.
            </p>

            <Comparador token={token} />

            <div className="mt-6">
              <BotonReservar href={whatsapp} texto="Reservar mi cupo por WhatsApp" />
              <p className="mt-3 text-center text-[15px] text-[var(--crm-ink-mute)]">
                Te atiende la sucursal {nombreSede(sim.sede)}
              </p>
            </div>

            <section className="mt-10">
              <h2 className="text-center text-[24px] font-semibold text-[var(--crm-ink)]">Ventajas de la otomodelación</h2>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {VENTAJAS.map(({ texto, icono: Icono }) => (
                  <li
                    key={texto}
                    className="flex flex-col items-center gap-2 rounded-[var(--crm-r-md)] bg-[var(--crm-surface)] px-3 py-4 text-center"
                  >
                    <span className="grid size-10 place-items-center rounded-[12px] bg-[var(--crm-accent)] text-[var(--crm-on-accent)]">
                      <Icono className="size-5" />
                    </span>
                    <span className="text-[15px] leading-snug font-medium text-[var(--crm-ink)]">{texto}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* La misma pieza que se puede guardar o reenviar: el comparador solo vive
                mientras la página esté abierta. */}
            {sim.comparativaPathname && (
              <figure className="mt-12">
                <figcaption className="mb-3 text-center text-[20px] font-semibold text-[var(--crm-ink)]">
                  Antes y después, lado a lado
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/s/${token}/comparativa`}
                  alt="Estado actual y simulación"
                  className="w-full rounded-[var(--crm-r-lg)]"
                />
              </figure>
            )}

            <div className="mt-10">
              <BotonReservar href={whatsapp} texto="Reservar mi cupo por WhatsApp" />
            </div>

            <div className="mt-10 rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-6">
              <p className="text-[17px] font-medium text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
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
