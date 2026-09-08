import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";

import { getCurrentUser } from "@/lib/session";

export async function POST() {
  // 1) Sesión obligatoria.
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // 2) Vercel BotID. En local no bloquea (isBot=false); en prod filtra bots.
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Bloqueado." }, { status: 403 });
  }

  // Trabajo caro simulado.
  return NextResponse.json({
    ok: true,
    result: `procesado para ${me.name}`,
    at: new Date().toISOString(),
  });
}
