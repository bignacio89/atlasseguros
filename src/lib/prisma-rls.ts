import type { PrismaClient } from "@prisma/client";

export function withRls(prisma: PrismaClient): PrismaClient {
  // Wiring placeholder for Task 0.
  // Future iterations should set app.current_user_id per request.
  return prisma;
}
