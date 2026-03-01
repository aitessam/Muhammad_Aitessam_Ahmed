import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ForbiddenError } from '../errors';
import type { AppRole } from '../types/auth';

const ROLES_CLAIM = config.auth0.rolesClaim;

function getRolesFromPayload(req: Request): string[] {
  const auth = req.auth;
  if (!auth) return [];

  const roles =
    auth[ROLES_CLAIM as keyof typeof auth] ?? auth.roles ?? auth.role;
  if (Array.isArray(roles)) return roles as string[];
  if (typeof roles === 'string') return [roles];
  return [];
}

export function requireRoles(allowedRoles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRoles = getRolesFromPayload(req);

    const hasRole = allowedRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRole) {
      next(
        new ForbiddenError(
          `Insufficient role. Required one of: ${allowedRoles.join(', ')}`
        )
      );
      return;
    }

    next();
  };
}

export const requireUser = requireRoles(['user']);
export const requireAdmin = requireRoles(['admin']);
