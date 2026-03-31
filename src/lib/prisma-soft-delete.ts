import type { PrismaClient } from "@prisma/client";

type ExtendedPrisma = PrismaClient;

export function withSoftDelete(prisma: PrismaClient): ExtendedPrisma {
  return prisma.$extends({
    query: {
      lead: {
        findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        count({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
      },
      client: {
        findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        count({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
      },
      offer: {
        findMany({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        findFirst({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
        count({ args, query }) {
          args.where = { ...(args.where ?? {}), deletedAt: null };
          return query(args);
        },
      },
    },
  }) as ExtendedPrisma;
}
