import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../types/api-types';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  const errorResponse: ErrorResponse = {
    success: false,
    data: null,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: isProduction && statusCode === 500
        ? 'An internal server error occurred'
        : error.message || 'An error occurred',
      details: isProduction ? undefined : error.details || error.stack
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
}
