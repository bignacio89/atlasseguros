"use client";

type RouteErrorFallbackProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function RouteErrorFallback({
  title = "No se pudo cargar la vista",
  description = "Se produjo un error inesperado. Inténtalo de nuevo.",
  onRetry,
}: RouteErrorFallbackProps) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900/40 dark:bg-red-950/30"
    >
      <h2 className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</h2>
      <p className="mt-2 text-sm text-red-800 dark:text-red-300">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-red-300 px-3 py-2 text-sm text-red-900 hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
        >
          Reintentar
        </button>
      )}
    </section>
  );
}

