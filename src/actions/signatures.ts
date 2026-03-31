"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";
import {
  cancelSignatureRequest,
  downloadSignedDocument,
  sendForSignature,
  syncSignatureStatus,
} from "@/services/signature.service";

function buildUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return `${path}?${params.toString()}`;
}

const sendSchema = z.object({
  clientId: z.string().min(1),
  partnerId: z.string().min(1),
  templateId: z.string().min(1),
  contractId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

const idSchema = z.object({
  signatureDocumentId: z.string().min(1),
  returnPath: z.string().min(1),
});

const uploadSchema = z.object({
  signatureDocumentId: z.string().min(1),
  returnPath: z.string().min(1),
});

async function assertClientAccess(clientId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError(["ADMIN", "OPERATIONS", "AGENT"], "Debes iniciar sesión.");
  }
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, agentId: true, firstName: true, lastName: true, email: true },
  });
  if (!client) throw new Error("Cliente no encontrado");
  if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
    throw new UnauthorizedError("AGENT", "No puedes gestionar firmas de este cliente.");
  }
  return { session, client };
}

export const sendSignatureRequestAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const parsed = sendSchema.safeParse({
      clientId: formData.get("clientId")?.toString() ?? "",
      partnerId: formData.get("partnerId")?.toString() ?? "",
      templateId: formData.get("templateId")?.toString() ?? "",
      contractId: formData.get("contractId")?.toString() ?? "",
      notes: formData.get("notes")?.toString() ?? "",
    });

    const returnPath = `/dashboard/clients/${formData.get("clientId")?.toString() ?? ""}/signatures`;
    if (!parsed.success) {
      redirect(buildUrl(returnPath, "error", "Payload de firma inválido."));
    }

    try {
      const { session, client } = await assertClientAccess(parsed.data.clientId);

      const template = await prisma.documentTemplate.findFirst({
        where: {
          id: parsed.data.templateId,
          partnerId: parsed.data.partnerId,
          isActive: true,
        },
        select: {
          id: true,
          templateCode: true,
          name: true,
          partnerId: true,
        },
      });
      if (!template) throw new Error("Plantilla no válida para el partner seleccionado");

      if (parsed.data.contractId) {
        const contract = await prisma.contract.findUnique({
          where: { id: parsed.data.contractId },
          select: { id: true, clientId: true },
        });
        if (!contract || contract.clientId !== client.id) {
          throw new Error("Contrato no válido para este cliente");
        }
      }

      const providerReq = await sendForSignature(
        template.templateCode,
        client.email,
        `${client.firstName} ${client.lastName}`,
      );

      await prisma.signatureDocument.create({
        data: {
          agentId: client.agentId,
          clientId: client.id,
          templateId: template.id,
          contractId: parsed.data.contractId || null,
          status: "SENT",
          signaturitRequestId: providerReq.providerRequestId,
          signaturitAuditUrl: providerReq.auditUrl,
          sentAt: new Date(),
          notes: parsed.data.notes || null,
        },
      });

      await prisma.auditLog.create({
        data: {
          entity: "CONTRACT",
          entityId: parsed.data.contractId || client.id,
          action: "CREATED",
          actorId: session.user.id,
          actorType: session.user.role === "ADMIN" ? "admin" : session.user.role.toLowerCase(),
          metadata: {
            signatureEvent: "sent_for_signature",
            templateId: template.id,
            providerRequestId: providerReq.providerRequestId,
          },
        },
      });

      redirect(buildUrl(returnPath, "success", "Documento enviado a firma."));
    } catch (error) {
      redirect(
        buildUrl(
          returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo enviar el documento.",
        ),
      );
    }
  },
);

export const syncSignatureStatusAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const parsed = idSchema.safeParse({
      signatureDocumentId: formData.get("signatureDocumentId")?.toString() ?? "",
      returnPath: formData.get("returnPath")?.toString() ?? "",
    });
    if (!parsed.success) {
      redirect(buildUrl("/dashboard", "error", "Payload inválido."));
    }

    try {
      const session = await auth();
      if (!session?.user) {
        throw new UnauthorizedError(["ADMIN", "OPERATIONS", "AGENT"], "Debes iniciar sesión.");
      }

      const doc = await prisma.signatureDocument.findUnique({
        where: { id: parsed.data.signatureDocumentId },
        select: {
          id: true,
          agentId: true,
          status: true,
          signaturitRequestId: true,
        },
      });
      if (!doc) throw new Error("Documento no encontrado");
      if (session.user.role === "AGENT" && doc.agentId !== session.user.id) {
        throw new UnauthorizedError("AGENT", "No puedes sincronizar este documento.");
      }
      if (!doc.signaturitRequestId) throw new Error("Documento sin referencia de proveedor");

      const status = await syncSignatureStatus(doc.signaturitRequestId);
      const statusMap = {
        sent: "SENT",
        viewed: "VIEWED",
        signed: "SIGNED",
        declined: "DECLINED",
        expired: "EXPIRED",
      } as const;
      const nextStatus = statusMap[status.status];

      await prisma.signatureDocument.update({
        where: { id: doc.id },
        data: {
          status: nextStatus,
          viewedAt: status.viewedAt,
          signedAt: status.signedAt,
          declinedAt: status.declinedAt,
          expiredAt: status.expiredAt,
          declineReason: status.declineReason,
          signedDocumentS3Key: status.signedDocumentUrl ?? undefined,
        },
      });

      redirect(buildUrl(parsed.data.returnPath, "success", "Estado sincronizado."));
    } catch (error) {
      redirect(
        buildUrl(
          parsed.data.returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo sincronizar el estado.",
        ),
      );
    }
  },
);

