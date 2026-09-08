# DESIGN · Portal del simulador · Clínica Armonízate

## Reference lock

La referencia es el sitio de la propia clínica, `clinicaarmonizate.mx`. No se inventa una
estética nueva: el vendedor abre esto todo el día al lado del sitio y de WhatsApp, y tiene que
leerse como la misma casa.

Lo que se toma de ahí: el fondo lavanda muy claro, el bloque índigo como pieza protagonista,
Montserrat, los botones en píldora y las esquinas generosamente redondeadas.

Lo que **no** se copia: el sitio es una landing de venta, con bloques de altura completa,
imágenes de fondo y titulares enormes. Esto es una herramienta de trabajo; la escala tipográfica
baja y la densidad sube.

## Tema y atmósfera

Claro, no oscuro. El starter viene con panel oscuro y aquí se invierte por dos razones: la marca
es clara y lavanda, y el vendedor va a usar el portal en la calle, en el celular, muchas veces a
plena luz.

Sobrio y clínico. Nada de degradados, glow ni cristal. La atmósfera la da el lavanda del fondo
contra las superficies blancas, no los efectos.

## Paleta, por rol

Medida del sitio real, no inventada:

| Rol | Color | Uso |
|---|---|---|
| Fondo de página | `#eae7f3` lavanda | el lienzo, siempre |
| Superficie | `#ffffff` | tarjetas, tablas, formularios |
| Superficie hundida | `#f5f4fa` | filas alternas, campos, zonas de arrastre |
| Acento | `#4c4e98` índigo | botones primarios, enlaces, estado activo |
| Acento hover | `#3d3f7d` | solo hover del acento |
| Tinta fuerte | `#121333` | títulos y cifras |
| Tinta suave | `#4a4a63` | texto de párrafo |
| Tinta tenue | `#7c7798` morado grisáceo | etiquetas, metadatos, marcas de tiempo |
| Línea | `#dedbea` | hairlines, bordes de tarjeta |
| Peligro | `#cc3366` rosa de la marca | errores, destructivo, cuota agotada |

El rosa es de la marca y por eso funciona como alerta sin sentirse ajeno. **No se usa como
decoración**, solo cuando algo va mal o se acaba.

## Tipografía

**Montserrat** para todo, la del sitio. Cargada desde Google Fonts con `next/font`.

- Títulos de vista: 22px, peso 700, tinta fuerte, sin mayúsculas forzadas.
- Etiquetas de sección: 11px, peso 600, tracking amplio, tinta tenue.
- Cuerpo e interfaz: 14px, peso 400 y 500.
- Cifras (cuota, contadores): `font-variant-numeric: tabular-nums`, peso 600.

El logo es la marca; el portal no repite "Clínica Armonízate" en texto al lado del logo.

## Componentes

- **Botón primario:** píldora (`rounded-full`), fondo índigo, texto blanco, sin sombra. La forma
  de píldora viene del sitio y es lo que más ata el portal a la marca.
- **Botón secundario:** píldora, fondo transparente, borde de línea, tinta fuerte.
- **Tarjetas:** blanco, `radius 16px`, borde hairline. **Elevación por color y línea, nunca por
  sombra**, salvo en overlays.
- **Campos:** fondo blanco, borde de línea, `radius 10px`, foco con anillo índigo al 35%.
- **Zona de subida de foto:** borde punteado índigo sobre superficie hundida, la pieza más grande
  de la pantalla principal.

## Layout

Mobile-first de verdad, no un escritorio encogido: el vendedor está en la calle con el prospecto
en WhatsApp. En celular todo es de una columna, la foto y el resultado van apilados y los botones
de descarga son de ancho completo y del alto del pulgar. A partir de `lg`, la foto y el panel de
control se ponen lado a lado.

Ancho máximo 1180px. Respiro generoso: esta herramienta hace una sola cosa.

## Motion

Con propósito y poco. Entrada de resultados con `fadeUp` de `src/lib/motion.ts`, la barra de
progreso mientras genera, y nada más. Todo respeta `prefers-reduced-motion`.

## Guardrails anti-slop

- Ni una sombra de colores, ni glow, ni degradado morado de moda.
- Nada de emojis en la interfaz.
- El copy dice qué hace el botón: "Generar simulación", "Descargar antes y después". Nada de
  "¡Listo!", "¡Genial!" ni signos de admiración.
- El aviso legal se ve, no se esconde en gris claro de 10px.
- Los estados vacíos dicen qué hacer, no dan la bienvenida.
