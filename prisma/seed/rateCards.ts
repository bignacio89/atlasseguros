import { PrismaClient, LeadType } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

// Seed initial RateCards effective from 2025-01-01 for all ranks and lead types
export async function seedRateCards() {
  const effectiveDate = new Date("2025-01-01T00:00:00.000Z");

  const ranks = await prisma.rank.findMany();
  if (!ranks.length) return;

  const leadTypes: LeadType[] = [LeadType.ATLAS, LeadType.STANDARD];

  // Example base rates – adjust later as needed; no hardcoded business logic elsewhere.
  const baseRates: Record<LeadType, number> = {
    [LeadType.ATLAS]: 60.0,
    [LeadType.STANDARD]: 40.0,
  };

  for (const rank of ranks) {
    for (const leadType of leadTypes) {
      const euroPerPoint = baseRates[leadType];

      await prisma.rateCard.upsert({
        where: {
          rankId_leadType_effectiveDate: {
            rankId: rank.id,
            leadType,
            effectiveDate,
          },
        },
        update: {
          euroPerPoint,
        },
        create: {
          rankId: rank.id,
          leadType,
          euroPerPoint,
          effectiveDate,
        },
      });
    }
  }
}

