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
/**
 * Validation middleware for request body
 */
export declare function validateBody<T extends z.ZodType>(
  schema: T
): (request: ValidatedRequest) => Promise<Response | void>;
/**
 * Validation middleware for query parameters
 */
export declare function validateQuery<T extends z.ZodType>(
  schema: T
): (request: ValidatedRequest) => Promise<Response | void>;
/**
 * Validation middleware for URL parameters
 */
export declare function validateParams<T extends z.ZodType>(
  schema: T
): (request: ValidatedRequest) => Promise<Response | void>;
/**
 * Combined validation middleware (backwards compatibility)
 */
export declare function validate<T extends z.ZodType>(
  schema: T
): (request: ValidatedRequest) => Promise<Response | void>;
/**
 * Validation middleware that validates multiple parts of the request
 */
export declare function validateRequest(schemas: {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}): (request: ValidatedRequest) => Promise<Response | void>;
/**
 * Fire22-specific validation schemas
 */
export declare const Fire22CommonSchemas: {
  AgentID: z.ZodString;
  CustomerID: z.ZodString;
  Pagination: z.ZodObject<
    {
      page: z.ZodDefault<z.ZodNumber>;
      limit: z.ZodDefault<z.ZodNumber>;
      offset: z.ZodOptional<z.ZodNumber>;
    },
    'strip',
    z.ZodTypeAny,
    {
      page: number;
      limit: number;
      offset?: number | undefined;
    },
    {
      page?: number | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    }
  >;
  DateRange: z.ZodObject<
    {
      startDate: z.ZodOptional<z.ZodString>;
      endDate: z.ZodOptional<z.ZodString>;
    },
    'strip',
    z.ZodTypeAny,
    {
      startDate?: string | undefined;
      endDate?: string | undefined;
    },
    {
      startDate?: string | undefined;
      endDate?: string | undefined;
    }
  >;
  MoneyAmount: z.ZodNumber;
  Status: z.ZodEnum<['active', 'inactive', 'suspended', 'banned']>;
  Currency: z.ZodDefault<z.ZodEnum<['USD', 'EUR', 'GBP', 'CAD', 'AUD']>>;
};
/**
 * Create a validation schema for Fire22 API requests
 */
export declare function createFire22Schema<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<
  T,
  'strip',
  z.ZodTypeAny,
  z.objectUtil.addQuestionMarks<z.baseObjectOutputType<T>, any> extends infer T_1
    ? { [k in keyof T_1]: T_1[k] }
    : never,
  z.baseObjectInputType<T> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1] } : never
>;
/**
 * Middleware for validating Fire22 API responses
 */
export declare function validateResponse<T extends z.ZodType>(schema: T): (response: any) => any;
/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export declare function sanitizeInput(data: any): any;
/**
 * Middleware to sanitize all input data
 */
export declare function sanitize(): (request: ValidatedRequest) => Promise<void>;
export default validate;
//# sourceMappingURL=validate.middleware.d.ts.map