export const cancelSignatureRequestAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const parsed = idSchema.safeParse({
      signatureDocumentId: formData.get("signatureDocumentId")?.toString() ?? "",
      returnPath: formData.get("returnPath")?.toString() ?? "",
    });
    if (!parsed.success) redirect(buildUrl("/dashboard", "error", "Payload inválido."));

    try {
      const session = await auth();
      if (!session?.user) {
        throw new UnauthorizedError(["ADMIN", "OPERATIONS", "AGENT"], "Debes iniciar sesión.");
      }
      const doc = await prisma.signatureDocument.findUnique({
        where: { id: parsed.data.signatureDocumentId },
        select: { id: true, agentId: true, status: true, signaturitRequestId: true },
      });
      if (!doc) throw new Error("Documento no encontrado");
      if (session.user.role === "AGENT" && doc.agentId !== session.user.id) {
        throw new UnauthorizedError("AGENT", "No puedes cancelar este documento.");
      }
      if (doc.status !== "SENT" && doc.status !== "VIEWED") {
        throw new Error("Solo se puede cancelar un documento en estado SENT o VIEWED.");
      }
      if (doc.signaturitRequestId) {
        await cancelSignatureRequest(doc.signaturitRequestId);
      }

      await prisma.signatureDocument.update({
        where: { id: doc.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      redirect(buildUrl(parsed.data.returnPath, "success", "Solicitud cancelada."));
    } catch (error) {
      redirect(
        buildUrl(
          parsed.data.returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo cancelar la solicitud.",
        ),
      );
    }
  },
);

export const manualUploadSignedPdfAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const parsed = uploadSchema.safeParse({
      signatureDocumentId: formData.get("signatureDocumentId")?.toString() ?? "",
      returnPath: formData.get("returnPath")?.toString() ?? "",
    });
    if (!parsed.success) redirect(buildUrl("/dashboard", "error", "Payload inválido."));

    try {
      const file = formData.get("signedPdf");
      if (!(file instanceof File)) throw new Error("PDF no proporcionado.");
      if (file.type !== "application/pdf") throw new Error("Solo se permite PDF.");
      if (file.size <= 0) throw new Error("PDF vacío.");

      const doc = await prisma.signatureDocument.findUnique({
        where: { id: parsed.data.signatureDocumentId },
        select: { id: true, status: true },
      });
      if (!doc) throw new Error("Documento no encontrado.");
      if (doc.status !== "SENT" && doc.status !== "VIEWED") {
        throw new Error("Solo se admite subida manual en estado SENT o VIEWED.");
      }

      // S3 upload stub: we persist a synthetic S3 key until storage integration is enabled.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const s3Key = `signatures/manual/${doc.id}/${Date.now()}-${safeName}`;

      await prisma.signatureDocument.update({
        where: { id: doc.id },
        data: {
          status: "MANUALLY_UPLOADED",
          signedDocumentS3Key: s3Key,
          signedAt: new Date(),
          notes: "Manual PDF uploaded by Operations (provider bypass).",
        },
      });

      redirect(buildUrl(parsed.data.returnPath, "success", "PDF subido manualmente."));
    } catch (error) {
      redirect(
        buildUrl(
          parsed.data.returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo subir el PDF.",
        ),
      );
    }
  },
);

export const downloadSignedPdfAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const parsed = idSchema.safeParse({
      signatureDocumentId: formData.get("signatureDocumentId")?.toString() ?? "",
      returnPath: formData.get("returnPath")?.toString() ?? "",
    });
    if (!parsed.success) redirect(buildUrl("/dashboard", "error", "Payload inválido."));

    try {
      const session = await auth();
      if (!session?.user) {
        throw new UnauthorizedError(["ADMIN", "OPERATIONS", "AGENT"], "Debes iniciar sesión.");
      }

      const doc = await prisma.signatureDocument.findUnique({
        where: { id: parsed.data.signatureDocumentId },
        select: {
          id: true,
          agentId: true,
          status: true,
          signaturitRequestId: true,
          signedDocumentS3Key: true,
        },
      });
      if (!doc) throw new Error("Documento no encontrado.");
      if (session.user.role === "AGENT" && doc.agentId !== session.user.id) {
        throw new UnauthorizedError("AGENT", "No puedes descargar este documento.");
      }

      if (doc.status === "MANUALLY_UPLOADED" && doc.signedDocumentS3Key) {
        redirect(buildUrl(parsed.data.returnPath, "success", `S3 key: ${doc.signedDocumentS3Key}`));
      }

      if (!doc.signaturitRequestId) {
        throw new Error("No hay referencia de proveedor para descarga.");
      }
      const buffer = await downloadSignedDocument(doc.signaturitRequestId);
      if (!buffer) {
        throw new Error("No hay PDF firmado disponible todavía en el proveedor.");
      }

      redirect(buildUrl(parsed.data.returnPath, "success", `PDF descargado (${buffer.byteLength} bytes stub).`));
    } catch (error) {
      redirect(
        buildUrl(
          parsed.data.returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo descargar el PDF.",
        ),
      );
    }
  },
);

export {};
