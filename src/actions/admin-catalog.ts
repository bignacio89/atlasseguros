"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma-client";
import { withRole } from "@/lib/with-role";

function buildUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return `${path}?${params.toString()}`;
}

const partnersPath = "/dashboard/admin/partners";
const rateCardsPath = "/dashboard/admin/rate-cards";

const createPartnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40),
});

const updatePartnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40),
});

const idSchema = z.object({
  id: z.string().min(1),
});

const createProductSchema = z.object({
  partnerId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().optional().or(z.literal("")),
  commissionUpfrontPct: z.coerce.number().min(0),
  feePct: z.coerce.number().min(0),
  isConsultationFee: z.enum(["true", "false"]).optional(),
});

const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().optional().or(z.literal("")),
  commissionUpfrontPct: z.coerce.number().min(0),
  feePct: z.coerce.number().min(0),
  isConsultationFee: z.enum(["true", "false"]).optional(),
});

const createRateCardSchema = z.object({
  rankId: z.string().min(1),
  leadType: z.enum(["ATLAS", "STANDARD"]),
  euroPerPoint: z.coerce.number().gt(0),
  effectiveDate: z.string().min(1),
});

export const createPartnerAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = createPartnerSchema.safeParse({
      name: formData.get("name")?.toString() ?? "",
      code: formData.get("code")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.partner.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
      },
    });
    redirect(buildUrl(partnersPath, "success", "Partner creado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo crear el partner.",
      ),
    );
  }
});

export const updatePartnerAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = updatePartnerSchema.safeParse({
      id: formData.get("id")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      code: formData.get("code")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.partner.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, code: parsed.data.code },
    });
    redirect(buildUrl(partnersPath, "success", "Partner actualizado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo actualizar el partner.",
      ),
    );
  }
});

export const togglePartnerActiveAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = idSchema.safeParse({ id: formData.get("id")?.toString() ?? "" });
    if (!parsed.success) throw new Error("Payload inválido");
    const current = await prisma.partner.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, isActive: true },
    });
    if (!current) throw new Error("Partner no encontrado");

    await prisma.partner.update({
      where: { id: current.id },
      data: { isActive: !current.isActive },
    });
    redirect(buildUrl(partnersPath, "success", "Estado de partner actualizado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo actualizar estado.",
      ),
    );
  }
});

export const deletePartnerAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = idSchema.safeParse({ id: formData.get("id")?.toString() ?? "" });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.partner.delete({ where: { id: parsed.data.id } });
    redirect(buildUrl(partnersPath, "success", "Partner eliminado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo eliminar el partner.",
      ),
    );
  }
});

export const createProductAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = createProductSchema.safeParse({
      partnerId: formData.get("partnerId")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? "",
      commissionUpfrontPct: formData.get("commissionUpfrontPct")?.toString() ?? "",
      feePct: formData.get("feePct")?.toString() ?? "",
      isConsultationFee: formData.get("isConsultationFee")?.toString() ?? "false",
    });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.product.create({
      data: {
        partnerId: parsed.data.partnerId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        commissionUpfrontPct: parsed.data.commissionUpfrontPct,
        feePct: parsed.data.feePct,
        isConsultationFee: parsed.data.isConsultationFee === "true",
      },
    });
    redirect(buildUrl(partnersPath, "success", "Producto creado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo crear el producto.",
      ),
    );
  }
});

export const updateProductAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = updateProductSchema.safeParse({
      id: formData.get("id")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? "",
      commissionUpfrontPct: formData.get("commissionUpfrontPct")?.toString() ?? "",
      feePct: formData.get("feePct")?.toString() ?? "",
      isConsultationFee: formData.get("isConsultationFee")?.toString() ?? "false",
    });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.product.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        commissionUpfrontPct: parsed.data.commissionUpfrontPct,
        feePct: parsed.data.feePct,
        isConsultationFee: parsed.data.isConsultationFee === "true",
      },
    });
    redirect(buildUrl(partnersPath, "success", "Producto actualizado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo actualizar el producto.",
      ),
    );
  }
});

export const toggleProductActiveAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = idSchema.safeParse({ id: formData.get("id")?.toString() ?? "" });
    if (!parsed.success) throw new Error("Payload inválido");
    const current = await prisma.product.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, isActive: true },
    });
    if (!current) throw new Error("Producto no encontrado");

    await prisma.product.update({
      where: { id: current.id },
      data: { isActive: !current.isActive },
    });
    redirect(buildUrl(partnersPath, "success", "Estado de producto actualizado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo actualizar estado.",
      ),
    );
  }
});

export const deleteProductAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = idSchema.safeParse({ id: formData.get("id")?.toString() ?? "" });
    if (!parsed.success) throw new Error("Payload inválido");

    await prisma.product.delete({ where: { id: parsed.data.id } });
    redirect(buildUrl(partnersPath, "success", "Producto eliminado."));
  } catch (error) {
    redirect(
      buildUrl(
        partnersPath,
        "error",
        error instanceof Error ? error.message : "No se pudo eliminar el producto.",
      ),
    );
  }
});

export const createRateCardAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = createRateCardSchema.safeParse({
      rankId: formData.get("rankId")?.toString() ?? "",
      leadType: formData.get("leadType")?.toString() ?? "",
      euroPerPoint: formData.get("euroPerPoint")?.toString() ?? "",
      effectiveDate: formData.get("effectiveDate")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido");

    const effectiveDate = new Date(parsed.data.effectiveDate);
    if (Number.isNaN(effectiveDate.getTime())) throw new Error("Fecha efectiva inválida");

    await prisma.rateCard.create({
      data: {
        rankId: parsed.data.rankId,
        leadType: parsed.data.leadType,
        euroPerPoint: parsed.data.euroPerPoint,
        effectiveDate,
      },
    });
    redirect(buildUrl(rateCardsPath, "success", "RateCard creada."));
  } catch (error) {
    redirect(
      buildUrl(
        rateCardsPath,
        "error",
        error instanceof Error ? error.message : "No se pudo crear la RateCard.",
      ),
    );
  }
});

