import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";

const prismaContext = new AsyncLocalStorage<PrismaClient>();

export function runWithPrismaContext<T>(prisma: PrismaClient, fn: () => Promise<T>) {
  return prismaContext.run(prisma, fn);
}

export function getPrismaFromContext(): PrismaClient | undefined {
  return prismaContext.getStore();
}

