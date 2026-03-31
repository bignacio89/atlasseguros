"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

type DashboardOperationsErrorProps = {
  reset: () => void;
};

export default function DashboardOperationsError({
  reset,
}: DashboardOperationsErrorProps) {
  return (
    <RouteErrorFallback
      title="Error en operaciones"
      description="No se pudo cargar la cola operativa."
      onRetry={reset}
    />
  );
}

