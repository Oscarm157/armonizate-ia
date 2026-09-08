"""Landmarks faciales compartidos por los scripts del dataset."""

from pathlib import Path

import cv2
import numpy as np
from mediapipe import Image, ImageFormat
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

RAIZ = Path(__file__).resolve().parent.parent
MODELO = RAIZ / "modelos" / "face_landmarker.task"

# Puntos que no cambian con el procedimiento ni con la expresion: ojos, nariz y
# entrecejo. Nada de boca (expresion) ni de ovalo lateral (es lo que se compone).
RIGIDOS = [33, 133, 362, 263, 1, 4, 6, 168, 8, 9, 197, 195]

LATERAL_IZQ, LATERAL_DER = 234, 454  # borde lateral de la cara
CEJA_IZQ, CEJA_DER = 46, 276  # extremo externo de cada ceja
FRENTE, MENTON = 10, 152
NARIZ_BASE = 2

_landmarker: FaceLandmarker | None = None


def landmarker() -> FaceLandmarker:
    global _landmarker
    if _landmarker is None:
        _landmarker = FaceLandmarker.create_from_options(
            FaceLandmarkerOptions(
                # CPU explicito: el delegate por defecto usa Metal y truena en macOS ARM
                base_options=BaseOptions(
                    model_asset_path=str(MODELO), delegate=BaseOptions.Delegate.CPU
                ),
                running_mode=RunningMode.IMAGE,
                num_faces=1,
            )
        )
    return _landmarker


def puntos(bgr: np.ndarray) -> np.ndarray | None:
    """Landmarks en pixeles (N,2), o None si no hay cara."""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    res = landmarker().detect(Image(image_format=ImageFormat.SRGB, data=rgb))
    if not res.face_landmarks:
        return None
    alto, ancho = bgr.shape[:2]
    return np.array([[p.x * ancho, p.y * alto] for p in res.face_landmarks[0]], dtype=np.float32)


def yaw(pts: np.ndarray) -> float:
    """Giro horizontal: 0.5 es frontal. Nariz respecto a los bordes de la cara."""
    izq, der = pts[LATERAL_IZQ, 0], pts[LATERAL_DER, 0]
    return float((pts[1, 0] - izq) / (der - izq)) if abs(der - izq) > 1e-3 else 0.5


def leer(ruta: Path) -> np.ndarray:
    img = cv2.imread(str(ruta))
    if img is None:
        raise FileNotFoundError(ruta)
    return img
