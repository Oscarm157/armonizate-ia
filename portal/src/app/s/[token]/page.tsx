import Image from "next/image";
import { porToken } from "@/lib/datos";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";
import { Comparador } from "./Comparador";

export const dynamic = "force-dynamic";
// Es la fotografía de un paciente: fuera de los buscadores.
export const metadata = {
  title: "Su simulación · Clínica Armonízate",
  robots: { index: false, follow: false },
};

/**
 * La página que ve el paciente. Sin sesión y sin nada que pueda accionar.
 *
 * Se le manda esto y no la imagen porque un enlace se puede caducar: una fotografía
 * reenviada por WhatsApp ya no se puede retirar nunca.
 */
export default async function EnlacePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sim = await porToken(token);

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

        {!sim ? (
          <div className="rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-7 py-12 text-center">
            <h1 className="crm-display text-[26px]!">El enlace ya no está disponible</h1>
            <p className="mx-auto mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-[var(--crm-ink-mute)]">
              Las simulaciones se comparten por {HORAS_VIGENCIA} horas. Escriba a su asesor para que le
              genere el enlace de nuevo.
            </p>
          </div>
        ) : (
          <>
            <h1 className="crm-display text-center text-[30px]!">Su simulación</h1>
            <p className="mx-auto mt-3 mb-8 max-w-[48ch] text-center text-[14.5px] leading-relaxed text-[var(--crm-ink-mute)]">
              Mantenga pulsada la imagen para ver la simulación. Al soltar vuelve su
              fotografía actual.
            </p>

            <Comparador token={token} />

            {/* La misma pieza que se puede guardar o reenviar: el comparador solo vive
                mientras la página esté abierta. */}
            {sim.comparativaPathname && (
              <figure className="mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/s/${token}/comparativa`}
                  alt="Estado actual y simulación"
                  className="w-full rounded-[var(--crm-r-lg)]"
                />
              </figure>
            )}

            <div className="mt-8 rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-6">
              <p className="text-[15px] font-medium text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--crm-ink-soft)]">
                {LEGAL_CUERPO}
              </p>
            </div>

            <p className="mt-6 text-center text-[12.5px] text-[var(--crm-ink-faint)]">
              Este enlace estará disponible por {HORAS_VIGENCIA} horas · clinicaarmonizate.mx
            </p>
          </>
        )}
      </div>
    </main>
  );
}
