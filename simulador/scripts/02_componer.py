"""Construye el target de entrenamiento: el "antes" con las orejas del "despues".

Entre el antes y el despues de la clinica cambia el peinado, la ropa, la expresion y
la luz. Entrenado asi, el modelo aprenderia todo eso junto con las orejas. Aqui se
alinea el despues sobre el antes por landmarks rigidos y se compone de vuelta solo la
banda lateral de la cabeza, de modo que lo unico distinto entre par y par es la oreja.

Guarda tambien las señales que ordenan la revision manual (04).
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import (  # noqa: E402
    CEJA_DER,
    CEJA_IZQ,
    FRENTE,
    LATERAL_DER,
    LATERAL_IZQ,
    MENTON,
    NARIZ_BASE,
    RAIZ,
    RIGIDOS,
    leer,
    puntos,
    yaw,
)

ANTES = RAIZ / "dataset" / "pares" / "antes"
DESPUES = RAIZ / "dataset" / "pares" / "despues"
SALIDA = RAIZ / "dataset" / "alineados"
SEÑALES = RAIZ / "dataset" / "señales.json"

# La banda que se compone, en fracciones del ancho y alto de la cara.
FUERA = 0.44  # cuanto se extiende hacia afuera del borde de la cara (cubre la oreja separada)
DENTRO = 0.14  # cuanto entra hacia la cara (cubre la raiz de la oreja)
ARRIBA = 0.09  # por encima de la ceja
ABAJO = 0.05  # por debajo de la base de la nariz (lobulo); mas abajo invade la barba


def banda(pts: np.ndarray, forma: tuple[int, int]) -> np.ndarray:
    """Mascara suave de las dos orejas, derivada de la geometria de la cara.

    Elipses, no rectangulos: el borde recto de un rectangulo deja una costura
    visible en el fondo cuando la iluminacion de las dos tomas no coincide.
    """
    alto, ancho = forma
    x_izq, x_der = pts[LATERAL_IZQ, 0], pts[LATERAL_DER, 0]
    w_cara = abs(x_der - x_izq)
    h_cara = abs(pts[MENTON, 1] - pts[FRENTE, 1])

    y0 = min(pts[CEJA_IZQ, 1], pts[CEJA_DER, 1]) - ARRIBA * h_cara
    y1 = pts[NARIZ_BASE, 1] + ABAJO * h_cara

    m = np.zeros((alto, ancho), np.float32)
    for x_borde, signo in ((x_izq, -1), (x_der, +1)):
        centro = (int(x_borde + signo * (FUERA - DENTRO) / 2 * w_cara), int((y0 + y1) / 2))
        ejes = (int((FUERA + DENTRO) / 2 * w_cara), int((y1 - y0) / 2))
        cv2.ellipse(m, centro, ejes, 0, 0, 360, 1.0, -1)
    radio = max(5, int(0.10 * w_cara) | 1)
    return cv2.GaussianBlur(m, (radio, radio), 0)


def igualar_exposicion(warp: np.ndarray, antes: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Lleva el warp a la exposicion del antes usando la cara central como referencia.

    Es la zona que las dos tomas comparten sin cambios, asi que sirve de patron; sin
    esto la banda compuesta entra con otro brillo y se nota el parche.
    """
    alto, ancho = antes.shape[:2]
    x0 = int(pts[LATERAL_IZQ, 0] + 0.20 * (pts[LATERAL_DER, 0] - pts[LATERAL_IZQ, 0]))
    x1 = int(pts[LATERAL_DER, 0] - 0.20 * (pts[LATERAL_DER, 0] - pts[LATERAL_IZQ, 0]))
    y0 = int(max(0, pts[FRENTE, 1]))
    y1 = int(min(alto, pts[NARIZ_BASE, 1]))
    if x1 - x0 < 20 or y1 - y0 < 20:
        return warp

    ref_a = antes[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
    ref_w = warp[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
    mu_a, sd_a = ref_a.mean(0), ref_a.std(0) + 1e-3
    mu_w, sd_w = ref_w.mean(0), ref_w.std(0) + 1e-3
    ganancia = np.clip(sd_a / sd_w, 0.7, 1.4)
    return np.clip((warp.astype(np.float32) - mu_w) * ganancia + mu_a, 0, 255).astype(np.uint8)


def procesar(num: str) -> dict:
    antes = leer(ANTES / f"{num}.jpg")
    despues = leer(DESPUES / f"{num}.jpg")

    p_antes = puntos(antes)
    p_despues = puntos(despues)
    if p_antes is None or p_despues is None:
        falta = "antes" if p_antes is None else "despues"
        return {"caso": num, "ok": False, "motivo": f"sin cara en {falta}"}

    # Similitud (escala + rotacion + traslacion) que lleva el despues al antes.
    M, _ = cv2.estimateAffinePartial2D(
        p_despues[RIGIDOS], p_antes[RIGIDOS], method=cv2.RANSAC, ransacReprojThreshold=3.0
    )
    if M is None:
        return {"caso": num, "ok": False, "motivo": "sin transformada"}

    alto, ancho = antes.shape[:2]
    warp = cv2.warpAffine(despues, M, (ancho, alto), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

    # Error residual de los puntos rigidos: cuanto no explica una similitud 2D
    proy = cv2.transform(p_despues[RIGIDOS].reshape(-1, 1, 2), M).reshape(-1, 2)
    residual = float(np.median(np.linalg.norm(proy - p_antes[RIGIDOS], axis=1)))
    d_ojos = float(np.linalg.norm(p_antes[133] - p_antes[362]))
    residual_rel = residual / d_ojos if d_ojos > 1 else 9.9

    warp = igualar_exposicion(warp, antes, p_antes)
    m = banda(p_antes, (alto, ancho))
    m3 = cv2.merge([m, m, m])
    target = (antes * (1 - m3) + warp * m3).astype(np.uint8)

    dentro = m > 0.5

    # Pelo nuevo tapando la oreja: el despues trae mucho mas oscuro dentro de la banda
    def oscuro(img: np.ndarray) -> float:
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return float((g[dentro] < 90).mean()) if dentro.any() else 0.0

    # Cuanto cambio de verdad la zona de las orejas. Si es casi cero el par no ensena
    # el procedimiento, sea porque el pelo lo tapa o porque la correccion fue minima.
    d = cv2.absdiff(antes, target).max(axis=2)
    d_banda = float((d[dentro] > 25).mean()) if dentro.any() else 0.0

    cv2.imwrite(str(SALIDA / f"{num}.jpg"), target, [cv2.IMWRITE_JPEG_QUALITY, 95])

    return {
        "caso": num,
        "ok": True,
        "residual_rel": round(residual_rel, 4),
        "d_yaw": round(abs(yaw(p_antes) - yaw(p_despues)), 4),
        "d_oscuro": round(oscuro(warp) - oscuro(antes), 4),
        "d_banda": round(d_banda, 4),
        "escala": round(float(np.hypot(M[0, 0], M[0, 1])), 4),
    }


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    casos = sorted(p.stem for p in ANTES.glob("*.jpg"))
    señales = [procesar(n) for n in casos]
    SEÑALES.write_text(json.dumps(señales, indent=2, ensure_ascii=False))

    ok = [s for s in señales if s["ok"]]
    print(f"compuestos: {len(ok)}/{len(casos)}")
    for s in señales:
        if not s["ok"]:
            print(f"  {s['caso']}: {s['motivo']}")
    if ok:
        for campo in ("residual_rel", "d_yaw", "d_oscuro", "d_banda"):
            v = np.array([s[campo] for s in ok])
            print(f"  {campo:14} mediana={np.median(v):.3f}  p90={np.percentile(v, 90):.3f}  max={v.max():.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
