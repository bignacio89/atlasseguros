import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

export async function seedInitialAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@atlasseguros.es";
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? "Moncho89";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: "AtlasSeguros Admin",
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

    console.log(
    `Seeded initial admin user:\n  email: ${email}\n  password: (from SEED_ADMIN_PASSWORD)`,
  );
}

