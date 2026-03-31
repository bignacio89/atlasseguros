import NextAuth, { type DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

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
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;
        token.role = (user as any).role;
        token.rankId = (user as any).rankId ?? null;
        token.uplineId = (user as any).uplineId ?? null;
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

export const {
  auth,
  signIn,
  signOut,
  handlers: { GET, POST },
} = NextAuth(authConfig);

