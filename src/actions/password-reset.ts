"use server";

import { addHours, isAfter } from "date-fns";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma-client";
import { resend, RESEND_FROM_ADDRESS } from "@/lib/resend";
import { PasswordResetEmail } from "@/emails/password-reset";

export async function requestPasswordReset(
  _prevState: { success?: boolean } | null,
  formData: FormData,
) {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!email) {
    return { success: true };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && resend && RESEND_FROM_ADDRESS) {
    const crypto = await import("crypto");
    const rawToken = crypto.randomUUID();
    const tokenHash = sha256(rawToken, crypto);

    const expiresAt = addHours(new Date(), 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = `https://crm.atlasseguros.es/auth/reset-password?token=${rawToken}`;

    await resend.emails.send({
      from: RESEND_FROM_ADDRESS,
      to: user.email,
      subject: "Restablecer contraseña - AtlasSeguros CRM",
      react: PasswordResetEmail({ resetUrl }),
    });
  }

  // Always report success to avoid email enumeration.
  return { success: true };
}

export async function resetPassword(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const token = formData.get("token")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!token || !password || !confirmPassword) {
    return { error: "Por favor completa todos los campos." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const crypto = await import("crypto");
  const tokenHash = sha256(token, crypto);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
    },
  });

  if (!user || !user.passwordResetExpiresAt) {
    return { error: "El enlace de restablecimiento no es válido o ha expirado." };
  }

  if (isAfter(new Date(), user.passwordResetExpiresAt)) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { error: "El enlace de restablecimiento ha expirado." };
  }

  const passwordHash = await hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });

  return { success: true };
}

function sha256(
  value: string,
  crypto: typeof import("crypto"),
): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

