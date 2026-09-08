/** Las sedes de la clínica. El código es lo que se guarda; la dirección es referencia. */
export const SEDES = {
  CDMX: { nombre: "Ciudad de México", direccion: "Río Nilo 88, Cuauhtémoc, 06500 CDMX" },
  EDO: { nombre: "Estado de México", direccion: "Vía Láctea 16, Jardines de Satélite, Edomex" },
  QRO: { nombre: "Querétaro", direccion: "Av. Fray Luis de León 7072, int 1703, Colinas del Cimatario, 76090 Querétaro" },
  GDL: { nombre: "Guadalajara", direccion: "C. Jesús García 2892, consultorio 7, Prados Providencia, 44670 Guadalajara" },
  TRC: { nombre: "Torreón", direccion: "Av. Bruselas 567, San Isidro, Torreón" },
  MTY: { nombre: "Monterrey", direccion: "Cerro de las Mitras 2570, Obispado, Monterrey" },
  TIJ: { nombre: "Tijuana", direccion: "Blvd. Agua Caliente 802, Dávila, Tijuana" },
  PUE: { nombre: "Puebla", direccion: "Blvd. 5 de Mayo 2307, El Carmen" },
  SLP: { nombre: "San Luis Potosí", direccion: "Av. Tercer Milenio 205 L8, Lomas del Tecnológico" },
  CUN: { nombre: "Cancún", direccion: "Av. Bonampak SM4A, manzana 1" },
  OAX: { nombre: "Oaxaca", direccion: "C. 7 de Enero 127, Unión y Progreso" },
  VER: { nombre: "Veracruz", direccion: "Carlos A. Carrillo 24, Aguacatal, Xalapa Enríquez, Veracruz" },
  MET: { nombre: "Metepec", direccion: "Plaza Mayor, Calle Leona Vicario 386, Coaxustenco, Metepec" },
  LEO: { nombre: "León", direccion: "C. Hidalgo 717, Obregón, León de los Aldama, Gto." },
} as const;

export type Sede = keyof typeof SEDES;

export const CODIGOS_SEDE = Object.keys(SEDES) as Sede[];

export function nombreSede(codigo: string | null): string {
  return codigo && codigo in SEDES ? SEDES[codigo as Sede].nombre : "Sin sede";
}

export function esSede(valor: unknown): valor is Sede {
  return typeof valor === "string" && valor in SEDES;
}
