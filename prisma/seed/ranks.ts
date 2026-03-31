import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();
const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

export async function seedRanks() {
  const ranks = [
    { name: "FA4", levelOrder: 1 },
    { name: "FA3", levelOrder: 2 },
    { name: "FA2", levelOrder: 3 },
    { name: "FA1", levelOrder: 4 },
    { name: "DN", levelOrder: 5 },
  ];

  for (const rank of ranks) {
    await prisma.rank.upsert({
      where: { name: rank.name },
      update: { levelOrder: rank.levelOrder },
      create: rank,
    });
  }
}

