// Llamadas a modelos oficiales de Replicate. `correr` crea la predicción y espera a que
// termine (la generación, que tiene 300 s de margen). `crear` + `leer` son para lo que
// no puede bloquear una ruta: la espera en la fila de Replicate no está garantizada y
// se vieron casi 60 s antes de empezar una predicción de 2 s.

const API = "https://api.replicate.com/v1";

export type Prediccion = {
  id: string;
  status: string;
  model?: string;
  output?: unknown;
  error?: unknown;
};

/** Crea la predicción y devuelve su estado inicial, o null si Replicate no respondió. */
export async function crear(
  modelo: string,
  input: Record<string, unknown>,
  token: string,
  etiqueta: string
): Promise<Prediccion | null> {
  // Con poco saldo Replicate limita a una petición a la vez (429 con retry_after): la
  // medición del grado y la generación salen casi juntas, así que se reintenta.
  let res!: Response;
  for (let intento = 0; intento < 4; intento++) {
    res = await fetch(`${API}/models/${modelo}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (res.status !== 429) break;
    const espera = Number((await res.clone().json().catch(() => null))?.retry_after) || 5;
    await new Promise((r) => setTimeout(r, Math.min(espera, 10) * 1000 + 500));
  }

  if (!res.ok) {
    const detalle = (await res.text()).slice(0, 300);
    console.error(JSON.stringify({ evento: `${etiqueta}_http`, status: res.status, detalle }));
    return null;
  }
  return res.json();
}

export async function leer(id: string, token: string): Promise<Prediccion | null> {
  const res = await fetch(`${API}/predictions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
}

const enCurso = (p: Prediccion) => p.status === "starting" || p.status === "processing";

/** Crea la predicción y espera hasta ~3 minutos a que termine. */
export async function correr(
  modelo: string,
  input: Record<string, unknown>,
  token: string,
  etiqueta: string
): Promise<{ output: unknown } | { error: "http" | "fallo" }> {
  let pred = await crear(modelo, input, token, etiqueta);
  if (!pred) return { error: "http" };

  for (let i = 0; i < 60 && enCurso(pred); i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const siguiente = await leer(pred.id, token);
    if (!siguiente) break;
    pred = siguiente;
  }

  if (pred.status !== "succeeded") {
    console.error(JSON.stringify({ evento: `${etiqueta}_fallo`, status: pred.status, error: String(pred.error).slice(0, 200) }));
    return { error: "fallo" };
  }
  return { output: pred.output };
}
