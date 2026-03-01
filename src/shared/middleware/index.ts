import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../logger';

export { asyncHandler } from './async-handler';
export { auth0Jwt } from './auth0-jwt';
export { requestTimestamp } from './request-timestamp';
export { requestTiming } from './request-timing';
export { requireRoles, requireUser, requireAdmin } from './rbac';
export { requestId } from './request-id';
export { requireJsonContentType } from './content-type';
export { requestTimeout, haltOnTimedout } from './timeout';
export {
  authRateLimiter,
  chatRateLimiterByUser,
  chatRateLimiterByIp,
  subscriptionsRateLimiter,
} from './rate-limit';

function getRequestId(req: Request): string | undefined {
  return req.requestId;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = getRequestId(req);

  const payload = (code: string, message: string) => ({
    error: { code, message, ...(requestId && { requestId }) },
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      payload(err.code ?? 'ERROR', err.message)
    );
    return;
  }

  if (
    err instanceof Error &&
    err.name === 'DomainValidationError'
  ) {
    res.status(400).json(
      payload('VALIDATION_ERROR', err.message)
    );
    return;
  }

  if (err === 'timeout' || (err instanceof Error && err.message === 'timeout')) {
    res.status(408).json(
      payload('REQUEST_TIMEOUT', 'Request timeout')
    );
    return;
  }

  logger.error('Unhandled error', { error: err, requestId });

  res.status(500).json(
    payload('INTERNAL_ERROR', 'Internal server error')
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId;
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      ...(requestId && { requestId }),
    },
  });
}
