"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma-client";
import { claimInvitation } from "@/services/invitation.service";

export async function getInvitationByToken(token: string) {
  const tokenHash = await sha256(token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      rank: true,
      upline: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return invitation;
}

export async function registerFromInvitation(
  prevState: { error?: string } | null,
  formData: FormData,
) {
  const token = formData.get("token")?.toString() ?? "";
  const name = formData.get("name")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!token || !name || !password || !confirmPassword) {
    return { error: "Por favor completa todos los campos." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  try {
    const passwordHash = await hash(password, 10);
    await claimInvitation({ token, name, passwordHash });
  } catch (err: any) {
    return { error: err?.message ?? "No se ha podido completar el registro." };
  }

  redirect("/auth/login");
}

async function sha256(value: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
}

export {};
