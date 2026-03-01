import type { Request, Response, NextFunction } from 'express';
import timeout from 'connect-timeout';
import { config } from '../config';
import { RequestTimeoutError } from '../errors';

const ms = config.security.requestTimeoutMs;

export const requestTimeout = timeout(`${ms}ms`);

export function haltOnTimedout(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.timedout) {
    next(
      new RequestTimeoutError(
        `Request timeout after ${ms / 1000}s`
      )
    );
  } else {
    next();
  }
}
