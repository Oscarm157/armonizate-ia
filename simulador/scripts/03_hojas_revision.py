"""Hojas de contacto para aprobar o descartar cada par a ojo.

Cada fila es un caso: antes | target compuesto | zoom de las dos orejas. Los casos
salen ordenados por sospecha (residual de alineacion y pelo nuevo dentro de la banda),
asi los problematicos caen en las primeras hojas.
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import RAIZ, leer  # noqa: E402

ANTES = RAIZ / "dataset" / "pares" / "antes"
ALINEADOS = RAIZ / "dataset" / "alineados"
REVISION = RAIZ / "dataset" / "revision"
SEÑALES = RAIZ / "dataset" / "señales.json"

ALTO = 420  # alto de cada fila
POR_HOJA = 8


def zoom_orejas(antes: np.ndarray, target: np.ndarray) -> np.ndarray:
    """Recorte de la franja de las orejas, antes arriba y target abajo."""
    alto, ancho = antes.shape[:2]
    y0, y1 = int(alto * 0.34), int(alto * 0.60)
    par = [cv2.resize(im[y0:y1], (ancho // 2, (y1 - y0) // 2)) for im in (antes, target)]
    return np.vstack(par)


def fila(num: str) -> np.ndarray | None:
    ruta_target = ALINEADOS / f"{num}.jpg"
    if not ruta_target.exists():
        return None
    antes, target = leer(ANTES / f"{num}.jpg"), leer(ruta_target)

    paneles = [antes, target, zoom_orejas(antes, target)]
    escalados = [cv2.resize(p, (int(p.shape[1] * ALTO / p.shape[0]), ALTO)) for p in paneles]
    tira = np.hstack(escalados)
    cv2.putText(tira, num, (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
    return tira


def main() -> int:
    REVISION.mkdir(parents=True, exist_ok=True)
    señales = [s for s in json.loads(SEÑALES.read_text()) if s["ok"]]
    # mas sospechoso primero: mala alineacion o pelo nuevo dentro de la banda
    señales.sort(key=lambda s: -(s["residual_rel"] * 20 + max(s["d_oscuro"], 0) * 10 + s["d_yaw"] * 5))

    filas = [(s["caso"], fila(s["caso"])) for s in señales]
    filas = [(n, f) for n, f in filas if f is not None]

    for i in range(0, len(filas), POR_HOJA):
        grupo = [f for _, f in filas[i : i + POR_HOJA]]
        w = max(f.shape[1] for f in grupo)
        hoja = np.vstack([cv2.copyMakeBorder(f, 0, 4, 0, w - f.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for f in grupo])
        destino = REVISION / f"hoja_{i // POR_HOJA + 1:02d}.jpg"
        cv2.imwrite(str(destino), hoja, [cv2.IMWRITE_JPEG_QUALITY, 88])

    print(f"{len(filas)} casos en {(len(filas) + POR_HOJA - 1) // POR_HOJA} hojas -> {REVISION}")
    print("orden: mas sospechoso primero")
    return 0


if __name__ == "__main__":
    sys.exit(main())
