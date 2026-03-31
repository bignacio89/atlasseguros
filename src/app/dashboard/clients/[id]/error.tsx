"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

type ClientProfileErrorProps = {
  reset: () => void;
};

export default function ClientProfileError({ reset }: ClientProfileErrorProps) {
  return (
    <RouteErrorFallback
      title="Error en perfil de cliente"
      description="No fue posible cargar los datos del cliente."
      onRetry={reset}
    />
  );
}

