/**
 * Las sedes de la clínica. El código es lo que se guarda; la dirección es referencia.
 * `whatsapp`: número de la sucursal, sin "+". Lista de canales que pasó Oscar el
 * 2026-09-22; las sedes sin canal propio usan el que comparten según clinicaarmonizate.mx
 * (Oaxaca con Guadalajara, Veracruz con Puebla, Cancún y SLP con Torreón, León con
 * Querétaro, Edomex y Metepec con el central).
 */
export const SEDES = {
  CDMX: { nombre: "Ciudad de México", direccion: "Río Nilo 88, Cuauhtémoc, 06500 CDMX", whatsapp: "5215529395810" },
  EDO: { nombre: "Estado de México", direccion: "Vía Láctea 16, Jardines de Satélite, Edomex", whatsapp: "5215520919481" },
  QRO: { nombre: "Querétaro", direccion: "Av. Fray Luis de León 7072, int 1703, Colinas del Cimatario, 76090 Querétaro", whatsapp: "5215516879498" },
  GDL: { nombre: "Guadalajara", direccion: "C. Jesús García 2892, consultorio 7, Prados Providencia, 44670 Guadalajara", whatsapp: "5215536620738" },
  TRC: { nombre: "Torreón", direccion: "Av. Bruselas 567, San Isidro, Torreón", whatsapp: "5215539761618" },
  MTY: { nombre: "Monterrey", direccion: "Cerro de las Mitras 2570, Obispado, Monterrey", whatsapp: "5218116290001" },
  TIJ: { nombre: "Tijuana", direccion: "Blvd. Agua Caliente 802, Dávila, Tijuana", whatsapp: "5216651502415" },
  PUE: { nombre: "Puebla", direccion: "Blvd. 5 de Mayo 2307, El Carmen", whatsapp: "5212212798120" },
  SLP: { nombre: "San Luis Potosí", direccion: "Av. Tercer Milenio 205 L8, Lomas del Tecnológico", whatsapp: "5215539761618" },
  CUN: { nombre: "Cancún", direccion: "Av. Bonampak SM4A, manzana 1", whatsapp: "5215539761618" },
  OAX: { nombre: "Oaxaca", direccion: "C. 7 de Enero 127, Unión y Progreso", whatsapp: "5215536620738" },
  VER: { nombre: "Veracruz", direccion: "Carlos A. Carrillo 24, Aguacatal, Xalapa Enríquez, Veracruz", whatsapp: "5212212798120" },
  MET: { nombre: "Metepec", direccion: "Plaza Mayor, Calle Leona Vicario 386, Coaxustenco, Metepec", whatsapp: "5215520919481" },
  LEO: { nombre: "León", direccion: "C. Hidalgo 717, Obregón, León de los Aldama, Gto.", whatsapp: "5215516879498" },
} as const satisfies Record<string, { nombre: string; direccion: string; whatsapp: string }>;

/** El WhatsApp central, para enlaces sin sucursal (los generados antes de elegirla). */
export const WHATSAPP_GENERAL = "5215520919481";

/** Enlace de WhatsApp de la sucursal con el mensaje ya escrito para el paciente. */
export function enlaceWhatsApp(sede: string | null, mensaje: string): string {
  const numero = sede && sede in SEDES ? SEDES[sede as Sede].whatsapp : WHATSAPP_GENERAL;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export type Sede = keyof typeof SEDES;

export const CODIGOS_SEDE = Object.keys(SEDES) as Sede[];

export function nombreSede(codigo: string | null): string {
  return codigo && codigo in SEDES ? SEDES[codigo as Sede].nombre : "Sin sede";
}

export function esSede(valor: unknown): valor is Sede {
  return typeof valor === "string" && valor in SEDES;
}
