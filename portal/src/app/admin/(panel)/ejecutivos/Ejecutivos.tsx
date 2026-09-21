"use client";

import { useState, useTransition } from "react";
import { SEDES, CODIGOS_SEDE } from "@/lib/sedes";
import { activarEjecutivo, agregarEjecutivo, editarEjecutivo } from "./acciones";

type Fila = { id: string; nombre: string; sede: string; activo: boolean };

function SelectSede({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} aria-label="Sede" className="crm-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Sin sede</option>
      {CODIGOS_SEDE.map((c) => (
        <option key={c} value={c}>
          {SEDES[c].nombre}
        </option>
      ))}
    </select>
  );
}

export function Ejecutivos({ lista }: { lista: Fila[] }) {
  const [nombre, setNombre] = useState("");
  const [sede, setSede] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const agregar = () =>
    iniciar(async () => {
      const r = await agregarEjecutivo(nombre, sede);
      if ("error" in r) return setError(r.error ?? null);
      setError(null);
      setNombre("");
      setSede("");
    });

  return (
    <div className="space-y-6">
      <form
        className="crm-mesa grid gap-3 p-5 sm:grid-cols-[1fr_220px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          agregar();
        }}
      >
        <label className="block">
          <span className="crm-eyebrow mb-1.5 block">Nombre</span>
          <input id="nuevo-nombre" className="crm-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="crm-eyebrow mb-1.5 block">Sede</span>
          <SelectSede id="nueva-sede" value={sede} onChange={setSede} />
        </label>
        <button type="submit" disabled={pendiente || nombre.trim().length < 2} className="crm-btn crm-btn-primary justify-center">
          Agregar
        </button>
        {error && (
          <p className="text-[13px] text-[var(--crm-danger)] sm:col-span-3" role="alert">
            {error}
          </p>
        )}
      </form>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-[var(--crm-ink-mute)]">
          Aún no hay ejecutivos. Agregue el primero para que aparezca al generar.
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
  const [sede, setSede] = useState(fila.sede);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cambiado = nombre !== fila.nombre || sede !== fila.sede;

  const correr = (accion: () => Promise<{ error?: string }>) =>
    iniciar(async () => {
      const r = await accion();
      setError(r.error ?? null);
    });

  return (
    <li className={`grid gap-3 py-4 sm:grid-cols-[1fr_220px_auto_auto] sm:items-center ${fila.activo ? "" : "opacity-55"}`}>
      <input
        id={`nombre-${fila.id}`}
        aria-label="Nombre"
        className="crm-input"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <SelectSede id={`sede-${fila.id}`} value={sede} onChange={setSede} />
      <button
        type="button"
        disabled={!cambiado || pendiente}
        onClick={() => correr(() => editarEjecutivo(fila.id, nombre, sede))}
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
      {error && (
        <p className="text-[13px] text-[var(--crm-danger)] sm:col-span-4" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
