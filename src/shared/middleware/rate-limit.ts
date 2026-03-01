import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

function rateLimitResponse(req: Request, res: Response, message: string): void {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      requestId: req.requestId,
    },
  });
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) =>
    rateLimitResponse(
      req,
      res,
      'Too many requests. Try again in 15 minutes.'
    ),
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatRateLimiterByUser = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const sub = (req as { auth?: { sub?: string } }).auth?.sub;
    return sub ?? req.ip ?? 'unknown';
  },
  handler: (req, res) =>
    rateLimitResponse(
      req,
      res,
      'Chat limit: 30 requests per minute per user.'
    ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

export const chatRateLimiterByIp = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  handler: (req, res) =>
    rateLimitResponse(
      req,
      res,
      'Chat limit: 100 requests per minute per IP.'
    ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

export const subscriptionsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const sub = (req as { auth?: { sub?: string } }).auth?.sub;
    return sub ?? req.ip ?? 'unknown';
  },
  handler: (req, res) =>
    rateLimitResponse(
      req,
      res,
      'Subscriptions limit: 20 requests per minute.'
    ),
  standardHeaders: true,
  legacyHeaders: false,
});
