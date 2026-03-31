import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Require authentication for everything under /dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Additional admin-only protection
    if (
      adminOnlyRoutes.some((p) => pathname.startsWith(p)) &&
      token.role !== "ADMIN"
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

