"""Deja la foto original intacta y le pega solo las orejas de la imagen generada.

Los modelos de edicion retocan el rostro aunque el prompt lo prohiba: suavizan la
piel, redibujan cejas y pestanas, abren los ojos. En una herramienta de venta medica
eso no se puede entregar, porque el paciente se ve mejor por razones que no son el
procedimiento.

Aqui la salida del modelo se usa unicamente como fuente para la zona de las orejas.
Todo lo demas es la foto original sin tocar, asi que la cara del paciente es su cara.
Es la misma tecnica con la que se armaron los pares de entrenamiento.
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module  # noqa: E402

from comun import leer, puntos  # noqa: E402

_c = import_module("02_componer")
_e = import_module("08_encuadrar")


def componer(original: np.ndarray, generada: np.ndarray) -> np.ndarray | None:
    alineada = _e.reencuadrar(original, generada)
    if alineada is None:
        return None
    pts = puntos(original)
    if pts is None:
        return None

    alineada = _c.igualar_exposicion(alineada, original, pts)
    m = _c.banda(pts, original.shape[:2])
    m3 = cv2.merge([m, m, m])
    return (original * (1 - m3) + alineada * m3).astype(np.uint8)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("original")
    ap.add_argument("generada")
    ap.add_argument("salida")
    args = ap.parse_args()

    original, generada = leer(Path(args.original)), leer(Path(args.generada))
    final = componer(original, generada)
    if final is None:
        print("no se detecto cara")
        return 1

    cv2.imwrite(args.salida, final, [cv2.IMWRITE_JPEG_QUALITY, 95])

    pts = puntos(original)
    fuera = _c.banda(pts, original.shape[:2]) <= 0.5
    d = cv2.absdiff(original, final).mean(axis=2)
    print(f"{args.salida}  {final.shape[1]}x{final.shape[0]}")
    print(f"  cambio fuera de las orejas: {d[fuera].mean():.3f} sobre 255 (0 = rostro intacto)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
