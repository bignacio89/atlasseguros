import type { PrismaClient, UserRole } from "@prisma/client";

import { runWithPrismaContext } from "@/lib/prisma-request-context";

export function withRls(prisma: PrismaClient): PrismaClient {
  // Prisma instance is wrapped by request context in prisma-client.ts.
  return prisma;
}

export async function runWithRlsContext<T>(
  prisma: PrismaClient,
  input: { userId: string; role: UserRole },
  fn: () => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_user_id', ${input.userId}, true),
        set_config('app.current_user_role', ${input.role}, true)
    `;

    return runWithPrismaContext(tx as unknown as PrismaClient, fn);
  });
}
