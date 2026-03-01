import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { UnauthorizedError } from '../errors';

const WINDOW_SECONDS = config.auth0.requestTimestampWindowSeconds;
const WINDOW_MS = WINDOW_SECONDS * 1000;

function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const asNumber = parseInt(trimmed, 10);
  if (!Number.isNaN(asNumber)) {
    return asNumber < 1e12 ? asNumber * 1000 : asNumber;
  }
  const asDate = Date.parse(trimmed);
  return Number.isNaN(asDate) ? null : asDate;
}

export function requestTimestamp(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const headerValue = req.headers['x-request-timestamp'];

  if (headerValue === undefined || headerValue === '') {
    next(
      new UnauthorizedError(
        'Missing X-Request-Timestamp header (required for replay protection)'
      )
    );
    return;
  }

  const value =
    typeof headerValue === 'string' ? headerValue : headerValue[0];
  const timestamp = parseTimestamp(value);

  if (timestamp === null) {
    next(
      new UnauthorizedError(
        'Invalid X-Request-Timestamp format (use Unix seconds or ISO 8601)'
      )
    );
    return;
  }

  const now = Date.now();
  const diff = Math.abs(now - timestamp);

  if (diff > WINDOW_MS) {
    next(
      new UnauthorizedError(
        `X-Request-Timestamp must be within ${WINDOW_SECONDS} seconds of server time`
      )
    );
    return;
  }

  next();
}
