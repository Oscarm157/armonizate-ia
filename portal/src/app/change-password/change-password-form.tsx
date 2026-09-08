"use client";

import { useActionState } from "react";

import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error: string } | null;

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await changePassword(formData)) ?? null,
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">Contraseña actual</Label>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">Nueva contraseña</Label>
        <Input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
