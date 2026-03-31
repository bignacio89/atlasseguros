import { redirect } from "next/navigation";
import { Suspense } from "react";
import { useFormState } from "react-dom";

import { getInvitationByToken, registerFromInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";

type RegisterPageProps = {
  searchParams: {
    token?: string;
  };
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const token = searchParams?.token;

  if (!token) {
    redirect("/auth/login");
  }

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    redirect("/auth/login");
  }

  const initialState: { error?: string } = {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Completa tu registro
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Has sido invitado a AtlasSeguros CRM. Revisa tus datos y establece tu contraseña.
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-6">
          <dt className="text-slate-500">Correo</dt>
          <dd className="text-slate-900">{invitation.email}</dd>

          <dt className="text-slate-500">Rol</dt>
          <dd className="text-slate-900">{invitation.role}</dd>

          <dt className="text-slate-500">Rango</dt>
          <dd className="text-slate-900">
            {invitation.rank ? invitation.rank.name : "—"}
          </dd>

          <dt className="text-slate-500">Upline</dt>
          <dd className="text-slate-900">
            {invitation.upline ? invitation.upline.name : "—"}
          </dd>
        </dl>

        <Suspense fallback={null}>
          <RegisterForm token={token} initialState={initialState} />
        </Suspense>
      </div>
    </div>
  );
}

type RegisterFormProps = {
  token: string;
  initialState: { error?: string };
};

function RegisterForm({ token, initialState }: RegisterFormProps) {
  const [state, formAction] = useFormState(registerFromInvitation, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700"
        >
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Contraseña
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

      <Button type="submit" className="w-full">
        Crear cuenta
      </Button>
    </form>
  );
}

