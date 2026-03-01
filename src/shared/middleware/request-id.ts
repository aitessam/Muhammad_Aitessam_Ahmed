import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestId(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const id = req.headers['x-request-id'];
  req.requestId =
    typeof id === 'string' && id.trim() ? id.trim() : uuidv4();
  next();
}
