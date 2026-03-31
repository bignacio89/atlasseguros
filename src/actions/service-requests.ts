"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";

const serviceRequestBaseSchema = z.object({
  contractId: z.string().min(1),
  type: z.enum(["MODIFICATION", "CANCELLATION", "CLAIM", "INQUIRY", "RENEWAL"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
});

const updateServiceRequestSchema = serviceRequestBaseSchema.extend({
  id: z.string().min(1),
});

const deleteServiceRequestSchema = z.object({
  id: z.string().min(1),
  contractId: z.string().min(1),
});

const transitionSchema = z.object({
  id: z.string().min(1),
  targetStatus: z.enum(["IN_PROGRESS", "SUBMITTED_TO_PARTNER", "RESOLVED", "CLOSED"]),
  partnerReferenceNumber: z.string().trim().optional().or(z.literal("")),
  redirectTo: z.string().optional().or(z.literal("")),
});

function buildResultUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return `${path}?${params.toString()}`;
}

export const createServiceRequestAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
      }

      const parsed = serviceRequestBaseSchema.safeParse({
        contractId: formData.get("contractId")?.toString() ?? "",
        type: formData.get("type")?.toString() ?? "",
        title: formData.get("title")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
      });
      if (!parsed.success) throw new Error("Payload inválido");

      const contract = await prisma.contract.findUnique({
        where: { id: parsed.data.contractId },
        select: { id: true, agentId: true },
      });
      if (!contract) throw new Error("Contrato no encontrado");

      await prisma.serviceRequest.create({
        data: {
          contractId: contract.id,
          agentId: contract.agentId,
          type: parsed.data.type,
          title: parsed.data.title,
          description: parsed.data.description,
        },
      });

      redirect(
        buildResultUrl(
          `/dashboard/contracts/${contract.id}/after-sales`,
          "success",
          "Solicitud creada correctamente.",
        ),
      );
    } catch (error) {
      const contractId = formData.get("contractId")?.toString() ?? "";
      redirect(
        buildResultUrl(
          `/dashboard/contracts/${contractId}/after-sales`,
          "error",
          error instanceof Error ? error.message : "No se pudo crear la solicitud.",
        ),
      );
    }
  },
);

export const updateServiceRequestAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    try {
      const parsed = updateServiceRequestSchema.safeParse({
        id: formData.get("id")?.toString() ?? "",
        contractId: formData.get("contractId")?.toString() ?? "",
        type: formData.get("type")?.toString() ?? "",
        title: formData.get("title")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
      });
      if (!parsed.success) throw new Error("Payload inválido");

      await prisma.serviceRequest.update({
        where: { id: parsed.data.id },
        data: {
          type: parsed.data.type,
          title: parsed.data.title,
          description: parsed.data.description,
        },
      });

      redirect(
        buildResultUrl(
          `/dashboard/contracts/${parsed.data.contractId}/after-sales`,
          "success",
          "Solicitud actualizada.",
        ),
      );
    } catch (error) {
      const contractId = formData.get("contractId")?.toString() ?? "";
      redirect(
        buildResultUrl(
          `/dashboard/contracts/${contractId}/after-sales`,
          "error",
          error instanceof Error ? error.message : "No se pudo actualizar la solicitud.",
        ),
      );
    }
  },
);

export const deleteServiceRequestAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    try {
      const parsed = deleteServiceRequestSchema.safeParse({
        id: formData.get("id")?.toString() ?? "",
        contractId: formData.get("contractId")?.toString() ?? "",
      });
      if (!parsed.success) throw new Error("Payload inválido");

      await prisma.serviceRequest.delete({
        where: { id: parsed.data.id },
      });

      redirect(
        buildResultUrl(
          `/dashboard/contracts/${parsed.data.contractId}/after-sales`,
          "success",
          "Solicitud eliminada.",
        ),
      );
    } catch (error) {
      const contractId = formData.get("contractId")?.toString() ?? "";
      redirect(
        buildResultUrl(
          `/dashboard/contracts/${contractId}/after-sales`,
          "error",
          error instanceof Error ? error.message : "No se pudo eliminar la solicitud.",
        ),
      );
    }
  },
);

export const transitionServiceRequestStatusAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const fallbackPath = "/dashboard/operations/after-sales";
    try {
      const parsed = transitionSchema.safeParse({
        id: formData.get("id")?.toString() ?? "",
        targetStatus: formData.get("targetStatus")?.toString() ?? "",
        partnerReferenceNumber: formData.get("partnerReferenceNumber")?.toString() ?? "",
        redirectTo: formData.get("redirectTo")?.toString() ?? "",
      });
      if (!parsed.success) throw new Error("Payload de transición inválido");

      const redirectTo = parsed.data.redirectTo || fallbackPath;
      const item = await prisma.serviceRequest.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, status: true, contractId: true },
      });
      if (!item) throw new Error("Solicitud no encontrada");

      const current = item.status;
      const next = parsed.data.targetStatus;
      const valid =
        (current === "OPEN" && next === "IN_PROGRESS") ||
        (current === "IN_PROGRESS" && next === "SUBMITTED_TO_PARTNER") ||
        (current === "SUBMITTED_TO_PARTNER" && next === "RESOLVED") ||
        (current === "RESOLVED" && next === "CLOSED");

      if (!valid) throw new Error("Transición de estado no permitida");
      if (next === "SUBMITTED_TO_PARTNER" && !parsed.data.partnerReferenceNumber) {
        throw new Error("partnerReferenceNumber es obligatorio para SUBMITTED_TO_PARTNER");
      }

      await prisma.serviceRequest.update({
        where: { id: item.id },
        data: {
          status: next,
          submittedToPartnerAt: next === "SUBMITTED_TO_PARTNER" ? new Date() : undefined,
          partnerReferenceNumber:
            next === "SUBMITTED_TO_PARTNER"
              ? parsed.data.partnerReferenceNumber
              : undefined,
          resolvedAt: next === "RESOLVED" ? new Date() : undefined,
        },
      });

      redirect(buildResultUrl(redirectTo, "success", `Estado actualizado a ${next}.`));
    } catch (error) {
      const redirectTo = formData.get("redirectTo")?.toString() || fallbackPath;
      redirect(
        buildResultUrl(
          redirectTo,
          "error",
          error instanceof Error ? error.message : "No se pudo actualizar el estado.",
        ),
      );
    }
  },
);
