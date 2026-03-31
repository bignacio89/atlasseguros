"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { withRole } from "@/lib/with-role";
import { prisma } from "@/lib/prisma-client";

function buildUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({ type, message });
  return `${path}?${params.toString()}`;
}

const createSchema = z.object({
  partnerId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  templateCode: z.string().trim().min(1).max(120),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  templateCode: z.string().trim().min(1).max(120),
});

const idSchema = z.object({
  id: z.string().min(1),
});

const returnPath = "/dashboard/admin/partners";

export const createDocumentTemplateAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = createSchema.safeParse({
      partnerId: formData.get("partnerId")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      templateCode: formData.get("templateCode")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido.");

    await prisma.documentTemplate.create({
      data: {
        partnerId: parsed.data.partnerId,
        name: parsed.data.name,
        templateCode: parsed.data.templateCode,
      },
    });

    redirect(buildUrl(returnPath, "success", "Plantilla creada."));
  } catch (error) {
    redirect(
      buildUrl(
        returnPath,
        "error",
        error instanceof Error ? error.message : "No se pudo crear la plantilla.",
      ),
    );
  }
});

export const updateDocumentTemplateAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = updateSchema.safeParse({
      id: formData.get("id")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      templateCode: formData.get("templateCode")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido.");

    await prisma.documentTemplate.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        templateCode: parsed.data.templateCode,
      },
    });

    redirect(buildUrl(returnPath, "success", "Plantilla actualizada."));
  } catch (error) {
    redirect(
      buildUrl(
        returnPath,
        "error",
        error instanceof Error ? error.message : "No se pudo actualizar la plantilla.",
      ),
    );
  }
});

export const toggleDocumentTemplateActiveAction = withRole(
  "ADMIN",
  async (formData: FormData) => {
    try {
      const parsed = idSchema.safeParse({
        id: formData.get("id")?.toString() ?? "",
      });
      if (!parsed.success) throw new Error("Payload inválido.");

      const current = await prisma.documentTemplate.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, isActive: true },
      });
      if (!current) throw new Error("Plantilla no encontrada.");

      await prisma.documentTemplate.update({
        where: { id: current.id },
        data: { isActive: !current.isActive },
      });

      redirect(buildUrl(returnPath, "success", "Estado de plantilla actualizado."));
    } catch (error) {
      redirect(
        buildUrl(
          returnPath,
          "error",
          error instanceof Error ? error.message : "No se pudo cambiar el estado.",
        ),
      );
    }
  },
);

export const deleteDocumentTemplateAction = withRole("ADMIN", async (formData: FormData) => {
  try {
    const parsed = idSchema.safeParse({
      id: formData.get("id")?.toString() ?? "",
    });
    if (!parsed.success) throw new Error("Payload inválido.");

    await prisma.documentTemplate.delete({
      where: { id: parsed.data.id },
    });

    redirect(buildUrl(returnPath, "success", "Plantilla eliminada."));
  } catch (error) {
    redirect(
      buildUrl(
        returnPath,
        "error",
        error instanceof Error ? error.message : "No se pudo eliminar la plantilla.",
      ),
    );
  }
});

