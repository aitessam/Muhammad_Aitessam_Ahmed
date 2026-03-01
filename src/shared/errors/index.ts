export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code ?? 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code?: string) {
    super(message, 400, code ?? 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code ?? 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, 403, code ?? 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code?: string) {
    super(message, 409, code ?? 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class QuotaExhaustedError extends AppError {
  constructor(
    message: string = 'Message quota exhausted. Free tier: 3/month. Upgrade for more.',
    code?: string
  ) {
    super(message, 429, code ?? 'QUOTA_EXHAUSTED');
    this.name = 'QuotaExhaustedError';
  }
}

export class RequestTimeoutError extends AppError {
  constructor(message: string = 'Request timeout', code?: string) {
    super(message, 408, code ?? 'REQUEST_TIMEOUT');
    this.name = 'RequestTimeoutError';
  }
}
