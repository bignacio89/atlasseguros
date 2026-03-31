import { useFormState } from "react-dom";

import { requestPasswordReset } from "@/actions/password-reset";
import { Button } from "@/components/ui/button";

const initialState: { success?: boolean } = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(
    requestPasswordReset,
    initialState,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          ¿Has olvidado tu contraseña?
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Introduce tu correo electrónico y, si existe una cuenta asociada,
          te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          {state?.success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              Si existe una cuenta asociada a este correo, recibirás un enlace
              para restablecer tu contraseña en unos minutos.
            </p>
          )}

          <Button type="submit" className="w-full">
            Enviar enlace de restablecimiento
          </Button>
        </form>
      </div>
    </div>
  );
}

