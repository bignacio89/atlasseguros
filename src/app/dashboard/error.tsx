"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

type DashboardErrorProps = {
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <RouteErrorFallback
      title="Error en el dashboard"
      description="No pudimos recuperar los datos del dashboard."
      onRetry={reset}
    />
  );
}

