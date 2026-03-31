"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma-client";
import { claimInvitation, createInvitation } from "@/services/invitation.service";
import { withRole } from "@/lib/with-role";
import { auth } from "@/lib/auth";

export async function getInvitationByToken(token: string) {
  const tokenHash = await sha256(token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) return null;

  const [rank, upline] = await Promise.all([
    invitation.rankId
      ? prisma.rank.findUnique({
          where: { id: invitation.rankId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    invitation.uplineId
      ? prisma.user.findUnique({
          where: { id: invitation.uplineId },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  return { ...invitation, rank, upline };
}

export async function registerFromInvitation(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  const name = formData.get("name")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!token || !name || !password || !confirmPassword) {
    redirect("/auth/register?token=" + encodeURIComponent(token) + "&error=missing");
  }

  if (password !== confirmPassword) {
    redirect("/auth/register?token=" + encodeURIComponent(token) + "&error=password_mismatch");
  }

  try {
    const passwordHash = await hash(password, 10);
    await claimInvitation({ token, name, passwordHash });
  } catch (err: unknown) {
    const code =
      err instanceof Error && "code" in err
        ? encodeURIComponent(String((err as { code?: string }).code ?? "unknown"))
        : "unknown";
    redirect("/auth/register?token=" + encodeURIComponent(token) + `&error=${code}`);
  }

  redirect("/auth/login");
}

const createInvitationSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  role: z.enum(["ADMIN", "OPERATIONS", "AGENT"]),
  rankId: z.string().optional().nullable(),
  uplineId: z.string().optional().nullable(),
});

export const createInvitationAction = withRole("ADMIN", async (formData: FormData) => {
  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
    rankId: formData.get("rankId")?.toString() || null,
    uplineId: formData.get("uplineId")?.toString() || null,
  });

  if (!parsed.success) {
    throw new Error("Invalid invitation payload");
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Missing authenticated user");
  }

  await createInvitation({
    email: parsed.data.email,
    role: parsed.data.role,
    rankId: parsed.data.role === "AGENT" ? parsed.data.rankId ?? null : null,
    uplineId: parsed.data.role === "AGENT" ? parsed.data.uplineId ?? null : null,
    invitedById: session.user.id,
  });
});

async function sha256(value: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
}

export {};
