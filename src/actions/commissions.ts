"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { withRole, UnauthorizedError } from "@/lib/with-role";
import { calculateContractCommissions } from "@/services/commission.service";

const commissionActionSchema = z.object({
  contractId: z.string().min(1),
});

export const runContractCommissionDryRunAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
    }

    const parsed = commissionActionSchema.safeParse({
      contractId: formData.get("contractId")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Invalid dry-run payload");

    await calculateContractCommissions({
      contractId: parsed.data.contractId,
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "admin" : "operations",
      dryRun: true,
    });

    redirect(`/dashboard/contracts/${parsed.data.contractId}/commissions`);
  },
);

export const recalculateContractCommissionsAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
    }

    const parsed = commissionActionSchema.safeParse({
      contractId: formData.get("contractId")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Invalid recalculation payload");

    await calculateContractCommissions({
      contractId: parsed.data.contractId,
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "admin" : "operations",
      dryRun: false,
    });

    redirect(`/dashboard/contracts/${parsed.data.contractId}/commissions`);
  },
);

