import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * La tarjeta que WhatsApp enseña al pegar el enlace del paciente.
 *
 * Es siempre la misma, a propósito: no recibe el token ni lee la simulación. Lo que se
 * previsualiza en una conversación lo ve cualquiera que tenga el chat abierto, y la
 * fotografía de un paciente no puede acabar ahí.
 *
 * Sin esto WhatsApp caía al icono de 192 px y lo estiraba, que es por lo que se veía
 * pixeleado.
 */
export const alt = "Clínica Armonízate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// El lavanda de la marca. El logo del archivo es negro, así que el fondo va claro: sobre
// el índigo habría que repintarlo y satori no aplica filtros.
const LAVANDA = "#eae7f3";
const TINTA = "#121333";

export default async function Imagen() {
  const logo = await readFile(join(process.cwd(), "public", "logo-armonizate.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          background: LAVANDA,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={640} height={171} />
        <div style={{ fontSize: 38, color: TINTA, opacity: 0.75 }}>
          Tu simulación de Otomodelación
        </div>
      </div>
    ),
    size
  );
}
