@AGENTS.md

# Portal del simulador · Clínica Armonízate

Herramienta interna de ventas. El vendedor recibe la foto de un prospecto por WhatsApp,
la sube aquí y le devuelve cómo se vería después de la otomodelación.

Construido sobre el starter de plomería de Oscar; el CRM (leads, blog, dashboard) se
borró porque el portal hace una sola cosa.

## Reglas
- Toda server action / route handler abre con `requireUser()` / `getCurrentUser()`.
  Validar todo input con Zod (`src/lib/validate.ts`). Nunca confiar en IDs del cliente:
  cargarlos de DB filtrando por dueño.
- Cada vista nace con loading / empty / error (`src/components/states.tsx`).
- Secrets solo en `.env.local`. Headers de seguridad en `next.config.ts`.
- El endpoint que llama al modelo va protegido con BotID y **verifica la cuota antes de
  gastar** (`src/app/api/simular/route.ts`).
- Diseño: leer `DESIGN.md`. La paleta salió del sitio real de la clínica.

## El pipeline de imagen (`src/lib/simulador/`)
Corre en el navegador, no en el servidor. Son tres piezas y ninguna sobra; cada una se
calibró contra 100 casos reales de la clínica en `~/Projects/armonizate-simulador`:

1. **Recorte a la cabeza** antes de mandar la foto. Con la oreja en pocos píxeles la
   corrección sale tímida. El recorte es interno: el resultado se entrega en el
   encuadre original.
2. **Una sola imagen al modelo, sin ejemplos.** Se probó darle pares antes/después
   reales como referencia visual y el resultado empeoró.
3. **Componer solo la zona de las orejas** sobre la foto original. Sin esto el modelo
   devuelve al paciente con la piel suavizada y las cejas redibujadas.

El prompt de `src/lib/simulador/modelo.ts` está calibrado: pedir "hélix visible" o
"conserva el tamaño de la oreja" frena la corrección. No se edita sin volver a medir
contra el holdout del otro repo.

## Qué hay
- Auth por cookie firmada (`src/lib/auth.ts` + `src/lib/session.ts`). Roles:
  admin (administra el equipo), agent (el vendedor), viewer (solo mira).
- Alta de vendedores desde `/admin/users`, con contraseña temporal de un solo uso.
- Tope de 100 simulaciones al mes por vendedor, contado en la base (`src/lib/datos.ts`).
  Un rate limit en memoria no sirve: cada instancia serverless arranca su contador.
- Las fotos de pacientes se sirven por `/admin/simulaciones/[id]/[cual]`, que valida
  sesión. Las URLs de Blob son públicas y nunca se exponen.

## Datos de pacientes
Son datos biométricos y la clínica tiene el consentimiento firmado. Ninguna foto se
commitea nunca.
