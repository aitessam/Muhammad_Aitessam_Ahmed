import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

export function requestTiming(req: Request, res: Response, next: NextFunction): void {
  req.startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(this: Response, ...args: any[]) {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    logger.info('Request completed', {
      requestId: req.requestId,
      userId: req.auth?.sub,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    return originalSend.apply(this, args);
  };
  
  next();
}
