"""Arma dataset.zip para el trainer de Kontext y aparta el holdout de evaluacion.

El trainer espera pares NNNN_start.jpg / NNNN_end.jpg con un .txt por par que dice la
edicion. El holdout no entra al zip: es contra lo que se mide despues, y si entrena
con el la evaluacion no vale nada.

La augmentacion existe porque las 100 fotos son de estudio y los prospectos mandan
selfies: sin variacion de luz, encuadre y compresion el modelo solo funciona con luz
de clinica.
"""

import json
import random
import shutil
import sys
import zipfile
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import FRENTE, LATERAL_DER, LATERAL_IZQ, MENTON, RAIZ, leer, puntos  # noqa: E402

ANTES = RAIZ / "dataset" / "pares" / "antes"
ALINEADOS = RAIZ / "dataset" / "alineados"
TRAIN = RAIZ / "dataset" / "train"
HOLDOUT = RAIZ / "dataset" / "holdout"
APROBADOS = RAIZ / "dataset" / "aprobados.json"
ZIP = RAIZ / "dataset.zip"

# Cuadrado y recortado a la cabeza. Las fotos de origen son verticales 1:2 y con
# medio encuadre de torso: la oreja, que es lo unico que el modelo tiene que
# aprender, se queda con pocos pixeles. Ademas Kontext procesa dos imagenes a la vez
# y con ese formato la memoria de la GPU se desborda.
LADO = 512
MARGEN = 1.9  # alto del recorte en veces la altura de la cara (frente a menton)
N_HOLDOUT = 15
AUMENTOS = 2  # variantes extra por par, ademas del original

# Redactada contra lo que muestran los casos de la clinica, no contra el prompt del
# demo: ahi la oreja queda natural y con el helix visible, no pegada al craneo.
INSTRUCCION = (
    "Acerca las orejas a la cabeza corrigiendo la protrusion, dejando el helix visible "
    "y el pliegue del antihelix definido. No cambies nada mas de la imagen: misma "
    "persona, mismo encuadre, mismo peinado, misma ropa, misma expresion, mismo fondo."
)


def caja_cabeza(pts: np.ndarray, forma: tuple[int, int]) -> tuple[int, int, int, int]:
    """Recorte cuadrado centrado en la cabeza, con aire de sobra para las orejas."""
    alto, ancho = forma
    h_cara = abs(pts[MENTON, 1] - pts[FRENTE, 1])
    cx = (pts[LATERAL_IZQ, 0] + pts[LATERAL_DER, 0]) / 2
    cy = (pts[FRENTE, 1] + pts[MENTON, 1]) / 2

    lado = min(MARGEN * h_cara, alto, ancho)
    x = int(np.clip(cx - lado / 2, 0, ancho - lado))
    y = int(np.clip(cy - lado / 2, 0, alto - lado))
    return x, y, int(lado), int(lado)


def recortar(img: np.ndarray, caja: tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = caja
    return cv2.resize(img[y : y + h, x : x + w], (LADO, LADO), interpolation=cv2.INTER_AREA)


def aumentar(antes: np.ndarray, target: np.ndarray, rng: random.Random) -> tuple[np.ndarray, np.ndarray]:
    """Misma variacion aplicada a los dos lados del par: solo cambia la condicion de
    captura, nunca la diferencia que el modelo tiene que aprender."""
    h, w = antes.shape[:2]
    m = rng.uniform(0.0, 0.06)
    x0, y0 = int(w * rng.uniform(0, m)), int(h * rng.uniform(0, m))
    x1, y1 = w - int(w * rng.uniform(0, m)), h - int(h * rng.uniform(0, m))

    ganancia = rng.uniform(0.88, 1.12)
    calidez = rng.uniform(-12, 12)  # azul vs rojo, simula luz de casa contra luz de estudio
    ruido = rng.uniform(0, 3.0)
    calidad = rng.randint(72, 95)

    salida = []
    for img in (antes, target):
        v = img[y0:y1, x0:x1].astype(np.float32) * ganancia
        v[:, :, 0] += calidez  # canal azul
        v[:, :, 2] -= calidez  # canal rojo
        if ruido > 0:
            v += np.random.normal(0, ruido, v.shape)
        v = np.clip(v, 0, 255).astype(np.uint8)
        ok, buf = cv2.imencode(".jpg", v, [cv2.IMWRITE_JPEG_QUALITY, calidad])
        salida.append(cv2.imdecode(buf, cv2.IMREAD_COLOR) if ok else v)
    return salida[0], salida[1]


def par_recortado(num: str) -> tuple[np.ndarray, np.ndarray] | tuple[None, None]:
    """Antes y target con el mismo recorte, el que sale de la geometria del antes."""
    antes, target = leer(ANTES / f"{num}.jpg"), leer(ALINEADOS / f"{num}.jpg")
    pts = puntos(antes)
    if pts is None:
        return None, None
    caja = caja_cabeza(pts, antes.shape[:2])
    return recortar(antes, caja), recortar(target, caja)


def main() -> int:
    for carpeta in (TRAIN, HOLDOUT):
        if carpeta.exists():
            shutil.rmtree(carpeta)
        carpeta.mkdir(parents=True)

    señales = json.loads(APROBADOS.read_text())
    aprobados = [s for s in señales if s["aprobado"]]

    # El holdout cubre todo el rango de magnitud del cambio, de la correccion mas
    # discreta a la mas marcada, para no medir solo los casos faciles.
    aprobados.sort(key=lambda s: s["d_banda"])
    paso = len(aprobados) / N_HOLDOUT
    idx_holdout = {int(i * paso + paso / 2) for i in range(N_HOLDOUT)}
    holdout = [s for i, s in enumerate(aprobados) if i in idx_holdout]
    entrenamiento = [s for i, s in enumerate(aprobados) if i not in idx_holdout]

    # El holdout se recorta igual que el entrenamiento: se evalua sobre el mismo
    # encuadre con el que el modelo va a trabajar en produccion.
    for s in holdout:
        num = s["caso"]
        antes, target = par_recortado(num)
        if antes is None:
            continue
        cv2.imwrite(str(HOLDOUT / f"{num}_antes.jpg"), antes, [cv2.IMWRITE_JPEG_QUALITY, 95])
        cv2.imwrite(str(HOLDOUT / f"{num}_real.jpg"), target, [cv2.IMWRITE_JPEG_QUALITY, 95])

    rng = random.Random(7)
    np.random.seed(7)
    n = 0
    for s in entrenamiento:
        num = s["caso"]
        antes, target = par_recortado(num)
        if antes is None:
            continue
        for k in range(1 + AUMENTOS):
            a, t = (antes, target) if k == 0 else aumentar(antes, target, rng)
            n += 1
            cv2.imwrite(str(TRAIN / f"{n:04d}_start.jpg"), a, [cv2.IMWRITE_JPEG_QUALITY, 95])
            cv2.imwrite(str(TRAIN / f"{n:04d}_end.jpg"), t, [cv2.IMWRITE_JPEG_QUALITY, 95])
            (TRAIN / f"{n:04d}.txt").write_text(INSTRUCCION)

    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(TRAIN.iterdir()):
            z.write(f, f.name)

    print(f"entrenamiento: {len(entrenamiento)} casos -> {n} pares (con {AUMENTOS} aumentos c/u)")
    print(f"holdout:       {len(holdout)} casos, apartados en {HOLDOUT}")
    print(f"zip:           {ZIP} ({ZIP.stat().st_size / 1e6:.1f} MB)")
    print("holdout:", ", ".join(s["caso"] for s in holdout))
    return 0


if __name__ == "__main__":
    sys.exit(main())
