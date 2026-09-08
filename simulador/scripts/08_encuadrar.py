"""Devuelve la imagen generada al encuadre exacto de la foto original.

Los modelos de edicion reencuadran aunque se les prohiba: alejan la toma un poco y
cambian el tamano. Pelear eso con el prompt no funciona, pero corregirlo despues si:
se alinea la salida sobre la entrada usando los puntos rigidos de la cara y se
devuelve al mismo tamano. Asi el antes y el despues quedan pixel a pixel comparables,
que es lo que necesita el comparador que ve el paciente.
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import RIGIDOS, leer, puntos  # noqa: E402


def reencuadrar(entrada: np.ndarray, generada: np.ndarray) -> np.ndarray | None:
    p_e, p_g = puntos(entrada), puntos(generada)
    if p_e is None or p_g is None:
        return None
    M, _ = cv2.estimateAffinePartial2D(
        p_g[RIGIDOS], p_e[RIGIDOS], method=cv2.RANSAC, ransacReprojThreshold=3.0
    )
    if M is None:
        return None
    alto, ancho = entrada.shape[:2]
    return cv2.warpAffine(
        generada, M, (ancho, alto), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("generada")
    ap.add_argument("salida")
    args = ap.parse_args()

    entrada, generada = leer(Path(args.entrada)), leer(Path(args.generada))
    fija = reencuadrar(entrada, generada)
    if fija is None:
        print("no se detecto cara en alguna de las dos")
        return 1

    cv2.imwrite(args.salida, fija, [cv2.IMWRITE_JPEG_QUALITY, 95])
    p_e, p_f = puntos(entrada), puntos(fija)
    d_e = np.linalg.norm(p_e[133] - p_e[362])
    d_f = np.linalg.norm(p_f[133] - p_f[362])
    print(f"{args.salida}  {fija.shape[1]}x{fija.shape[0]}  escala corregida: {d_f / d_e:.3f} (1.000 = idéntica)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
