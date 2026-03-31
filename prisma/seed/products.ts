import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

export async function seedPartnersAndProducts() {
  // Partners
  const partners = await Promise.all([
    prisma.partner.upsert({
      where: { code: "AXA" },
      update: {},
      create: {
        name: "AXA Seguros",
        code: "AXA",
        isActive: true,
      },
    }),
    prisma.partner.upsert({
      where: { code: "MAPFRE" },
      update: {},
      create: {
        name: "Mapfre",
        code: "MAPFRE",
        isActive: true,
      },
    }),
  ]);

  const [axa, mapfre] = partners;

  // Products, including consultation fee
  await Promise.all([
    prisma.product.upsert({
      where: { id: "AXA_AUTO_STANDARD" },
      update: {},
      create: {
        id: "AXA_AUTO_STANDARD",
        partnerId: axa.id,
        name: "Auto Terceros",
        description: "Seguro de automóvil terceros básico",
        commissionUpfrontPct: 0.1200,
        feePct: 0.0000,
        isConsultationFee: false,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "MAPFRE_HOME_STANDARD" },
      update: {},
      create: {
        id: "MAPFRE_HOME_STANDARD",
        partnerId: mapfre.id,
        name: "Hogar Completo",
        description: "Seguro de hogar completo",
        commissionUpfrontPct: 0.1500,
        feePct: 0.0000,
        isConsultationFee: false,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "ATLAS_CONSULTA" },
      update: {},
      create: {
        id: "ATLAS_CONSULTA",
        partnerId: axa.id,
        name: "Consulta de Asesoramiento",
        description: "Tarifa de consulta inicial",
        commissionUpfrontPct: 0.0000,
        feePct: 1.0000,
        isConsultationFee: true,
        isActive: true,
      },
    }),
  ]);
}

