import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withSoftDelete } from "@/lib/prisma-soft-delete";
import { withRls } from "@/lib/prisma-rls";
import { getPrismaFromContext } from "@/lib/prisma-request-context";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg(process.env.DATABASE_URL as string);

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

const extendedPrisma = withRls(withSoftDelete(basePrisma));

export const prisma = new Proxy(extendedPrisma, {
  get(target, prop, receiver) {
    const contextualPrisma = getPrismaFromContext();
    const activeTarget = contextualPrisma ?? target;
    const value = Reflect.get(activeTarget as object, prop, receiver);
    return typeof value === "function" ? value.bind(activeTarget) : value;
  },
}) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

