export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Acceso denegado
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          No tienes permisos para acceder a esta página.
        </p>
        <p className="text-xs text-slate-500">
          Si crees que se trata de un error, contacta con un administrador
          de AtlasSeguros.
        </p>
      </div>
    </div>
  );
}

