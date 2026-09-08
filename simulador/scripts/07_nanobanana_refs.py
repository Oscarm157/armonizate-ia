"""Prueba nano-banana guiado con casos reales de la clinica como referencia visual.

Nano-banana no se puede entrenar, pero acepta varias imagenes de entrada. En vez de
describirle con palabras como queda una otomodelacion (que es donde el demo se pasaba
de la raya), se le enseñan pares antes/despues reales y se le pide la misma
transformacion sobre la foto del paciente.

Las referencias salen de casos de entrenamiento; el paciente sale del holdout, que
ningun modelo ha visto.
"""

import argparse
import base64
import json
import sys
import time
import urllib.request
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module  # noqa: E402

from comun import RAIZ, leer, puntos  # noqa: E402

armar = import_module("05_armar_zip")
API = "https://api.replicate.com/v1"

ANTES = RAIZ / "dataset" / "pares" / "antes"
ALINEADOS = RAIZ / "dataset" / "alineados"
HOLDOUT = RAIZ / "dataset" / "holdout"
SALIDA = RAIZ / "dataset" / "resultados"

# Casos de entrenamiento con correccion marcada y foto limpia.
REFERENCIAS = ["009", "011", "021"]

PROMPT = """Las primeras {n} imágenes son ejemplos reales de un procedimiento médico de otomodelación en pares: {pares}. Estudia exactamente cuánto y cómo se acercan las orejas a la cabeza en esos ejemplos.

La ÚLTIMA imagen es la fotografía de un paciente nuevo. Devuelve esa última fotografía con el mismo procedimiento aplicado, con la MISMA intensidad de corrección que muestran los ejemplos: ni menos, ni más.

Reglas estrictas sobre la última imagen:
- Cambia ÚNICAMENTE las orejas. Acércalas a la cabeza corrigiendo la protrusión, dejando el hélix visible y el pliegue del antihélix definido, como en los ejemplos.
- No modifiques absolutamente nada más: misma persona, mismo rostro y facciones idénticas, misma expresión, mismo peinado, misma ropa, mismo fondo, misma iluminación, mismo encuadre y mismo tamaño de cabeza.
- No hagas zoom, no recortes, no reencuadres, no cambies la pose.
- Resultado fotorrealista, sin retoque de piel ni suavizado."""


def data_url(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not ok:
        raise RuntimeError("no se pudo codificar")
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def recorte_cabeza(ruta_geometria: Path, ruta_img: Path) -> np.ndarray:
    """Mismo encuadre con el que se armo el dataset, para que todo sea comparable."""
    base = leer(ruta_geometria)
    pts = puntos(base)
    caja = armar.caja_cabeza(pts, base.shape[:2])
    return armar.recortar(leer(ruta_img), caja)


def correr(modelo: str, imagenes: list[np.ndarray], prompt: str, tok: str) -> np.ndarray | None:
    cuerpo = json.dumps(
        {"input": {"prompt": prompt, "image_input": [data_url(i) for i in imagenes], "output_format": "jpg"}}
    ).encode()
    req = urllib.request.Request(
        f"{API}/models/{modelo}/predictions",
        data=cuerpo,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
    )
    try:
        d = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read()[:200].decode()}")
        return None

    while d["status"] in ("starting", "processing"):
        time.sleep(4)
        d = json.load(
            urllib.request.urlopen(
                urllib.request.Request(f"{API}/predictions/{d['id']}", headers={"Authorization": f"Bearer {tok}"}),
                timeout=60,
            )
        )
    if d["status"] != "succeeded":
        print(f"  {d['status']}: {str(d.get('error'))[:200]}")
        return None

    url = d["output"][0] if isinstance(d["output"], list) else d["output"]
    return cv2.imdecode(np.frombuffer(urllib.request.urlopen(url).read(), np.uint8), cv2.IMREAD_COLOR)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--caso", default="002", help="caso del holdout que hace de paciente")
    args = ap.parse_args()

    SALIDA.mkdir(parents=True, exist_ok=True)
    tok = (RAIZ / ".env.local").read_text().strip().split("=", 1)[1]

    paciente = leer(HOLDOUT / f"{args.caso}_antes.jpg")
    real = leer(HOLDOUT / f"{args.caso}_real.jpg")

    refs = []
    for num in REFERENCIAS:
        refs.append(recorte_cabeza(ANTES / f"{num}.jpg", ANTES / f"{num}.jpg"))
        refs.append(recorte_cabeza(ANTES / f"{num}.jpg", ALINEADOS / f"{num}.jpg"))

    pruebas = [
        ("nb_1par", "google/nano-banana", refs[:2]),
        ("nb_2pares", "google/nano-banana", refs[:4]),
        ("nbpro_2pares", "google/nano-banana-pro", refs[:4]),
    ]

    resultados = []
    for nombre, modelo, referencias in pruebas:
        n = len(referencias)
        pares = ", ".join(f"la {i * 2 + 1} es el ANTES y la {i * 2 + 2} el DESPUÉS" for i in range(n // 2))
        print(f"{nombre} ({modelo}, {n} referencias)...")
        t0 = time.time()
        g = correr(modelo, referencias + [paciente], PROMPT.format(n=n, pares=pares), tok)
        if g is None:
            continue
        print(f"  {time.time() - t0:.0f}s")
        cv2.imwrite(str(SALIDA / f"{args.caso}_{nombre}.jpg"), g, [cv2.IMWRITE_JPEG_QUALITY, 95])
        resultados.append((nombre, g))

    if not resultados:
        return 1

    alto = 400
    def escalar(i: np.ndarray) -> np.ndarray:
        return cv2.resize(i, (int(i.shape[1] * alto / i.shape[0]), alto))

    paneles = [("entrada", paciente)] + resultados + [("real", real)]
    lora = SALIDA / f"{args.caso}_lora.jpg"
    if lora.exists():
        paneles.insert(1, ("lora kontext", leer(lora)))

    tira = []
    for nombre, img in paneles:
        p = escalar(img)
        cv2.rectangle(p, (0, 0), (p.shape[1], 30), (255, 255, 255), -1)
        cv2.putText(p, nombre, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 200), 2)
        tira.append(p)
    cv2.imwrite(str(SALIDA / f"comparativa_{args.caso}.jpg"), np.hstack(tira), [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"-> {SALIDA / f'comparativa_{args.caso}.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
