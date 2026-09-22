// Llamada a un modelo de Replicate: crea la predicción y espera a que termine.
// La usan el generador de la simulación y el clasificador de grado.

const API = "https://api.replicate.com/v1";

type Prediccion = {
  id: string;
  status: string;
  output?: unknown;
  error?: unknown;
};

type Resultado = Promise<{ output: unknown } | { error: "http" | "fallo" }>;

/** Modelo oficial, por nombre (siempre su versión más reciente). */
export function correr(modelo: string, input: Record<string, unknown>, token: string, etiqueta: string): Resultado {
  return esperar(`${API}/models/${modelo}/predictions`, { input }, token, etiqueta);
}

async function esperar(url: string, cuerpo: object, token: string, etiqueta: string): Resultado {
  // Con poco saldo Replicate limita a una petición a la vez (429 con retry_after): la
  // medición del grado y la generación salen casi juntas, así que se reintenta.
  let crear!: Response;
  for (let intento = 0; intento < 4; intento++) {
    crear = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (crear.status !== 429) break;
    const espera = Number((await crear.clone().json().catch(() => null))?.retry_after) || 5;
    await new Promise((r) => setTimeout(r, Math.min(espera, 10) * 1000 + 500));
  }

  if (!crear.ok) {
    const detalle = (await crear.text()).slice(0, 300);
    console.error(JSON.stringify({ evento: `${etiqueta}_http`, status: crear.status, detalle }));
    return { error: "http" };
  }

  let pred: Prediccion = await crear.json();
  for (let i = 0; i < 60 && (pred.status === "starting" || pred.status === "processing"); i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`${API}/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!poll.ok) break;
    pred = await poll.json();
  }

  if (pred.status !== "succeeded") {
    console.error(JSON.stringify({ evento: `${etiqueta}_fallo`, status: pred.status, error: String(pred.error).slice(0, 200) }));
    return { error: "fallo" };
  }
  return { output: pred.output };
}
