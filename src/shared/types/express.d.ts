import type { Auth0JwtPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: Auth0JwtPayload;
      requestId?: string;
    }
  }
}

export {};
