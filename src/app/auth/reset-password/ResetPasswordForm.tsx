"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { resetPassword } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";

const initialState: { error?: string; success?: boolean } = {};

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, formAction] = useActionState(resetPassword, initialState);

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <p className="text-sm text-red-600 mb-4">
          El enlace de restablecimiento no es válido.
        </p>
        <Link href="/auth/login" className="text-sm underline underline-offset-4">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">
        Restablecer contraseña
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Introduce tu nueva contraseña. El enlace de restablecimiento solo es
        válido durante 1 hora.
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700"
          >
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {state?.success && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            Tu contraseña se ha actualizado correctamente. Ya puedes iniciar sesión.
          </p>
        )}

        <Button type="submit" className="w-full">
          Guardar nueva contraseña
        </Button>
      </form>
    </div>
  );
}

