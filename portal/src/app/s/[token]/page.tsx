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
      {/* Columna angosta en todas las pantallas: en celular se ve bien y en escritorio,
          a lo ancho, la foto quedaba enorme y los botones fuera de la pantalla. */}
      <div className="w-full max-w-[440px]">
        <Image
          src="/logo-armonizate.png"
          alt="Clínica Armonízate"
          width={1410}
          height={377}
          priority
          className="mx-auto mb-7 h-9 w-auto"
        />

        {!sim ? (
          <div className="rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-7 py-12 text-center">
            <h1 className="text-[28px] font-medium text-[var(--crm-ink)]">Este enlace ya venció</h1>
            <p className="mx-auto mt-3 max-w-[40ch] text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
              Los enlaces duran {HORAS_VIGENCIA} horas. Escriba a su asesor por WhatsApp y pídale que se
              lo mande de nuevo.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-[30px] font-medium text-[var(--crm-ink)]">Su simulación</h1>
            <p className="mx-auto mt-2 mb-6 max-w-[40ch] text-center text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
              Use los botones de abajo para cambiar entre su foto actual y la simulación.
            </p>

            <Comparador token={token} />

            {/* La misma pieza que se puede guardar o reenviar: el comparador solo vive
                mientras la página esté abierta. */}
            {sim.comparativaPathname && (
              <figure className="mt-10">
                <figcaption className="mb-3 text-center text-[18px] font-medium text-[var(--crm-ink)]">
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

            <div className="mt-8 rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-6 py-6">
              <p className="text-[17px] font-medium text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--crm-ink-soft)]">
                {LEGAL_CUERPO}
              </p>
            </div>

            <p className="mt-6 text-center text-[15px] text-[var(--crm-ink-mute)]">
              Este enlace estará disponible por {HORAS_VIGENCIA} horas · clinicaarmonizate.mx
            </p>
          </>
        )}
      </div>
    </main>
  );
}
