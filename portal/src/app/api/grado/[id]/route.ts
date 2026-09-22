import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";
import { serverEnv } from "@/lib/env";
import { leerCajas } from "@/lib/simulador/clasificar";

export const runtime = "nodejs";

/** Estado de la ubicación de orejas arrancada en POST /api/grado. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || !canSimular(me.role)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  // Los ids de Replicate son alfanuméricos: cualquier otra cosa no se manda.
  if (!/^[a-z0-9]{10,40}$/.test(id)) return NextResponse.json({ estado: "fallo" });

  const { REPLICATE_API_TOKEN } = serverEnv();
  if (!REPLICATE_API_TOKEN) return NextResponse.json({ estado: "fallo" });

  return NextResponse.json(await leerCajas(id, REPLICATE_API_TOKEN));
}
