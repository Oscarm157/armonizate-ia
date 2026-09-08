import Image from "next/image";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Simulador", robots: { index: false } };

export default async function LoginPage() {
  const me = await getCurrentUser();
  if (me) redirect("/admin");

  // `crm-root` trae la paleta de la clínica: el login es la primera pantalla que ve el
  // vendedor y tiene que leerse como la misma casa que el sitio.
  return (
    <main className="crm-root flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-[var(--crm-bg)] px-5 py-12">
      <div className="w-full max-w-[380px]">
        <Image
          src="/logo-armonizate.png"
          alt="Clínica Armonízate"
          width={1410}
          height={377}
          priority
          className="mx-auto mb-8 h-10 w-auto"
        />

        <div className="rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)] px-7 py-8">
          <h1 className="crm-display text-[26px]!">Simulador</h1>
          <p className="mt-1 mb-6 text-[13.5px] text-[var(--crm-ink-mute)]">
            Acceso para el equipo de la clínica.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--crm-ink-faint)]">
          Uso exclusivo del equipo de Clínica Armonízate
        </p>
      </div>
    </main>
  );
}
