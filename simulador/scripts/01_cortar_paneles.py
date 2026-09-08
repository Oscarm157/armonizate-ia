"""Corta cada caso (dos paneles lado a lado sobre margen blanco) en antes/despues.

El separador cae al centro y los bordes de cada panel se detectan por la caida de
brillo contra el margen blanco de la composicion.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "dataset" / "fuente"
ANTES = RAIZ / "dataset" / "pares" / "antes"
DESPUES = RAIZ / "dataset" / "pares" / "despues"

MARGEN = 12  # cuanto mas oscura que el margen tiene que ser una columna/fila del panel


def bordes(perfil: np.ndarray) -> tuple[int, int]:
    """Primer y ultimo indice cuyo brillo cae por debajo del margen blanco."""
    dentro = np.where(perfil < perfil.max() - MARGEN)[0]
    return int(dentro.min()), int(dentro.max())


def cortar(ruta: Path) -> tuple[Image.Image, Image.Image] | None:
    img = Image.open(ruta).convert("RGB")
    gris = np.array(img.convert("L")).astype(float)
    alto, ancho = gris.shape

    col = gris.mean(axis=0)
    # el separador es la columna mas clara del tercio central
    ini, fin = int(ancho * 0.40), int(ancho * 0.60)
    sep = ini + int(np.argmax(col[ini:fin]))

    x0, x1 = bordes(col[:sep])
    x2r, x3r = bordes(col[sep:])
    x2, x3 = sep + x2r, sep + x3r

    fila = gris.mean(axis=1)
    y0, y1 = bordes(fila)

    izq = img.crop((x0, y0, x1 + 1, y1 + 1))
    der = img.crop((x2, y0, x3 + 1, y1 + 1))
    if min(izq.width, izq.height, der.width, der.height) < 200:
        return None
    return izq, der


def main() -> int:
    ANTES.mkdir(parents=True, exist_ok=True)
    DESPUES.mkdir(parents=True, exist_ok=True)

    casos = sorted(FUENTE.glob("*.jpeg"), key=lambda p: int("".join(c for c in p.stem if c.isdigit())))
    fallos = []
    for ruta in casos:
        num = "".join(c for c in ruta.stem if c.isdigit()).zfill(3)
        corte = cortar(ruta)
        if corte is None:
            fallos.append(ruta.name)
            continue
        izq, der = corte
        izq.save(ANTES / f"{num}.jpg", quality=95)
        der.save(DESPUES / f"{num}.jpg", quality=95)

    print(f"cortados: {len(casos) - len(fallos)}/{len(casos)}")
    if fallos:
        print("fallaron:", ", ".join(fallos))
    return 0


if __name__ == "__main__":
    sys.exit(main())
