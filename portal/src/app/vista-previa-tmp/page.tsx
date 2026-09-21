// TEMPORAL: solo para capturas locales del piloto. No se commitea.
import { Simulador } from "@/components/simulador/Simulador";

export default function VistaPrevia() {
  const ejecutivos = ["Adrián Ruiz", "Alejandra Aremi", "Itzel Segura", "Alexa Valdes", "Ana", "Carolina"].map(
    (nombre, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, nombre })
  );
  return (
    <div className="crm-root min-h-[100dvh] bg-[var(--crm-bg)]">
      <main className="mx-auto w-full max-w-[1200px] px-5 pt-4 pb-16 sm:px-8">
        <div className="crm-fade mx-auto max-w-[1180px]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h1 className="text-[24px] font-medium text-[var(--crm-ink)]">Simulador de otomodelación</h1>
            <p className="text-right text-[14px] text-[var(--crm-ink-mute)]"><span className="crm-num text-[20px] text-[var(--crm-ink)]">26 de 50</span> simulaciones usadas este mes</p>
          </div>
          <Simulador usadas={26} tope={50} ejecutivos={ejecutivos} />
        </div>
      </main>
    </div>
  );
}
