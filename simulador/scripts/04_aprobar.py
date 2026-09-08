"""Filtra los pares que no sirven para entrenar y deja el resto aprobado.

Descarta por tres motivos medibles: la alineacion no cerro, la pose cambio demasiado
entre las dos tomas, o el despues trae pelo suelto tapando la oreja (el composite
mete cabello donde deberia ir el resultado). Aparte quita los casos duplicados, que
son la misma foto repetida en la carpeta de origen.

Deja hojas de contacto de los descartados para poder discutir el criterio.
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
APROBADOS = RAIZ / "dataset" / "aprobados.json"

MAX_RESIDUAL = 0.030  # error de alineacion sobre la distancia interocular
MAX_YAW = 0.030  # diferencia de giro de cabeza entre antes y despues
MAX_OSCURO = 0.040  # pelo nuevo dentro de la banda de las orejas


def huella(ruta: Path) -> str:
    """dHash para detectar la misma foto repetida."""
    g = cv2.cvtColor(leer(ruta), cv2.COLOR_BGR2GRAY)
    chico = cv2.resize(g, (17, 16), interpolation=cv2.INTER_AREA)
    bits = (chico[:, 1:] > chico[:, :-1]).flatten()
    return "".join("1" if b else "0" for b in bits)


def main() -> int:
    señales = json.loads(SEÑALES.read_text())
    vistos: dict[str, str] = {}
    resultado = []

    for s in señales:
        num = s["caso"]
        if not s["ok"]:
            resultado.append({**s, "aprobado": False})
            continue

        motivos = []
        if s["residual_rel"] > MAX_RESIDUAL:
            motivos.append("alineacion")
        if s["d_yaw"] > MAX_YAW:
            motivos.append("pose")
        if s["d_oscuro"] > MAX_OSCURO:
            motivos.append("pelo tapa la oreja")

        h = huella(ANTES / f"{num}.jpg")
        if h in vistos:
            motivos.append(f"duplicado de {vistos[h]}")
        else:
            vistos[h] = num

        resultado.append({**s, "aprobado": not motivos, "motivo": ", ".join(motivos) or None})

    APROBADOS.write_text(json.dumps(resultado, indent=2, ensure_ascii=False))

    aprobados = [r for r in resultado if r["aprobado"]]
    descartados = [r for r in resultado if not r["aprobado"]]
    print(f"aprobados: {len(aprobados)}  descartados: {len(descartados)}")
    for r in descartados:
        print(f"  {r['caso']}: {r.get('motivo') or r.get('motivo_ok') or 'sin cara'}")

    # hoja con los descartados, para revisar el criterio a ojo
    filas = []
    for r in descartados:
        ruta = ALINEADOS / f"{r['caso']}.jpg"
        if not ruta.exists():
            continue
        antes, target = leer(ANTES / f"{r['caso']}.jpg"), leer(ruta)
        tira = np.hstack([cv2.resize(im, (int(im.shape[1] * 380 / im.shape[0]), 380)) for im in (antes, target)])
        cv2.putText(tira, f"{r['caso']} {r.get('motivo') or ''}", (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        filas.append(tira)
    if filas:
        w = max(f.shape[1] for f in filas)
        hoja = np.vstack([cv2.copyMakeBorder(f, 0, 4, 0, w - f.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for f in filas])
        cv2.imwrite(str(REVISION / "descartados.jpg"), hoja, [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(f"  -> {REVISION / 'descartados.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
