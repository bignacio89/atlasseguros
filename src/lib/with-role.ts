import type { UserRole } from "@prisma/client";

export class UnauthorizedError extends Error {
  code = "UNAUTHORIZED" as const;
  requiredRole: UserRole | UserRole[];

  constructor(requiredRole: UserRole | UserRole[], message?: string) {
    super(
      message ??
        "No tienes permisos para acceder a este recurso.",
    );
    this.requiredRole = requiredRole;
  }
}

export function withRole<T extends (...args: any[]) => Promise<any>>(
  requiredRole: UserRole | UserRole[],
  handler: T,
) {
  const roles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  return (async (...args: Parameters<T>) => {
    const session = await import("@/lib/auth").then((m) => m.auth());

    if (!session?.user) {
      throw new UnauthorizedError(roles, "Debes iniciar sesión.");
    }

    if (!roles.includes(session.user.role)) {
      throw new UnauthorizedError(
        roles,
        "No tienes permisos para realizar esta acción.",
      );
    }

    return handler(...args);
  }) as T;
}

