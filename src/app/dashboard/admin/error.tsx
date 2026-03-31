"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

type DashboardAdminErrorProps = {
  reset: () => void;
};

export default function DashboardAdminError({ reset }: DashboardAdminErrorProps) {
  return (
    <RouteErrorFallback
      title="Error en panel de administración"
      description="No se pudo cargar la sección de administración."
      onRetry={reset}
    />
  );
}

