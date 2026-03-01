import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config';
import { UnauthorizedError } from '../errors';
import type { Auth0JwtPayload } from '../types/auth';

const AUTH0_DOMAIN = config.auth0.domain;
const AUTH0_AUDIENCE = config.auth0.audience;
const AUTH0_ISSUER = config.auth0.issuer;
const JWKS_URI =
  config.auth0.jwksUri ||
  (AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '')}/.well-known/jwks.json` : '');

const jwks = JWKS_URI
  ? jwksClient({
      jwksUri: JWKS_URI,
      cache: true,
      cacheMaxAge: 600000,
      rateLimit: true,
    })
  : null;

function getSigningKey(
  header: jwt.JwtHeader
): Promise<{ getPublicKey: () => string }> {
  if (!jwks) return Promise.reject(new Error('JWKS client not configured'));

  return new Promise((resolve, reject) => {
    const kid = header.kid;
    if (!kid) {
      reject(new Error('JWT header missing kid'));
      return;
    }
    jwks.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      if (!key) {
        reject(new Error('Signing key not found'));
        return;
      }
      resolve(key);
    });
  });
}

export function auth0Jwt(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!JWKS_URI || !jwks) {
    next(new UnauthorizedError('Auth0 is not configured'));
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    next(new UnauthorizedError('Missing or invalid Authorization header'));
    return;
  }

  jwt.verify(
    token,
    (header: jwt.JwtHeader, callback: jwt.SignatureVerificationCallback) => {
      getSigningKey(header)
        .then((key) => {
          const signingKey = key.getPublicKey();
          callback(null, signingKey);
        })
        .catch((err) => callback(err as Error));
    },
    {
      algorithms: ['RS256'],
      issuer: AUTH0_ISSUER || undefined,
      audience: AUTH0_AUDIENCE || undefined,
      complete: false,
    },
    (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          next(new UnauthorizedError('Token expired'));
          return;
        }
        if (err.name === 'JsonWebTokenError') {
          next(new UnauthorizedError('Invalid token'));
          return;
        }
        next(new UnauthorizedError(err.message));
        return;
      }

      const payload = decoded as Auth0JwtPayload;

      if (AUTH0_ISSUER && payload.iss !== AUTH0_ISSUER) {
        next(new UnauthorizedError('Invalid issuer'));
        return;
      }

      const aud = payload.aud;
      const validAud =
        typeof aud === 'string'
          ? aud === AUTH0_AUDIENCE
          : Array.isArray(aud) && AUTH0_AUDIENCE && aud.includes(AUTH0_AUDIENCE);
      if (AUTH0_AUDIENCE && !validAud) {
        next(new UnauthorizedError('Invalid audience'));
        return;
      }

      req.auth = payload;
      next();
    }
  );
}
