"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canAgentEditOfferStatus } from "@/lib/offer-permissions";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";
import { logOfferStatusChange } from "@/services/audit.service";

const createOfferSchema = z.object({
  productId: z.string().min(1),
  premiumAmount: z.coerce.number().gt(0),
  leadType: z.enum(["ATLAS", "STANDARD"]),
  paymentPlan: z.enum(["FULL", "INSTALLMENT"]).optional(),
  installmentCount: z.coerce.number().int().optional(),
  notes: z.string().optional().or(z.literal("")),
});

const updateOfferSchema = z.object({
  offerId: z.string().min(1),
  productId: z.string().min(1),
  premiumAmount: z.coerce.number().gt(0),
  leadType: z.enum(["ATLAS", "STANDARD"]),
  notes: z.string().optional().or(z.literal("")),
});

export const createOfferAction = withRole("AGENT", async (formData: FormData) => {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError("AGENT", "Debes iniciar sesión.");
  }

  const parsed = createOfferSchema.safeParse({
    productId: formData.get("productId")?.toString() ?? "",
    premiumAmount: formData.get("premiumAmount")?.toString() ?? "",
    leadType: formData.get("leadType")?.toString() ?? "STANDARD",
    paymentPlan: formData.get("paymentPlan")?.toString() ?? undefined,
    installmentCount: formData.get("installmentCount")?.toString() || undefined,
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    throw new Error("Invalid offer payload");
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, isConsultationFee: true },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  let paymentPlan: "FULL" | "INSTALLMENT" | null = null;
  let installmentCount: number | null = null;
  if (product.isConsultationFee) {
    paymentPlan = parsed.data.paymentPlan ?? "FULL";
    if (paymentPlan === "INSTALLMENT") {
      const rawInstallments = parsed.data.installmentCount ?? 3;
      if (![3, 6, 9, 12].includes(rawInstallments)) {
        throw new Error("Invalid installment count");
      }
      installmentCount = rawInstallments;
    }
  }

  const offer = await prisma.offer.create({
    data: {
      agentId: session.user.id,
      productId: parsed.data.productId,
      premiumAmount: parsed.data.premiumAmount,
      leadType: parsed.data.leadType,
      paymentPlan,
      installmentCount,
      notes: parsed.data.notes || null,
      status: "PENDING_OPERATIONS_REVIEW",
    },
  });

  await logOfferStatusChange({
    offerId: offer.id,
    actorId: session.user.id,
    actorType: "agent",
    previousStatus: null,
    newStatus: "PENDING_OPERATIONS_REVIEW",
    metadata: { reason: "offer_created_by_agent" },
  });

  redirect("/dashboard/offers");
});

const offerCommentSchema = z.object({
  offerId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

const reviewOfferSchema = z.object({
  offerId: z.string().min(1),
});

const rejectOfferSchema = z.object({
  offerId: z.string().min(1),
  rejectionNote: z.string().trim().min(1).max(2000),
});

const activateContractSchema = z.object({
  offerId: z.string().min(1),
  policyNumber: z.string().trim().min(1).max(120),
  policyIssuedAt: z.string().min(1),
});

async function generateConsultationFeeReference(
  tx: Prisma.TransactionClient,
  year: number,
) {
  const prefix = `CF-${year}-`;
  const latest = await tx.contract.findFirst({
    where: {
      internalReference: {
        startsWith: prefix,
      },
    },
    orderBy: { internalReference: "desc" },
    select: { internalReference: true },
  });

  const lastSequence = latest?.internalReference
    ? Number(latest.internalReference.slice(prefix.length))
    : 0;
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

const resubmitOfferSchema = z.object({
  offerId: z.string().min(1),
  resubmitNote: z.string().trim().min(1).max(2000),
});

export const addOfferCommentAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const parsed = offerCommentSchema.safeParse({
      offerId: formData.get("offerId")?.toString() ?? "",
      body: formData.get("body")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid comment payload");
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parsed.data.offerId },
      select: { id: true, agentId: true },
    });
    if (!offer) throw new Error("Offer not found");

    if (session.user.role === "AGENT" && offer.agentId !== session.user.id) {
      throw new UnauthorizedError("AGENT", "No puedes comentar esta oferta.");
    }

    await prisma.offerComment.create({
      data: {
        offerId: offer.id,
        authorId: session.user.id,
        authorRole: session.user.role,
        body: parsed.data.body.trim(),
      },
    });

    redirect(`/dashboard/offers/${offer.id}`);
  },
);

