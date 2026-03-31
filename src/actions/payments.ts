"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";
import { createPortalSession, retryPayment } from "@/services/payment.service";

function buildUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return `${path}?${params.toString()}`;
}

async function assertContractAccess(contractId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError(["ADMIN", "OPERATIONS", "AGENT"], "Debes iniciar sesión.");
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, agentId: true, clientId: true },
  });
  if (!contract) throw new Error("Contract not found");

  if (session.user.role === "AGENT" && contract.agentId !== session.user.id) {
    throw new UnauthorizedError("AGENT", "No puedes gestionar este contrato.");
  }

  return { session, contract };
}

export const retryPaymentAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const contractId = formData.get("contractId")?.toString() ?? "";
    const returnPath = formData.get("returnPath")?.toString() ?? "/dashboard";

    try {
      const { contract } = await assertContractAccess(contractId);
      await retryPayment(contract.id);
      redirect(buildUrl(returnPath, "success", "Reintento de pago lanzado."));
    } catch (error) {
      redirect(
        buildUrl(
          returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo reintentar el pago.",
        ),
      );
    }
  },
);

export const createPortalSessionAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const contractId = formData.get("contractId")?.toString() ?? "";
    const returnPath = formData.get("returnPath")?.toString() ?? "/dashboard";

    try {
      const { contract } = await assertContractAccess(contractId);
      const portalUrl = await createPortalSession(contract.id, returnPath);
      redirect(portalUrl);
    } catch (error) {
      redirect(
        buildUrl(
          returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo abrir el portal de pagos.",
        ),
      );
    }
  },
);

