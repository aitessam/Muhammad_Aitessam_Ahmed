import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors';

const JSON_CONTENT = 'application/json';

function isJsonContentType(header: string | undefined): boolean {
  if (!header) return false;
  const value = header.split(';')[0]?.trim().toLowerCase();
  return value === JSON_CONTENT;
}

export function requireJsonContentType(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
    next();
    return;
  }

  if (req.is('application/json')) {
    next();
    return;
  }

  const contentType = req.headers['content-type'];
  if (isJsonContentType(contentType)) {
    next();
    return;
  }

  next(
    new BadRequestError(
      'Content-Type must be application/json',
      'INVALID_CONTENT_TYPE'
    )
  );
}