export const updateOfferAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const parsed = updateOfferSchema.safeParse({
      offerId: formData.get("offerId")?.toString() ?? "",
      productId: formData.get("productId")?.toString() ?? "",
      premiumAmount: formData.get("premiumAmount")?.toString() ?? "",
      leadType: formData.get("leadType")?.toString() ?? "STANDARD",
      notes: formData.get("notes")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid offer payload");
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parsed.data.offerId },
      select: { id: true, agentId: true, status: true },
    });
    if (!offer) throw new Error("Offer not found");

    if (session.user.role === "AGENT") {
      if (offer.agentId !== session.user.id) {
        throw new UnauthorizedError("AGENT", "No puedes editar esta oferta.");
      }
      if (!canAgentEditOfferStatus(offer.status)) {
        throw new UnauthorizedError(
          "AGENT",
          "Solo puedes editar ofertas en estado DRAFT o REJECTED.",
        );
      }
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        productId: parsed.data.productId,
        premiumAmount: parsed.data.premiumAmount,
        leadType: parsed.data.leadType,
        notes: parsed.data.notes || null,
      },
    });

    redirect(`/dashboard/offers/${offer.id}`);
  },
);

export const approveOfferAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
    }

    const parsed = reviewOfferSchema.safeParse({
      offerId: formData.get("offerId")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid review payload");
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parsed.data.offerId },
      select: { id: true, status: true },
    });
    if (!offer) throw new Error("Offer not found");
    if (offer.status !== "PENDING_OPERATIONS_REVIEW") {
      throw new Error("Offer is not pending operations review");
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: "SUBMITTED_TO_PARTNER",
        submittedToPartnerAt: new Date(),
      },
    });

    await logOfferStatusChange({
      offerId: offer.id,
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "admin" : "operations",
      previousStatus: offer.status,
      newStatus: "SUBMITTED_TO_PARTNER",
      metadata: { reason: "approved_in_operations_queue" },
    });

    redirect("/dashboard/operations/offers");
  },
);

export const rejectOfferAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
    }

    const parsed = rejectOfferSchema.safeParse({
      offerId: formData.get("offerId")?.toString() ?? "",
      rejectionNote: formData.get("rejectionNote")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid rejection payload");
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parsed.data.offerId },
      select: { id: true, status: true },
    });
    if (!offer) throw new Error("Offer not found");
    if (offer.status !== "PENDING_OPERATIONS_REVIEW") {
      throw new Error("Offer is not pending operations review");
    }

    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offer.id },
        data: {
          status: "REJECTED",
          operationsNotes: parsed.data.rejectionNote,
        },
      });

      await tx.offerComment.create({
        data: {
          offerId: offer.id,
          authorId: session.user.id,
          authorRole: session.user.role,
          body: parsed.data.rejectionNote,
        },
      });
    });

    await logOfferStatusChange({
      offerId: offer.id,
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "admin" : "operations",
      previousStatus: offer.status,
      newStatus: "REJECTED",
      metadata: { reason: "rejected_in_operations_queue" },
    });

    redirect("/dashboard/operations/offers");
  },
);

