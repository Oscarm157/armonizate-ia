// Llamada a un modelo de Replicate: crea la predicción y espera a que termine.
// La usan el generador de la simulación y el clasificador de grado.

const API = "https://api.replicate.com/v1";

type Prediccion = {
  id: string;
  status: string;
  output?: unknown;
  error?: unknown;
};

export async function correr(
  modelo: string,
  input: Record<string, unknown>,
  token: string,
  etiqueta: string
): Promise<{ output: unknown } | { error: "http" | "fallo" }> {
  const crear = await fetch(`${API}/models/${modelo}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

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
