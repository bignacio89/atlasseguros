"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

type ContractDetailErrorProps = {
  reset: () => void;
};

export default function ContractDetailError({ reset }: ContractDetailErrorProps) {
  return (
    <RouteErrorFallback
      title="Error en detalle de contrato"
      description="No pudimos cargar el contrato en este momento."
      onRetry={reset}
    />
  );
}

