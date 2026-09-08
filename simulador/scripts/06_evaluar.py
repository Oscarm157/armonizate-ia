"""Mide el LoRA contra los 15 casos que no vio.

Cada caso del holdout tiene la foto de entrada y el resultado real de la clinica. El
modelo genera su version de la misma entrada y se compara contra ese resultado real.

Dos numeros por caso:
  err_oreja  cuanto se aleja lo generado del resultado real, dentro de la zona de las
             orejas. Al lado va el mismo numero para la entrada sin tocar, que es la
             linea base: no hacer nada. Si el modelo no baja de ahi, no sirve.
  colateral  cuanto cambio fuera de esa zona, o sea cuanto le movio a la cara.
"""

import argparse
import json
import os
import sys
import time
from base64 import b64encode
from pathlib import Path

import cv2
import numpy as np
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module  # noqa: E402

from comun import RAIZ, leer, puntos  # noqa: E402

banda = import_module("02_componer").banda  # la misma zona con la que se armo el dataset

HOLDOUT = RAIZ / "dataset" / "holdout"
RESULTADOS = RAIZ / "dataset" / "resultados"
API = "https://api.replicate.com/v1"

# Los pesos entrenados corren sobre el modelo publico de Kontext, no sobre el modelo
# privado: el privado tiene que aprovisionar una GPU dedicada cada vez y se queda
# minutos en cola, mientras que el publico esta siempre caliente y responde en segundos.
MODELO = "black-forest-labs/flux-kontext-dev-lora"
PESOS = "https://replicate.delivery/yhqm/eebuQd50KEteJoxDpeUaoEefrL6dCfgDhYAfCh0AUl33p5SLXA/flux-lora.tar"

INSTRUCCION = (
    "Acerca las orejas a la cabeza corrigiendo la protrusion, dejando el helix visible "
    "y el pliegue del antihelix definido. No cambies nada mas de la imagen: misma "
    "persona, mismo encuadre, mismo peinado, misma ropa, misma expresion, mismo fondo."
)


def token() -> str:
    t = os.environ.get("REPLICATE_API_TOKEN")
    if not t:
        t = (RAIZ / ".env.local").read_text().strip().split("=", 1)[1]
    return t


def generar(pesos: str, ruta: Path, tok: str) -> np.ndarray | None:
    data = "data:image/jpeg;base64," + b64encode(ruta.read_bytes()).decode()
    cab = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    cuerpo = {
        "input": {
            "input_image": data,
            "prompt": INSTRUCCION,
            "lora_weights": pesos,
            "output_format": "jpg",
            "aspect_ratio": "match_input_image",
        }
    }

    # Con menos de 5 USD de credito Replicate limita a 6 por minuto con rafaga de 1.
    for intento in range(6):
        r = requests.post(f"{API}/models/{MODELO}/predictions", headers=cab, json=cuerpo, timeout=300)
        if r.ok:
            break
        if r.status_code == 429:
            time.sleep(15)
            continue
        print(f"  HTTP {r.status_code}: {r.text[:200]}")
        return None
    else:
        print("  throttled sin recuperarse")
        return None

    # El arranque en frio de la GPU (descargar y cargar los pesos de Flux) tarda
    # varios minutos la primera vez; despues queda caliente y responde en segundos.
    pred = r.json()
    for _ in range(240):
        if pred.get("status") in ("succeeded", "failed", "canceled"):
            break
        time.sleep(5)
        pred = requests.get(pred["urls"]["get"], headers=cab, timeout=60).json()

    if pred.get("status") != "succeeded":
        print(f"  {pred.get('status')}: {str(pred.get('error'))[:200]}")
        return None

    salida = pred["output"]
    url = salida[0] if isinstance(salida, list) else salida
    img = requests.get(url, timeout=120).content
    return cv2.imdecode(np.frombuffer(img, np.uint8), cv2.IMREAD_COLOR)


def comparar(entrada: np.ndarray, generado: np.ndarray, real: np.ndarray) -> dict | None:
    pts = puntos(entrada)
    if pts is None:
        return None
    alto, ancho = entrada.shape[:2]
    gen = cv2.resize(generado, (ancho, alto))
    m = banda(pts, (alto, ancho)) > 0.5
    fuera = ~m

    def err(a: np.ndarray, b: np.ndarray, zona: np.ndarray) -> float:
        d = cv2.absdiff(a, b).mean(axis=2)
        return float(d[zona].mean())

    return {
        "err_oreja": round(err(gen, real, m), 2),
        "err_oreja_sin_hacer_nada": round(err(entrada, real, m), 2),
        "colateral": round(err(gen, entrada, fuera), 2),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pesos", default=PESOS)
    args = ap.parse_args()

    RESULTADOS.mkdir(parents=True, exist_ok=True)
    tok = token()
    casos = sorted(p.stem.replace("_antes", "") for p in HOLDOUT.glob("*_antes.jpg"))

    filas, medidas = [], []
    for num in casos:
        entrada = leer(HOLDOUT / f"{num}_antes.jpg")
        real = leer(HOLDOUT / f"{num}_real.jpg")

        destino = RESULTADOS / f"{num}_lora.jpg"
        if destino.exists():
            generado = leer(destino)
        else:
            print(f"{num}: generando...")
            generado = generar(args.pesos, HOLDOUT / f"{num}_antes.jpg", tok)
            time.sleep(11)  # respeta el limite de 6 por minuto
            if generado is None:
                continue
            cv2.imwrite(str(destino), generado, [cv2.IMWRITE_JPEG_QUALITY, 95])

        m = comparar(entrada, generado, real)
        if m is None:
            continue
        m["caso"] = num
        medidas.append(m)
        print(f"{num}  err_oreja={m['err_oreja']:6.2f}  (sin hacer nada {m['err_oreja_sin_hacer_nada']:6.2f})  colateral={m['colateral']:6.2f}")

        alto = 380
        tira = [cv2.resize(i, (int(i.shape[1] * alto / i.shape[0]), alto)) for i in (entrada, cv2.resize(generado, (entrada.shape[1], entrada.shape[0])), real)]
        fila = np.hstack(tira)
        cv2.putText(fila, f"{num}   entrada | generado | real", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        filas.append(fila)

    if not medidas:
        print("sin resultados")
        return 1

    (RESULTADOS / "medidas.json").write_text(json.dumps(medidas, indent=2))
    mejora = [m for m in medidas if m["err_oreja"] < m["err_oreja_sin_hacer_nada"]]
    print(f"\nmejora sobre no hacer nada: {len(mejora)}/{len(medidas)} casos")
    for campo in ("err_oreja", "err_oreja_sin_hacer_nada", "colateral"):
        v = np.array([m[campo] for m in medidas])
        print(f"  {campo:26} mediana={np.median(v):6.2f}")

    w = max(f.shape[1] for f in filas)
    hoja = np.vstack([cv2.copyMakeBorder(f, 0, 4, 0, w - f.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for f in filas])
    cv2.imwrite(str(RESULTADOS / "comparativa.jpg"), hoja, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f"  -> {RESULTADOS / 'comparativa.jpg'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
