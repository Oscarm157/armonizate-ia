"use client";

import { useActionState } from "react";

import { login } from "@/app/actions/auth";

type State = { error: string } | null;

export function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await login(formData)) ?? null,
    null
  );

  return (
    <form action={action} className="space-y-3.5">
      <div>
        <label className="crm-eyebrow mb-1.5 block" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          className="crm-input"
        />
      </div>
      <div>
        <label className="crm-eyebrow mb-1.5 block" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="crm-input"
        />
      </div>

      {state?.error ? (
        <p className="text-[13px] text-[var(--crm-danger)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="crm-btn crm-btn-primary w-full justify-center">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
