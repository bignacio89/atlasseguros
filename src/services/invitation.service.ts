import crypto from "crypto";
import { addHours, isAfter } from "date-fns";

import { prisma } from "@/lib/prisma-client";
import { resend, RESEND_FROM_ADDRESS } from "@/lib/resend";
import { InvitationEmail } from "@/emails/invitation";
import type { InvitationStatus, UserRole } from "@prisma/client";

type CreateInvitationInput = {
  email: string;
  role: UserRole;
  rankId?: string | null;
  uplineId?: string | null;
  invitedById: string;
};

export async function createInvitation(input: CreateInvitationInput) {
  const { email, role, rankId, uplineId, invitedById } = input;

  // Raw token sent to user; only its SHA-256 hash stored in DB.
  const rawToken = crypto.randomUUID();
  const tokenHash = sha256(rawToken);

  const expiresAt = addHours(new Date(), 48);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      rankId: role === "AGENT" ? rankId ?? null : null,
      uplineId: role === "AGENT" ? uplineId ?? null : null,
      tokenHash,
      invitedById,
      expiresAt,
    },
  });

  if (resend && RESEND_FROM_ADDRESS) {
    const registerUrl = `https://crm.atlasseguros.es/auth/register?token=${rawToken}`;

    await resend.emails.send({
      from: RESEND_FROM_ADDRESS,
      to: invitation.email,
      subject: "Invitación a AtlasSeguros CRM",
      react: InvitationEmail({
        inviteeEmail: invitation.email,
        registerUrl,
      }),
    });
  }

  return {
    invitation,
    token: rawToken,
  };
}

type ClaimInvitationInput = {
  token: string;
  name: string;
  passwordHash: string;
};

export async function claimInvitation(input: ClaimInvitationInput) {
  const { token, name, passwordHash } = input;
  const tokenHash = sha256(token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    throw new InvitationError("INVALID_TOKEN", "Invitation token is invalid.");
  }

  if (invitation.status !== "PENDING") {
    throw new InvitationError(
      "ALREADY_CLAIMED",
      "This invitation has already been claimed or expired.",
    );
  }

  if (isAfter(new Date(), invitation.expiresAt)) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new InvitationError("EXPIRED", "Invitation has expired.");
  }

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: invitation.email,
        name,
        passwordHash,
        role: invitation.role,
        rankId: invitation.rankId,
        uplineId: invitation.uplineId,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "CLAIMED" satisfies InvitationStatus,
        claimedAt: new Date(),
      },
    });

    return createdUser;
  });

  return user;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export class InvitationError extends Error {
  code:
    | "INVALID_TOKEN"
    | "ALREADY_CLAIMED"
    | "EXPIRED";

  constructor(
    code: InvitationError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

