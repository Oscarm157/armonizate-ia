"""Pipeline de simulación: foto de un prospecto -> foto con la otomodelación aplicada.

Es el método que quedó después de probar bastantes rutas, y son tres piezas:

1. La foto se recorta a la cabeza antes de mandarla. Con la oreja ocupando pocos
   píxeles el modelo no tiene con qué trabajar y la corrección sale tímida. El recorte
   es interno: el resultado se entrega en el encuadre original completo.

2. Se manda UNA sola imagen, sin ejemplos de referencia. Se probó darle pares reales
   de la clínica como referencia visual y el resultado empeoró: cada imagen extra
   compite por la atención del modelo, que además tiene que deducir cuál editar. Con
   una imagen y una orden clara obedece mucho mejor.

   Los 100 casos no se desperdician: sirvieron para calibrar cuál es el resultado que
   la clínica produce de verdad, y de ahí sale el objetivo que pide el prompt.

3. De lo que devuelve el modelo se toma SOLO la zona de las orejas y se compone sobre
   la foto original. Sin este paso entrega al paciente con la piel suavizada, las
   cejas redibujadas y los ojos más abiertos, que en una herramienta médica no se
   puede entregar. Con este paso el rostro es el del paciente, píxel por píxel.

La intensidad varía entre corridas, así que se generan varios intentos y se elige.
"""

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module  # noqa: E402

from comun import RAIZ, leer, puntos  # noqa: E402

_armar = import_module("05_armar_zip")
_comp = import_module("09_componer_salida")
_banda = import_module("02_componer")

API = "https://api.replicate.com/v1"
# Se compararon pro, 2 y 2-lite con el mismo prompt: el 2 deja el contorno más
# limpio, es el que menos toca el rostro y tarda 12 s contra 40 s de pro.
MODELO = "google/nano-banana-2"

# Pedir "hélix visible" o "conserva el tamaño de la oreja" frena la corrección: son
# instrucciones que pelean contra el efecto. El objetivo va en negativo y con un
# criterio geométrico que el modelo puede verificar solo.
PROMPT = """Esta persona tiene las orejas muy separadas de la cabeza. Aplícale una otoplastia.

RESULTADO EXIGIDO: en esta vista frontal NO se ven las orejas. Cero. Todo lo que hoy sobresale queda detrás del contorno de la cabeza.

Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En la foto original ese ancho lo marcan las orejas abiertas. En tu resultado ese ancho debe reducirse de forma notable y quedar marcado por el cráneo, no por las orejas. El contorno de la cabeza tiene que ser una curva continua de la sien a la mandíbula, sin nada sobresaliendo a los lados.

Si al terminar todavía se distingue el borde de una oreja por fuera de esa curva, está mal: métela más.

Todo lo demás queda exactamente igual: mismo rostro y facciones, misma piel con su textura, mismas cejas, misma expresión, mismo peinado, misma diadema, misma ropa, mismo fondo, misma iluminación, mismo encuadre, mismo tamaño de cabeza. No retoques la piel, no suavices, no embellezcas, no hagas zoom, no reencuadres."""


def data_url(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 96])
    if not ok:
        raise RuntimeError("no se pudo codificar la imagen")
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def generar(imagen: np.ndarray, tok: str) -> np.ndarray | None:
    cuerpo = json.dumps(
        {
            "input": {
                "prompt": PROMPT,
                "image_input": [data_url(imagen)],
                "output_format": "jpg",
                # A 1K, que es el default, la salida se ve borrosa al componerla sobre
                # la foto original, que suele ser más grande.
                "resolution": "2K",
            }
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/models/{MODELO}/predictions",
        data=cuerpo,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
    )
    try:
        d = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read()[:200].decode()}")
        return None

    while d["status"] in ("starting", "processing"):
        time.sleep(5)
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
    ap.add_argument("foto", help="foto del prospecto")
    ap.add_argument("salida", help="carpeta donde dejar los resultados")
    ap.add_argument("--intentos", type=int, default=3)
    args = ap.parse_args()

    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    tok = (RAIZ / ".env.local").read_text().strip().split("=", 1)[1]

    original = leer(Path(args.foto))
    pts = puntos(original)
    if pts is None:
        print("no se detectó una cara de frente en la foto")
        return 1

    x, y, w, h = _armar.caja_cabeza(pts, original.shape[:2])
    cabeza = cv2.resize(original[y : y + h, x : x + w], (1024, 1024), interpolation=cv2.INTER_LANCZOS4)
    fuera = _banda.banda(pts, original.shape[:2]) <= 0.5

    for k in range(1, args.intentos + 1):
        print(f"intento {k}...")
        g = generar(cabeza, tok)
        if g is None:
            continue
        final = _comp.componer(original, g)
        if final is None:
            print("  no se pudo componer sobre la original")
            continue
        destino = salida / f"{Path(args.foto).stem}_simulado_{k}.jpg"
        cv2.imwrite(str(destino), final, [cv2.IMWRITE_JPEG_QUALITY, 95])
        d = cv2.absdiff(original, final).mean(axis=2)
        print(f"  {destino}  {final.shape[1]}x{final.shape[0]}  rostro sin tocar: {d[fuera].mean():.3f} sobre 255")
        if k < args.intentos:
            time.sleep(11)  # límite de peticiones por minuto de Replicate
    return 0


if __name__ == "__main__":
    sys.exit(main())
