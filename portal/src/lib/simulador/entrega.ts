"use client";

// Las dos imágenes que el vendedor manda por WhatsApp.
//
// El aviso va impreso EN la imagen, no en la página: la imagen se reenvía sola y sin
// él una simulación se lee como una promesa de resultado.

const AVISO = "Previsualización generada con IA · Los resultados finales pueden variar";

const TINTA = "#121333";
const INDIGO = "#4c4e98";
const LAVANDA = "#eae7f3";

function lienzo(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió dibujar la imagen.");
  return [c, ctx];
}

/** Franja del aviso al pie, proporcional al ancho para que se lea a cualquier tamaño. */
function pintarAviso(ctx: CanvasRenderingContext2D, ancho: number, y: number, alturaFranja: number) {
  ctx.fillStyle = LAVANDA;
  ctx.fillRect(0, y, ancho, alturaFranja);
  ctx.fillStyle = TINTA;
  ctx.font = `500 ${Math.round(alturaFranja * 0.34)}px Montserrat, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(AVISO, ancho / 2, y + alturaFranja / 2, ancho * 0.94);
}

function pintarEtiqueta(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number) {
  const alto = Math.round(ancho * 0.075);
  ctx.fillStyle = INDIGO;
  ctx.beginPath();
  ctx.roundRect(x + ancho * 0.03, y + ancho * 0.03, ancho * 0.30, alto, alto / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${Math.round(alto * 0.45)}px Montserrat, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + ancho * 0.03 + ancho * 0.15, y + ancho * 0.03 + alto / 2);
}

/** Solo el después, con el aviso al pie. */
export function soloDespues(despues: HTMLCanvasElement): HTMLCanvasElement {
  const franja = Math.round(despues.width * 0.075);
  const [c, ctx] = lienzo(despues.width, despues.height + franja);
  ctx.drawImage(despues, 0, 0);
  pintarAviso(ctx, c.width, despues.height, franja);
  return c;
}

/** Antes y después juntos, etiquetados, con el aviso al pie. */
export function antesYDespues(
  antes: HTMLImageElement,
  despues: HTMLCanvasElement
): HTMLCanvasElement {
  const w = despues.width;
  const h = despues.height;
  const sep = Math.round(w * 0.02);
  const franja = Math.round(w * 0.075);

  const [c, ctx] = lienzo(w * 2 + sep, h + franja);
  ctx.fillStyle = LAVANDA;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(antes, 0, 0, w, h);
  ctx.drawImage(despues, w + sep, 0, w, h);

  pintarEtiqueta(ctx, "ANTES", 0, 0, w);
  pintarEtiqueta(ctx, "DESPUÉS", w + sep, 0, w);
  pintarAviso(ctx, c.width, h, franja);
  return c;
}

export function descargar(canvas: HTMLCanvasElement, nombre: string) {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/jpeg",
    0.95
  );
}

export function aDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Reduce una foto antes de subirla. Una foto de celular pesa varios MB y en base64
 * crece un tercio más, por encima del límite de cuerpo de una petición.
 */
export function reducir(img: HTMLImageElement, ladoMaximo = 1600): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
  const [c, ctx] = lienzo(
    Math.round(img.naturalWidth * escala),
    Math.round(img.naturalHeight * escala)
  );
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
