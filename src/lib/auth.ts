import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { scryptSync, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma-client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      rankId: string | null;
      uplineId: string | null;
    };
  }

  interface User {
    role: UserRole;
    rankId: string | null;
    uplineId: string | null;
  }
}

export const authConfig = {
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            rankId: true,
            uplineId: true,
          },
        });

        if (!user?.passwordHash) return null;
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        if (isLegacyScryptHash(user.passwordHash)) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              passwordHash: await hash(password, 12),
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rankId: user.rankId,
          uplineId: user.uplineId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.rankId = user.rankId ?? null;
        token.uplineId = user.uplineId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as UserRole;
        session.user.rankId = (token.rankId as string | null) ?? null;
        session.user.uplineId = (token.uplineId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies Parameters<typeof NextAuth>[0];

function isLegacyScryptHash(hashValue: string): boolean {
  const [salt, digest] = hashValue.split(":");
  return Boolean(
    salt &&
      digest &&
      salt.length === 32 &&
      /^[a-f0-9]+$/i.test(salt) &&
      digest.length === 128 &&
      /^[a-f0-9]+$/i.test(digest),
  );
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (isLegacyScryptHash(passwordHash)) {
    const [salt, digest] = passwordHash.split(":");
    if (!salt || !digest) return false;
    const computed = scryptSync(password, salt, 64).toString("hex");
    try {
      return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(digest, "hex"));
    } catch {
      return false;
    }
  }

  return compare(password, passwordHash);
}

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);

