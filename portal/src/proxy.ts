import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Guard de borde para el panel: sin sesión válida → /login. La verificación fina
// (rol, mustChangePassword) la hace cada layout/página con requireUser/requireRole.
export async function proxy(req: NextRequest) {
  const uid = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (uid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
