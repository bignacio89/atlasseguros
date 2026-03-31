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

export function withRole<TArgs extends unknown[], TResult>(
  requiredRole: UserRole | UserRole[],
  handler: (...args: TArgs) => Promise<TResult>,
) {
  const roles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  return (async (...args: TArgs) => {
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
  }) as (...args: TArgs) => Promise<TResult>;
}

