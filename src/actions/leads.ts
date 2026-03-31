"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";

const leadSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Email inválido",
    }),
  phone: z.string().optional().or(z.literal("")),
  leadType: z.enum(["ATLAS", "STANDARD"]),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  agentId: z.string().optional().or(z.literal("")),
  privacyPolicyVersion: z.string().min(1).default("v1"),
  consentDataProcessing: z.boolean(),
  consentMarketingEmail: z.boolean(),
  consentMarketingPhone: z.boolean(),
});

export const createLeadAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const parsed = leadSchema.safeParse(parseLeadFormData(formData));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Payload inválido";
      redirect(
        `/dashboard/leads/new?type=error&message=${encodeURIComponent(firstIssue)}`,
      );
    }

    if (!parsed.data.consentDataProcessing) {
      redirect(
        `/dashboard/leads/new?type=error&message=${encodeURIComponent(
          "Debes aceptar DATA_PROCESSING para crear el lead.",
        )}`,
      );
    }

    const finalAgentId =
      session.user.role === "AGENT"
        ? session.user.id
        : parsed.data.agentId || session.user.id;

    const lead = await prisma.lead.create({
      data: {
        agentId: finalAgentId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        leadType: parsed.data.leadType,
        source: parsed.data.source || null,
        notes: parsed.data.notes || null,
      },
    });

    await insertConsentLogs({
      leadId: lead.id,
      recordedById: session.user.id,
      privacyPolicyVersion: parsed.data.privacyPolicyVersion,
      consentDataProcessing: parsed.data.consentDataProcessing,
      consentMarketingEmail: parsed.data.consentMarketingEmail,
      consentMarketingPhone: parsed.data.consentMarketingPhone,
    });

    redirect("/dashboard/leads");
  },
);

export const updateLeadAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const parsed = leadSchema.extend({ id: z.string().min(1) }).safeParse(
      parseLeadFormData(formData),
    );
    if (!parsed.success) throw new Error("Invalid lead payload");
    if (!parsed.data.consentDataProcessing) {
      throw new Error("DATA_PROCESSING consent is required");
    }

    const existing = await prisma.lead.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, agentId: true },
    });
    if (!existing) throw new Error("Lead not found");

    if (session.user.role === "AGENT" && existing.agentId !== session.user.id) {
      throw new UnauthorizedError("AGENT", "No puedes editar este lead.");
    }

    const finalAgentId =
      session.user.role === "AGENT"
        ? session.user.id
        : parsed.data.agentId || existing.agentId;

    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        agentId: finalAgentId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        leadType: parsed.data.leadType,
        source: parsed.data.source || null,
        notes: parsed.data.notes || null,
      },
    });

    await insertConsentLogs({
      leadId: existing.id,
      recordedById: session.user.id,
      privacyPolicyVersion: parsed.data.privacyPolicyVersion,
      consentDataProcessing: parsed.data.consentDataProcessing,
      consentMarketingEmail: parsed.data.consentMarketingEmail,
      consentMarketingPhone: parsed.data.consentMarketingPhone,
    });

    redirect("/dashboard/leads");
  },
);

export const convertLeadToClientAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const leadId = formData.get("leadId")?.toString() ?? "";
    if (!leadId) throw new Error("Missing leadId");

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        agentId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        clientId: true,
      },
    });

    if (!lead) throw new Error("Lead not found");
    if (session.user.role === "AGENT" && lead.agentId !== session.user.id) {
      throw new UnauthorizedError("AGENT", "No puedes convertir este lead.");
    }

    const isOptimistic = formData.get("optimistic")?.toString() === "1";
    if (lead.clientId) {
      if (!isOptimistic) {
        redirect(`/dashboard/clients/${lead.clientId}`);
      }
      return { clientId: lead.clientId, leadId: lead.id };
    }

    if (!lead.email) {
      throw new Error("Lead email is required for conversion to client.");
    }

    const existingClient = await prisma.client.findUnique({
      where: { email: lead.email },
      select: { id: true, agentId: true },
    });

    const clientId = existingClient
      ? existingClient.id
      : (
          await prisma.client.create({
            data: {
              agentId: lead.agentId,
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
            },
            select: { id: true },
          })
        ).id;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          clientId,
          convertedAt: new Date(),
        },
      });

      await tx.consentLog.updateMany({
        where: { leadId: lead.id },
        data: {
          clientId,
          leadId: null,
        },
      });
    });

    if (!isOptimistic) {
      redirect(`/dashboard/clients/${clientId}`);
    }
    return { clientId, leadId: lead.id };
  },
);

export const archiveLeadAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const isOptimistic = formData.get("optimistic")?.toString() === "1";
    const leadId = formData.get("leadId")?.toString() ?? "";
    if (!leadId) throw new Error("Missing leadId");

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, agentId: true, deletedAt: true },
    });
    if (!lead) throw new Error("Lead not found");
    if (lead.deletedAt) {
      if (!isOptimistic) {
        redirect("/dashboard/leads");
      }
      return { leadId };
    }

    if (session.user.role === "AGENT" && lead.agentId !== session.user.id) {
      throw new UnauthorizedError("AGENT", "No puedes archivar este lead.");
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { deletedAt: new Date() },
    });

    if (!isOptimistic) {
      redirect("/dashboard/leads");
    }
    return { leadId };
  },
);

function parseLeadFormData(formData: FormData) {
  const leadTypeRaw = formData.get("leadType")?.toString().trim().toUpperCase();
  return {
    id: formData.get("id")?.toString(),
    firstName: formData.get("firstName")?.toString().trim() ?? "",
    lastName: formData.get("lastName")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim() ?? "",
    phone: formData.get("phone")?.toString().trim() ?? "",
    leadType: leadTypeRaw === "ATLAS" ? "ATLAS" : "STANDARD",
    source: formData.get("source")?.toString().trim() ?? "",
    notes: formData.get("notes")?.toString().trim() ?? "",
    agentId: formData.get("agentId")?.toString() ?? "",
    privacyPolicyVersion:
      formData.get("privacyPolicyVersion")?.toString().trim() ?? "v1",
    consentDataProcessing: formData.get("consentDataProcessing") === "on",
    consentMarketingEmail: formData.get("consentMarketingEmail") === "on",
    consentMarketingPhone: formData.get("consentMarketingPhone") === "on",
  };
}

async function insertConsentLogs(input: {
  leadId: string;
  recordedById: string;
  privacyPolicyVersion: string;
  consentDataProcessing: boolean;
  consentMarketingEmail: boolean;
  consentMarketingPhone: boolean;
}) {
  await prisma.consentLog.createMany({
    data: [
      {
        consentType: "DATA_PROCESSING",
        granted: input.consentDataProcessing,
        leadId: input.leadId,
        recordedById: input.recordedById,
        channel: "web_form",
        privacyPolicyVersion: input.privacyPolicyVersion,
      },
      {
        consentType: "MARKETING_EMAIL",
        granted: input.consentMarketingEmail,
        leadId: input.leadId,
        recordedById: input.recordedById,
        channel: "web_form",
        privacyPolicyVersion: input.privacyPolicyVersion,
      },
      {
        consentType: "MARKETING_PHONE",
        granted: input.consentMarketingPhone,
        leadId: input.leadId,
        recordedById: input.recordedById,
        channel: "web_form",
        privacyPolicyVersion: input.privacyPolicyVersion,
      },
    ],
  });
}
