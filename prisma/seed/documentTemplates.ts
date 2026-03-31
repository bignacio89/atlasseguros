import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

/**
 * Seed initial DocumentTemplates so the app can list signable documents per partner.
 *
 * Note: `templateCode` is the Signaturit template ID. In this repo, Task 7 is expected
 * to wire real Signaturit template IDs; for now we seed deterministic placeholder codes
 * that are guaranteed unique per partner.
 */
export async function seedDocumentTemplates() {
  const partners = await prisma.partner.findMany();
  if (!partners.length) return;

  // Placeholder template codes; replace with real Signaturit IDs in Task 7.
  const templatesByType = [
    { nameSuffix: "Contrato", templateSuffix: "CONTRATO" },
    { nameSuffix: "Consulta", templateSuffix: "CONSULTA" },
  ] as const;

  for (const partner of partners) {
    for (const t of templatesByType) {
      await prisma.documentTemplate.upsert({
        where: { templateCode: `${partner.code}_${t.templateSuffix}` },
        update: {
          name: `${partner.name} - ${t.nameSuffix}`,
          partnerId: partner.id,
          isActive: true,
        },
        create: {
          partnerId: partner.id,
          name: `${partner.name} - ${t.nameSuffix}`,
          templateCode: `${partner.code}_${t.templateSuffix}`,
          isActive: true,
        },
      });
    }
  }
}

