# Simulador de otomodelación · Clínica Armonízate

Herramienta interna de ventas: el vendedor recibe la foto de un prospecto, la pasa por
el simulador y le devuelve cómo se vería después del procedimiento.

## Cómo se usa

```bash
.venv/bin/python scripts/10_simular.py foto_del_prospecto.jpg carpeta_de_salida
```

Devuelve tres intentos en el encuadre original de la foto, porque la intensidad varía
entre corridas y conviene elegir. Cada uno tarda unos 12 segundos.

## El método, y por qué

Son tres piezas y ninguna sobra:

**1. La foto se recorta a la cabeza antes de mandarla.** Con la oreja ocupando pocos
píxeles el modelo no tiene con qué trabajar y la corrección sale tímida. El recorte es
interno: el resultado se entrega en el encuadre original completo.

**2. Se manda una sola imagen a nano-banana 2, sin ejemplos.** Se probó darle pares
antes/después reales de la clínica como referencia visual y el resultado **empeoró**:
cada imagen extra compite por la atención del modelo, que además tiene que deducir
cuál de todas debe editar.

**3. De la salida se toma solo la zona de las orejas y se compone sobre la foto
original.** Sin este paso el modelo entrega al paciente con la piel suavizada, las
cejas redibujadas y los ojos más abiertos, que en una herramienta médica no se puede
entregar. Con este paso el rostro es el del paciente píxel por píxel: la diferencia
fuera de la zona de las orejas es de 0.02 sobre 255.

### El prompt

Pedir "hélix visible" o "conserva el tamaño de la oreja" **frena** la corrección: son
instrucciones que pelean contra el efecto buscado. El prompt que funciona pide el
objetivo en negativo (que no se vean las orejas) más un criterio geométrico que el
modelo puede verificar solo: el ancho de la cabeza a la altura de las orejas tiene que
quedar marcado por el cráneo, no por las orejas.

### Modelo

nano-banana 2 contra pro y 2-lite, con el mismo prompt: deja el contorno más limpio, es
el que menos toca el rostro y tarda 12 segundos contra 40 de pro. No se puede entrenar,
es API cerrada.

## Para qué sirvieron los 100 casos

Aunque no entran en cada llamada, son la base de todo:

- **Calibraron el objetivo.** El demo anterior pedía "aplanar las orejas al máximo" y
  prometía un resultado que la clínica no da. Viendo los 100 casos se sabe qué produce
  el procedimiento de verdad, y de ahí sale lo que exige el prompt.
- **Son el banco de pruebas.** 15 casos quedaron apartados sin entrar a ningún
  entrenamiento, así que se puede comparar lo que simula la herramienta contra el
  resultado real de esa misma persona.
- **Entrenaron un LoRA propio** (`oscarm157/otomodelacion-kontext`, privado). Funciona,
  pero su modelo base, Flux Kontext dev, no da el nivel para uso comercial. Queda como
  ruta abierta si algún día se quiere un modelo propio sobre una base mejor.

## El dataset

Los casos vienen como una sola imagen con dos paneles, antes y después. Entre los dos
cambia el peinado, a veces la ropa, la expresión y la luz. Por eso el par de
entrenamiento no es el panel "después" tal cual: se alinea sobre el "antes" por
landmarks faciales y se compone de vuelta solo la banda de las orejas, así que dentro
de cada par lo único distinto es la oreja.

```
.venv/bin/python scripts/01_cortar_paneles.py    # 100 imagenes -> antes/ y despues/
.venv/bin/python scripts/02_componer.py          # alinea y compone el target
.venv/bin/python scripts/03_hojas_revision.py    # hojas para revisar a ojo
.venv/bin/python scripts/04_aprobar.py           # filtra los pares que no sirven
.venv/bin/python scripts/05_armar_zip.py         # dataset.zip + holdout apartado
.venv/bin/python scripts/06_evaluar.py           # mide el LoRA contra el holdout
.venv/bin/python scripts/11_paquete_demo.py      # laminas para presentar
```

De los 100 archivos de origen quedaron 75 aprobados, y **10 de los descartes eran fotos
duplicadas**: el material real son 90 casos, no 100. El resto se cayó por alineación,
por cambio de pose entre las dos tomas y por pelo suelto tapando la oreja.

## Sobre el procedimiento

La otomodelación no corta: se pasa un hilo por detrás de la oreja y se tensa, jalando
hacia atrás lo que sobresale hasta dejarlo sujeto contra el cráneo. Por eso el
resultado no se ve relajado ni ligeramente separado, y por eso una simulación tímida se
lee como falsa.

## Falta para producción

- Acceso con usuario por vendedor y registro de quién generó cada simulación.
- El aviso "simulación estimada, no es garantía de resultado" impreso en la propia
  imagen, no en la página, porque la imagen es lo que se reenvía por WhatsApp.
- Tope de generaciones por vendedor.

## Datos de pacientes

Son datos biométricos y la clínica tiene el consentimiento firmado. `dataset/` está en
`.gitignore` y no se commitea nunca.
