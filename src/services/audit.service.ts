import { prisma } from "@/lib/prisma-client";
import type { Prisma } from "@prisma/client";

type OfferStatusAuditInput = {
  offerId: string;
  actorId: string;
  actorType: "agent" | "operations" | "admin" | "system" | "webhook";
  previousStatus: string | null;
  newStatus: string;
  metadata?: Prisma.InputJsonValue;
};

type ContractStatusAuditInput = {
  contractId: string;
  actorId: string;
  actorType: "agent" | "operations" | "admin" | "system" | "webhook";
  previousStatus: string | null;
  newStatus: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logOfferStatusChange(input: OfferStatusAuditInput) {
  await prisma.auditLog.create({
    data: {
      entity: "OFFER",
      entityId: input.offerId,
      action: "STATUS_CHANGED",
      previousValue: { status: input.previousStatus },
      newValue: { status: input.newStatus },
      actorId: input.actorId,
      actorType: input.actorType,
      metadata: input.metadata,
    },
  });
}

export async function logContractStatusChange(input: ContractStatusAuditInput) {
  await prisma.auditLog.create({
    data: {
      entity: "CONTRACT",
      entityId: input.contractId,
      action: "STATUS_CHANGED",
      previousValue: { status: input.previousStatus },
      newValue: { status: input.newStatus },
      actorId: input.actorId,
      actorType: input.actorType,
      metadata: input.metadata,
    },
  });
}

