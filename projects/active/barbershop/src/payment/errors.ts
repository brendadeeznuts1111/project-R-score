/**
 * Error Handling Module
 * Custom error classes with HTTP status codes
 */

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: this.stack } : {}),
    };
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

// 422 Unprocessable Entity
export class ValidationError extends AppError {
  public fields: Record<string, string>;

  constructor(
    message: string = 'Validation Failed',
    fields: Record<string, string> = {}
  ) {
    super(message, 422, 'VALIDATION_ERROR');
    this.fields = fields;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  public retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Too Many Requests', 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

// Redis connection error
export class RedisError extends AppError {
  constructor(message: string = 'Redis connection failed') {
    super(message, 503, 'REDIS_ERROR');
  }
}

// Payment processing error
export class PaymentError extends AppError {
  public paymentId?: string;

  constructor(message: string, paymentId?: string) {
    super(message, 400, 'PAYMENT_ERROR');
    this.paymentId = paymentId;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ...(this.paymentId ? { paymentId: this.paymentId } : {}),
    };
  }
}

// Error handler middleware
export function handleError(error: Error): Response {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'ValidationError') {
    appError = new ValidationError(error.message);
  } else if (error.message?.includes('Redis')) {
    appError = new RedisError(error.message);
  } else {
    appError = new AppError(
      'Internal Server Error',
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (appError instanceof RateLimitError) {
    headers['Retry-After'] = String(appError.retryAfter);
  }

  return new Response(JSON.stringify(appError.toJSON()), {
    status: appError.statusCode,
    headers,
  });
}

// Async handler wrapper
export function asyncHandler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (error) {
      return handleError(error as Error);
    }
  };
}

export default AppError;