export const activateContractFromOfferAction = withRole(
  ["ADMIN", "OPERATIONS"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(["ADMIN", "OPERATIONS"], "Debes iniciar sesión.");
    }

    const parsed = activateContractSchema.safeParse({
      offerId: formData.get("offerId")?.toString() ?? "",
      policyNumber: formData.get("policyNumber")?.toString() ?? "",
      policyIssuedAt: formData.get("policyIssuedAt")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new Error("Invalid activation payload");
    }

    const policyIssuedAt = new Date(parsed.data.policyIssuedAt);
    if (Number.isNaN(policyIssuedAt.getTime())) {
      throw new Error("Invalid policy issue date");
    }

    const offer = await prisma.offer.findUnique({
      where: { id: parsed.data.offerId },
      select: {
        id: true,
        status: true,
        agentId: true,
        clientId: true,
        leadType: true,
        premiumAmount: true,
        paymentPlan: true,
        installmentCount: true,
        product: { select: { isConsultationFee: true } },
        contract: { select: { id: true } },
      },
    });
    if (!offer) throw new Error("Offer not found");
    if (offer.status !== "SUBMITTED_TO_PARTNER") {
      throw new Error("Offer is not submitted to partner");
    }
    if (offer.contract) {
      throw new Error("Offer already has an active contract");
    }
    if (!offer.clientId) {
      throw new Error("Offer must be linked to a client before activation");
    }
    const clientId = offer.clientId;

    const agent = await prisma.user.findUnique({
      where: { id: offer.agentId },
      select: { rankId: true },
    });
    if (!agent?.rankId) {
      throw new Error("Agent rank is required to compute contract points");
    }

    const rateCard = await prisma.rateCard.findFirst({
      where: {
        rankId: agent.rankId,
        leadType: offer.leadType,
        effectiveDate: { lte: policyIssuedAt },
      },
      orderBy: { effectiveDate: "desc" },
      select: { euroPerPoint: true },
    });
    if (!rateCard) {
      throw new Error("No applicable rate card found for this contract");
    }

    const points = new Prisma.Decimal(offer.premiumAmount).div(rateCard.euroPerPoint);

    await prisma.$transaction(async (tx) => {
      const internalReference = offer.product.isConsultationFee
        ? await generateConsultationFeeReference(tx, policyIssuedAt.getFullYear())
        : null;

      await tx.offer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED" },
      });

      await tx.contract.create({
        data: {
          offerId: offer.id,
          agentId: offer.agentId,
          clientId,
          status: "ACTIVE",
          leadType: offer.leadType,
          premiumAmount: offer.premiumAmount,
          paymentPlan: offer.paymentPlan ?? undefined,
          points,
          startDate: policyIssuedAt,
          policyNumber: parsed.data.policyNumber,
          internalReference,
          policyIssuedAt,
        },
      });
    });

    await logOfferStatusChange({
      offerId: offer.id,
      actorId: session.user.id,
      actorType: session.user.role === "ADMIN" ? "admin" : "operations",
      previousStatus: offer.status,
      newStatus: "ACCEPTED",
      metadata: { reason: "contract_activated_from_operations_queue" },
    });

    redirect("/dashboard/operations/offers");
  },
);

export const resubmitOfferAction = withRole("AGENT", async (formData: FormData) => {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError("AGENT", "Debes iniciar sesión.");
  }

  const parsed = resubmitOfferSchema.safeParse({
    offerId: formData.get("offerId")?.toString() ?? "",
    resubmitNote: formData.get("resubmitNote")?.toString() ?? "",
  });
  if (!parsed.success) {
    throw new Error("Invalid resubmit payload");
  }

  const offer = await prisma.offer.findUnique({
    where: { id: parsed.data.offerId },
    select: { id: true, agentId: true, status: true },
  });
  if (!offer) throw new Error("Offer not found");
  if (offer.agentId !== session.user.id) {
    throw new UnauthorizedError("AGENT", "No puedes reenviar esta oferta.");
  }
  if (offer.status !== "REJECTED") {
    throw new Error("Only rejected offers can be resubmitted");
  }

  await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offer.id },
      data: {
        status: "PENDING_OPERATIONS_REVIEW",
        operationsNotes: null,
      },
    });

    await tx.offerComment.create({
      data: {
        offerId: offer.id,
        authorId: session.user.id,
        authorRole: session.user.role,
        body: parsed.data.resubmitNote,
      },
    });
  });

  await logOfferStatusChange({
    offerId: offer.id,
    actorId: session.user.id,
    actorType: "agent",
    previousStatus: offer.status,
    newStatus: "PENDING_OPERATIONS_REVIEW",
    metadata: { reason: "resubmitted_by_agent" },
  });

  redirect(`/dashboard/offers/${offer.id}`);
});

