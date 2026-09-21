// TEMPORAL: capturas locales. No se commitea.
import { Comparador } from "@/app/s/[token]/Comparador";
export default function V() {
  return (
    <main className="crm-root flex min-h-[100dvh] flex-col items-center bg-[var(--crm-bg)] px-5 py-10 sm:px-8">
      <div className="w-full max-w-[760px]">
        <h1 className="text-center text-[30px] font-medium text-[var(--crm-ink)]">Su simulación</h1>
        <p className="mx-auto mt-2 mb-6 max-w-[40ch] text-center text-[18px] leading-relaxed text-[var(--crm-ink-soft)]">
          Use los botones de abajo para cambiar entre su foto actual y la simulación.
        </p>
        <Comparador token="prueba" />
      </div>
    </main>
  );
}
