import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withSoftDelete } from "@/lib/prisma-soft-delete";
import { withRls } from "@/lib/prisma-rls";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg(process.env.DATABASE_URL as string);

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

export const prisma = withRls(withSoftDelete(basePrisma));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

