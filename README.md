# Armonízate · IA

Dos piezas del mismo trabajo para Clínica Armonízate.

## `/portal`

La herramienta que usan los vendedores. Entran con su cuenta, suben la foto de un
prospecto y reciben la simulación de cómo se vería después de la otomodelación, lista
para mandársela por WhatsApp.

Next 16, Neon, Vercel Blob privado. Tope de 100 simulaciones al mes por vendedor,
contado en la base y verificado antes de llamar al modelo.

## `/simulador`

Cómo se llegó al método: el trabajo sobre los 100 casos reales de la clínica, el
pipeline de Python con el que se calibró, y el entrenamiento de un modelo propio.

De los 100 archivos de origen quedaron 75 pares utilizables; **10 de los descartes eran
fotos duplicadas**, así que el material real son 90 casos. Quince se apartaron sin
entrar a ningún entrenamiento, para poder comparar lo que simula la herramienta contra
el resultado real de esa misma persona.

## El método, en corto

Tres piezas, y ninguna sobra:

1. **Recortar a la cabeza** antes de mandar la foto. Con la oreja ocupando pocos
   píxeles la corrección sale tímida.
2. **Una sola imagen al modelo, sin ejemplos.** Se probó darle pares antes/después
   reales como referencia visual y el resultado empeoró: cada imagen extra compite por
   la atención y el modelo tiene que deducir cuál editar.
3. **Componer solo la zona de las orejas** sobre la foto original. Sin esto el modelo
   devuelve al paciente con la piel suavizada y las cejas redibujadas, que en una
   herramienta médica no se puede entregar.

Los 100 casos no viajan en cada llamada, pero son la base de todo: calibraron cuál es
el resultado que la clínica produce de verdad, en lugar de una corrección genérica.

## Datos de pacientes

Las fotos son datos biométricos y la clínica tiene el consentimiento firmado. **Ninguna
se commitea**: `dataset/` está fuera de git y en producción viven en un store privado
que solo se lee tras validar sesión.
