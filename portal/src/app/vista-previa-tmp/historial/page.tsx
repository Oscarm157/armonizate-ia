// TEMPORAL: capturas locales. No se commitea.
import { Historial } from "@/app/admin/(panel)/historial/Historial";
import { FiltroEjecutivo } from "@/app/admin/(panel)/historial/FiltroEjecutivo";
import type { Simulacion } from "@/lib/schema";

const base = (id: string, horas: number): Simulacion => ({
  id, userId: "u", ejecutivoId: null, prospectoCorreo: "", prospectoVambe: null, sede: null,
  antesUrl: "x", antesPathname: "x", despuesUrl: "x", despuesPathname: "x",
  piezaUrl: null, piezaPathname: null, comparativaUrl: null, comparativaPathname: null,
  token: "tok" + id, expiraEn: new Date(Date.now() + horas * 3600_000), grado: "medio",
  calificacion: null, modelo: null, creadoEn: new Date(),
});

export default function V() {
  const prospectos = [
    { correo: "maria.lopez@gmail.com", vambe: "https://app.vambeai.com/c/1", asesor: "Ana", resultado: "pendiente" as const, sede: null, simulaciones: [base("11111111-1111-4111-8111-111111111111", 10)] },
    { correo: "jorge.ramirez@hotmail.com", vambe: null, asesor: "Itzel Segura", resultado: "ganado" as const, sede: null, simulaciones: [base("22222222-2222-4222-8222-222222222222", -5)] },
  ];
  return (
    <div className="crm-root min-h-[100dvh] bg-[var(--crm-bg)]">
      <main className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-16 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-medium text-[var(--crm-ink)]">Historial</h1>
            <p className="mt-1 text-[15px] text-[var(--crm-ink-mute)]">Marque en cada paciente si se hizo la venta.</p>
          </div>
          <FiltroEjecutivo ejecutivos={[{ id: "a", nombre: "Ana" }]} actual="" />
        </div>
        <Historial prospectos={prospectos} />
      </main>
    </div>
  );
}
