import Link from "next/link";
import { Button } from "@/components/ui/button";

// Home pública placeholder. Aquí va el sitio bespoke del cliente (construido con
// el reference lock de Refero + DESIGN.md). El panel vive en /admin.
export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Starter</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Sitio público del cliente. Reemplaza esta página por el diseño bespoke. El
          panel administrativo está en <code>/admin</code>.
        </p>
      </div>
      <Button asChild>
        <Link href="/admin">Entrar al panel</Link>
      </Button>
    </main>
  );
}
