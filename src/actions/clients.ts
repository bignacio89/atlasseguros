"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-client";
import { withRole, UnauthorizedError } from "@/lib/with-role";

export const archiveClientAction = withRole(
  ["ADMIN", "OPERATIONS", "AGENT"],
  async (formData: FormData) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError(
        ["ADMIN", "OPERATIONS", "AGENT"],
        "Debes iniciar sesión.",
      );
    }

    const clientId = formData.get("clientId")?.toString() ?? "";
    if (!clientId) throw new Error("Missing clientId");

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, agentId: true, deletedAt: true },
    });
    if (!client) throw new Error("Client not found");
    if (client.deletedAt) {
      redirect("/dashboard/clients");
    }

    if (session.user.role === "AGENT" && client.agentId !== session.user.id) {
      throw new UnauthorizedError("AGENT", "No puedes archivar este cliente.");
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { deletedAt: new Date() },
    });

    redirect("/dashboard/clients");
  },
);
