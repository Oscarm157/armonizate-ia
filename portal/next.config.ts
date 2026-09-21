import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

// Security headers por default (regla del starter: seguridad de base, no al final).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Solo ArmoAdmin puede mostrar el portal en un iframe (Web Tab del panel de la clínica).
  { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://admin.clinicaarmonizate.mx" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Envuelve la config con BotID preservando headers y poweredByHeader existentes.
export default withBotId(nextConfig);
