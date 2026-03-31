import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
});

// Simple password hash helper using Node crypto scrypt.
// In production you may replace this with bcrypt/argon2, but for seeding
// we just need a secure one-way hash, never storing the raw password again.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export async function seedInitialAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@atlasseguros.es";
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? "Moncho89";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = hashPassword(password);

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

