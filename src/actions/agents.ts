"use server";

import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma-client";
import { withRole } from "@/lib/with-role";

const createAgentSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2),
  password: z.string().min(8),
  rankId: z.string().nullable().optional(),
  uplineId: z.string().nullable().optional(),
});

const updateAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  rankId: z.string().nullable().optional(),
  uplineId: z.string().nullable().optional(),
});

const deleteAgentSchema = z.object({
  id: z.string().min(1),
});

export const createAgentAction = withRole("ADMIN", async (formData: FormData) => {
  const parsed = createAgentSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    rankId: formData.get("rankId")?.toString() || null,
    uplineId: formData.get("uplineId")?.toString() || null,
  });

  if (!parsed.success) throw new Error("Invalid agent payload");

  const passwordHash = await hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "AGENT",
      rankId: parsed.data.rankId ?? null,
      uplineId: parsed.data.uplineId ?? null,
    },
  });
});

export const updateAgentAction = withRole("ADMIN", async (formData: FormData) => {
  const parsed = updateAgentSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    rankId: formData.get("rankId")?.toString() || null,
    uplineId: formData.get("uplineId")?.toString() || null,
  });

  if (!parsed.success) throw new Error("Invalid agent payload");

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      rankId: parsed.data.rankId ?? null,
      uplineId: parsed.data.uplineId ?? null,
    },
  });
});

export const deleteAgentAction = withRole("ADMIN", async (formData: FormData) => {
  const parsed = deleteAgentSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
  });

  if (!parsed.success) throw new Error("Invalid agent payload");

  await prisma.user.delete({
    where: { id: parsed.data.id },
  });
});

