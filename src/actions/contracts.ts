"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";
import { logContractStatusChange } from "@/services/audit.service";

const transitionFromActiveSchema = z.object({
  contractId: z.string().min(1),
  targetStatus: z.enum(["LAPSED", "CANCELLED", "EXPIRED"]),
  reason: z.string().trim().optional().or(z.literal("")),
});

export const transitionContractFromActiveAction = withRole(
  "OPERATIONS",
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError("OPERATIONS", "Debes iniciar sesión.");
    }

    const parsed = transitionFromActiveSchema.safeParse({
      contractId: formData.get("contractId")?.toString() ?? "",
      targetStatus: formData.get("targetStatus")?.toString() ?? "",
      reason: formData.get("reason")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid contract status transition payload");
    }

    const contract = await prisma.contract.findUnique({
      where: { id: parsed.data.contractId },
      select: { id: true, status: true },
    });
    if (!contract) throw new Error("Contract not found");
    if (contract.status !== "ACTIVE") {
      throw new Error("Only ACTIVE contracts can be transitioned in this flow");
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: parsed.data.targetStatus,
        endDate: new Date(),
      },
    });

    await logContractStatusChange({
      contractId: contract.id,
      actorId: session.user.id,
      actorType: "operations",
      previousStatus: contract.status,
      newStatus: parsed.data.targetStatus,
      metadata: {
        reason: parsed.data.reason || null,
      },
    });

    redirect(`/dashboard/contracts/${contract.id}`);
  },
);

export {};
