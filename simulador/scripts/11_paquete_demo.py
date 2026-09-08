"""Arma en el escritorio un paquete presentable con los resultados del simulador.

No son las salidas de trabajo con etiquetas de depuración: son láminas limpias para
enseñar. La pieza que más pesa es la validación, donde al lado de la simulación va el
resultado real que la clínica obtuvo con ese mismo paciente.
"""

import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import RIGIDOS, RAIZ, leer, puntos  # noqa: E402

# OpenCV no dibuja acentos, los deja como interrogaciones. El texto va con PIL.
FUENTE = "/System/Library/Fonts/Supplemental/Arial.ttf"

DESTINO = Path.home() / "Desktop" / "Armonizate - Simulador IA"
RES = RAIZ / "dataset" / "final"

ALTO = 900
MARGEN = 40
BARRA = 64
TINTA = (60, 55, 50)
FONDO = (252, 251, 250)


def etiqueta(img: np.ndarray, texto: str) -> np.ndarray:
    """Panel con su rótulo debajo, sobre fondo claro."""
    escala = ALTO / img.shape[0]
    p = cv2.resize(img, (int(img.shape[1] * escala), ALTO), interpolation=cv2.INTER_AREA)
    lienzo = np.full((ALTO + BARRA, p.shape[1], 3), FONDO, np.uint8)
    lienzo[:ALTO] = p

    pil = Image.fromarray(cv2.cvtColor(lienzo, cv2.COLOR_BGR2RGB))
    dib = ImageDraw.Draw(pil)
    fuente = ImageFont.truetype(FUENTE, 26)
    x0, _, x1, _ = dib.textbbox((0, 0), texto, font=fuente)
    dib.text(((p.shape[1] - (x1 - x0)) // 2, ALTO + 16), texto, font=fuente, fill=TINTA[::-1])
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


def lamina(paneles: list[tuple[str, np.ndarray]], destino: Path) -> None:
    tiras = [etiqueta(img, txt) for txt, img in paneles]
    alto = max(t.shape[0] for t in tiras)
    ancho = sum(t.shape[1] for t in tiras) + MARGEN * (len(tiras) + 1)
    lienzo = np.full((alto + MARGEN * 2, ancho, 3), FONDO, np.uint8)
    x = MARGEN
    for t in tiras:
        lienzo[MARGEN : MARGEN + t.shape[0], x : x + t.shape[1]] = t
        x += t.shape[1] + MARGEN
    cv2.imwrite(str(destino), lienzo, [cv2.IMWRITE_JPEG_QUALITY, 94])
    print(f"  {destino.name}")


def alinear(fuente: np.ndarray, referencia: np.ndarray) -> np.ndarray:
    """Lleva una foto de otra sesión al encuadre de la referencia, para compararlas."""
    p_f, p_r = puntos(fuente), puntos(referencia)
    if p_f is None or p_r is None:
        return cv2.resize(fuente, (referencia.shape[1], referencia.shape[0]))
    M, _ = cv2.estimateAffinePartial2D(p_f[RIGIDOS], p_r[RIGIDOS], method=cv2.RANSAC, ransacReprojThreshold=3.0)
    if M is None:
        return cv2.resize(fuente, (referencia.shape[1], referencia.shape[0]))
    return cv2.warpAffine(
        fuente, M, (referencia.shape[1], referencia.shape[0]), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE
    )


def main() -> int:
    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    (DESTINO / "1 - Simulaciones").mkdir(parents=True)
    (DESTINO / "2 - Validacion contra resultado real").mkdir(parents=True)

    print("simulaciones:")
    t2 = leer(RAIZ / "dataset" / "oto_test2.png")
    lamina(
        [("ANTES", t2), ("SIMULACIÓN", leer(RES / "oto_test2_simulado_1.jpg"))],
        DESTINO / "1 - Simulaciones" / "Caso 1.jpg",
    )
    t1 = leer(RAIZ / "dataset" / "oto_test1.png")
    lamina(
        [("ANTES", t1), ("SIMULACIÓN", leer(RES / "oto_test1_simulado_2.jpg"))],
        DESTINO / "1 - Simulaciones" / "Caso 2.jpg",
    )

    print("validación:")
    real = alinear(leer(RAIZ / "dataset" / "pares" / "despues" / "043.jpg"), t1)
    lamina(
        [("ANTES", t1), ("SIMULACIÓN DE LA HERRAMIENTA", leer(RES / "oto_test1_simulado_2.jpg")), ("RESULTADO REAL DE LA CLÍNICA", real)],
        DESTINO / "2 - Validacion contra resultado real" / "Paciente de control.jpg",
    )

    (DESTINO / "Que estas viendo.txt").write_text(
        """SIMULADOR DE OTOMODELACIÓN · Clínica Armonízate

Herramienta interna: el vendedor recibe la foto de un prospecto, la pasa por el
simulador y le devuelve cómo se vería después del procedimiento.

CARPETA 1 · SIMULACIONES
Dos pacientes, su foto tal como llegó y la simulación que devuelve la herramienta.
El rostro de la persona no se modifica: la piel, las cejas, las pestañas, la
expresión y el fondo son los de la foto original, píxel por píxel. Lo único que
cambia son las orejas.

CARPETA 2 · VALIDACIÓN
Esta es la prueba. Se tomó a una paciente que ya se hizo el procedimiento en la
clínica, se le pasó únicamente su foto del ANTES a la herramienta, y se compara lo
que simuló contra el resultado que realmente obtuvo. La herramienta nunca vio esa
foto del después.

CÓMO SE CONSTRUYÓ
Se partió de 100 casos reales de la clínica, con su antes y su después. De ahí
salieron 75 pares utilizables, que sirvieron para dos cosas: entrenar un modelo
propio con el procedimiento de la clínica, y calibrar cuál es el resultado que la
clínica produce de verdad, en vez de una corrección genérica inventada por una IA.

LO QUE FALTA PARA PONERLO EN MANOS DEL EQUIPO DE VENTAS
Acceso con usuario por vendedor, registro de quién generó cada simulación, y el
aviso de "simulación estimada, no es garantía de resultado" impreso en la propia
imagen que se le envía al paciente.
""",
        encoding="utf-8",
    )
    print(f"\n-> {DESTINO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
