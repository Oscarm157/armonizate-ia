"use client";

import { useState, useTransition } from "react";
import { SEDES, CODIGOS_SEDE } from "@/lib/sedes";
import { activarEjecutivo, agregarEjecutivo, editarEjecutivo } from "./acciones";

type Fila = { id: string; nombre: string; sedes: string[]; activo: boolean };

/** Sucursales como botones que se prenden y apagan: un ejecutivo puede tener varias. */
function ElegirSedes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sucursales">
      {CODIGOS_SEDE.map((c) => {
        const puesta = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            aria-pressed={puesta}
            onClick={() => onChange(puesta ? value.filter((x) => x !== c) : [...value, c])}
            className={`rounded-full border px-3 py-1.5 text-[13.5px] transition-colors ${
              puesta
                ? "border-[var(--crm-accent)] bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
                : "border-[var(--crm-line-strong)] bg-[var(--crm-surface)] text-[var(--crm-ink-soft)] hover:border-[var(--crm-accent)]"
            }`}
          >
            {SEDES[c].nombre}
          </button>
        );
      })}
    </div>
  );
}

export function Ejecutivos({ lista }: { lista: Fila[] }) {
  const [nombre, setNombre] = useState("");
  const [sedes, setSedes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const agregar = () =>
    iniciar(async () => {
      const r = await agregarEjecutivo(nombre, sedes);
      if ("error" in r) return setError(r.error ?? null);
      setError(null);
      setNombre("");
      setSedes([]);
    });

  return (
    <div className="space-y-6">
      <form
        className="crm-mesa space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          agregar();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="crm-eyebrow mb-1.5 block">Nombre</span>
            <input id="nuevo-nombre" className="crm-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <button type="submit" disabled={pendiente || nombre.trim().length < 2} className="crm-btn crm-btn-primary justify-center">
            Agregar
          </button>
        </div>
        <div>
          <span className="crm-eyebrow mb-1.5 block">Sucursales</span>
          <ElegirSedes value={sedes} onChange={setSedes} />
        </div>
        {error && (
          <p className="text-[13px] text-[var(--crm-danger)]" role="alert">
            {error}
          </p>
        )}
      </form>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-[var(--crm-ink-mute)]">
          Aún no hay ejecutivos. Agrega el primero para que aparezca al generar.
        </p>
      ) : (
        <ul className="crm-mesa divide-y divide-[var(--crm-line)] px-5">
          {lista.map((e) => (
            <FilaEjecutivo key={e.id} fila={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaEjecutivo({ fila }: { fila: Fila }) {
  const [nombre, setNombre] = useState(fila.nombre);
  const [sedes, setSedes] = useState(fila.sedes);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cambiado =
    nombre !== fila.nombre || sedes.length !== fila.sedes.length || sedes.some((x) => !fila.sedes.includes(x));

  const correr = (accion: () => Promise<{ error?: string }>) =>
    iniciar(async () => {
      const r = await accion();
      setError(r.error ?? null);
    });

  return (
    <li className={`space-y-3 py-4 ${fila.activo ? "" : "opacity-55"}`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <input
          id={`nombre-${fila.id}`}
          aria-label="Nombre"
          className="crm-input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button
          type="button"
          disabled={!cambiado || pendiente}
          onClick={() => correr(() => editarEjecutivo(fila.id, nombre, sedes))}
          className="crm-btn crm-btn-secondary crm-btn-sm justify-center"
        >
          Guardar
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => correr(() => activarEjecutivo(fila.id, !fila.activo))}
          className="crm-btn crm-btn-sm justify-center text-[var(--crm-ink-mute)]"
        >
          {fila.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
      <ElegirSedes value={sedes} onChange={setSedes} />
      {error && (
        <p className="text-[13px] text-[var(--crm-danger)]" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
