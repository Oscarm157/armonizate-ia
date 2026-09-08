# Starter (plomería design-agnóstico)

Base para arrancar proyectos rápido sin recablear lo de siempre: auth, base de datos, subida de
archivos, correo, validación, seguridad, monitoreo, estados y CI ya cableados. El diseño NO viene
incluido a propósito (shadcn neutro): lo vistes por cliente.

## Stack
Next 16 (App Router) · React 19 · Tailwind v4 · TypeScript · Drizzle + Neon · Zod ·
Vercel Blob · Resend · Sentry · Vercel BotID · Playwright.

## Cómo usarlo para un proyecto nuevo
1. **Crea el proyecto desde este repo.** En GitHub: botón "Use this template", o clónalo y resetea git:
   ```bash
   git clone https://github.com/Oscarm157/starter.git mi-proyecto
   cd mi-proyecto
   rm -rf .git && git init && git add -A && git commit -m "init"
   ```
2. **Configura el entorno.** `cp .env.example .env.local` y rellena al menos `DATABASE_URL` (Neon) y
   `AUTH_SECRET` (genera uno con `openssl rand -base64 32`, mínimo 16 chars). Los demás son opcionales.
3. **Instala y prepara la base de datos.**
   ```bash
   npm install
   npm run db:generate && npm run db:migrate   # crea las tablas en tu Neon
   npm run db:seed                              # crea un admin e imprime su contraseña temporal
   ```
4. **Corre.** `npm run dev`, entra a `/login` con el admin del seed y cámbiale la contraseña.
5. **Pon tu diseño.** Llena `DESIGN.md` desde el reference lock de Refero y construye la UI encima del
   shell neutro. Renombra o borra la tabla `items` y su página de ejemplo (es solo demostración).

## Scripts
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera la migración SQL desde `src/lib/schema.ts` |
| `npm run db:migrate` | Aplica las migraciones a la DB |
| `npm run db:push` | Sincroniza el schema sin migración (solo dev) |
| `npm run db:seed` | Crea el usuario admin inicial (idempotente) |
| `npm run test:e2e` | Smoke de Playwright (captura el login) |

## CRM (módulo en `/admin`)
El panel administrativo vive en `/admin` (sitio público del cliente en `/`). Trae:
- **Leads**: lista con filtros y paginación, pipeline kanban (6 estados), detalle con comentarios,
  bitácora de eventos (audit), archivos adjuntos y asignación. Captura pública por `POST /api/leads`
  (rate-limit, dedupe, aviso por correo, webhook opcional).
- **Usuarios** multi-rol (`admin` / `agent` / `viewer`): alta, edición, reset de contraseña, activar/desactivar.
  El `agent` solo ve sus leads asignados; `viewer` es solo lectura.
- **Dashboard** de métricas (funnel, conversión, por fuente, por agente, tendencia).
- **Blog** bilingüe (es/en) opcional con draft por IA.

Tema del panel: dark + acento mint, todo bajo `.crm-root` (no se filtra al sitio público). Re-márcalo
cambiando una sola variable, `--crm-accent`, en `globals.css`.

**IA (opcional, detrás de `ANTHROPIC_API_KEY`):** draft de blog desde texto pegado y resumen de leads
de bot. Sin la key, ambos se omiten sin romper nada. Personaliza la voz del blog en `src/lib/blog/voice.ts`
(no la dejes genérica en producción).

**Para el tier "Landing" (sin CRM):** borra `src/app/admin`, `src/app/api/leads`, `src/proxy.ts`, las
tablas CRM de `src/lib/schema.ts` (`leads*`, `articles`) y las libs `crm-*` / `blog`. El resto sigue en pie.

**Capa de dominio (capa 3, bespoke por cliente):** la tabla `items` y `/admin/items` son la plantilla del
patrón CRUD. Duplícala/renómbrala para tu entidad real (propiedades, productos…) o bórrala.

## Qué incluye
- **Auth**: sesión por cookie firmada (PBKDF2 + HMAC), `requireUser`/`requireRole`, login / logout /
  cambio de contraseña. `src/lib/auth.ts`, `src/lib/session.ts`.
- **Datos**: Drizzle + Neon (`src/lib/db.ts`, `src/lib/schema.ts`), migraciones y seed.
- **Seguridad por default**: security headers (`next.config.ts`), validación Zod de inputs
  (`src/lib/validate.ts`), guards en cada action/route, BotID en endpoints caros
  (`src/app/api/expensive`). Env validado en `src/lib/env.ts`.
- **Estados por default**: `Loading` / `Empty` / `ErrorState` (`src/components/states.tsx`) y la
  página `/admin/items` que los demuestra (loading.tsx, error.tsx, empty).
- **Infra**: Sentry guardado por DSN, CI en GitHub Actions (tsc + lint + build), Playwright smoke.
- **Extras**: `lib/blob.ts` (subida de imágenes), `lib/email.ts` (Resend).

## Variables de entorno
- `DATABASE_URL` (requerida): Postgres/Neon.
- `AUTH_SECRET` (requerida): firma de sesiones, mínimo 16 chars.
- `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`: opcionales según lo que uses.
- `NEXT_PUBLIC_SENTRY_DSN`: opcional. Sin DSN, Sentry queda inerte (no rompe nada).

## Reglas (regla de oro: la plomería no se reinventa)
- Toda server action / route abre con guard de auth y valida input con Zod. Nunca confiar en IDs del
  cliente: cargarlos de DB.
- Cada vista nace con loading / empty / error. Persistir el estado del usuario, nada efímero.
- Secrets solo en `.env.local`. Commits chicos por feature, push frecuente.
- El diseño es bespoke por proyecto (Refero + `DESIGN.md`); este repo no impone estética.
- Detalle completo en `CLAUDE.md`.

## Deploy (Vercel)
- Pon las env vars en el proyecto de Vercel. BotID y los security headers funcionan en el deploy.
- Para subir source maps a Sentry, envuelve `next.config.ts` con `withSentryConfig` y agrega
  `SENTRY_AUTH_TOKEN`.
