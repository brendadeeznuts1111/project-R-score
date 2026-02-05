/**
 * Validation Middleware
 *
 * Validates request input using Zod schemas and integrates with @fire22/validator
 */

import { z } from 'zod';
import type { AuthenticatedRequest } from './auth.middleware';

export interface ValidatedRequest extends AuthenticatedRequest {
  validatedBody?: any;
  validatedQuery?: any;
  validatedParams?: any;
}

class ValidationError extends Error {
  constructor(
    message: string,
    public details: any,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Parse request body based on content type
 */
async function parseRequestBody(request: Request): Promise<any> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body', {
        error: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
      });
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const data: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  }

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
          content: value,
        };
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  // Try to parse as text
  try {
    const text = await request.text();
    if (text.trim() === '') return {};

    // Try to parse as JSON anyway
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Parse query parameters with proper type coercion
 */
function parseQueryParams(url: URL): Record<string, any> {
  const params: Record<string, any> = {};

  for (const [key, value] of url.searchParams) {
    // Try to convert to appropriate types
    if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else if (value === 'null') {
      params[key] = null;
    } else if (value === '') {
      params[key] = '';
    } else if (!isNaN(Number(value))) {
      params[key] = Number(value);
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Format Zod validation errors for better readability
 */
function formatZodErrors(error: z.ZodError): any {
  return {
    error: 'VALIDATION_FAILED',
    message: 'Request validation failed',
    details: error.errors.map(err => ({
      path: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
      received: 'received' in err ? err.received : undefined,
      expected: 'expected' in err ? err.expected : undefined,
    })),
  };
}

/**
 * Validation middleware for request body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (request: ValidatedRequest): Promise<Response | void> => {
    try {
      const body = await parseRequestBody(request);
      const validated = await schema.parseAsync(body);
      request.validatedBody = validated;
      return;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(formatZodErrors(error)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (error instanceof ValidationError) {
        return new Response(JSON.stringify(error.details), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message || 'Request validation failed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (request: ValidatedRequest): Promise<Response | void> => {
    try {
      const url = new URL(request.url);
      const query = parseQueryParams(url);
      const validated = await schema.parseAsync(query);
      request.validatedQuery = validated;
      return;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(formatZodErrors(error)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: 'QUERY_VALIDATION_ERROR',
          message: error.message || 'Query parameter validation failed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Validation middleware for URL parameters
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return async (request: ValidatedRequest): Promise<Response | void> => {
    try {
      const params = (request as any).params || {};
      const validated = await schema.parseAsync(params);
      request.validatedParams = validated;
      return;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(formatZodErrors(error)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: 'PARAMS_VALIDATION_ERROR',
          message: error.message || 'URL parameter validation failed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Combined validation middleware (backwards compatibility)
 */
export function validate<T extends z.ZodType>(schema: T) {
  return validateBody(schema);
}

/**
 * Validation middleware that validates multiple parts of the request
 */
export function validateRequest(schemas: {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}) {
  return async (request: ValidatedRequest): Promise<Response | void> => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        const body = await parseRequestBody(request);
        request.validatedBody = await schemas.body.parseAsync(body);
      }

      // Validate query if schema provided
      if (schemas.query) {
        const url = new URL(request.url);
        const query = parseQueryParams(url);
        request.validatedQuery = await schemas.query.parseAsync(query);
      }

      // Validate params if schema provided
      if (schemas.params) {
        const params = (request as any).params || {};
        request.validatedParams = await schemas.params.parseAsync(params);
      }

      return;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify(formatZodErrors(error)), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          error: 'REQUEST_VALIDATION_ERROR',
          message: error.message || 'Request validation failed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Fire22-specific validation schemas
 */
export const Fire22CommonSchemas = {
  // Agent ID validation
  AgentID: z
    .string()
    .min(1, 'Agent ID is required')
    .max(20, 'Agent ID must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Agent ID must contain only uppercase letters and numbers'),

  // Customer ID validation
  CustomerID: z
    .string()
    .min(1, 'Customer ID is required')
    .max(20, 'Customer ID must be 20 characters or less'),

  // Pagination parameters
  Pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().min(0).optional(),
  }),

  // Date range parameters
  DateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // Money amount validation
  MoneyAmount: z
    .number()
    .multipleOf(0.01, 'Amount must have at most 2 decimal places')
    .min(0, 'Amount must be positive'),

  // Status validation
  Status: z.enum(['active', 'inactive', 'suspended', 'banned']),

  // Currency validation
  Currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
};

/**
 * Create a validation schema for Fire22 API requests
 */
export function createFire22Schema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

/**
 * Middleware for validating Fire22 API responses
 */
export function validateResponse<T extends z.ZodType>(schema: T) {
  return (response: any): any => {
    try {
      return schema.parse(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Response validation failed:', formatZodErrors(error));
        throw new ValidationError('Invalid response format from Fire22 API', {
          error: 'RESPONSE_VALIDATION_ERROR',
          details: formatZodErrors(error),
        });
      }
      throw error;
    }
  };
}

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Middleware to sanitize all input data
 */
export function sanitize() {
  return async (request: ValidatedRequest): Promise<void> => {
    if (request.validatedBody) {
      request.validatedBody = sanitizeInput(request.validatedBody);
    }
    if (request.validatedQuery) {
      request.validatedQuery = sanitizeInput(request.validatedQuery);
    }
    if (request.validatedParams) {
      request.validatedParams = sanitizeInput(request.validatedParams);
    }
  };
}

export default validate;
