import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const adminOnlyRoutes = ["/dashboard/admin"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public auth routes remain unguarded
  if (
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  // Require authentication for everything under /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Additional admin-only protection
    if (
      adminOnlyRoutes.some((p) => pathname.startsWith(p)) &&
      session.user.role !== "ADMIN"
    ) {
      const forbiddenUrl = new URL("/403", request.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/api/auth/:path*"],
};

