/**
 * Common API Schema Types
 * Shared schemas used across multiple modules
 */

import { z } from 'zod';

/**
 * Pagination query parameters
 */
export const PaginationQuerySchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  page: z.number().int().min(1).optional().default(1),
});

/**
 * Date range query parameters
 */
export const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

/**
 * Sorting parameters
 */
export const SortingQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Search and filter parameters
 */
export const SearchFilterSchema = z.object({
  query: z.string().optional(),
  search: z.string().optional(),
  filter: z.record(z.any()).optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
});

/**
 * ID parameter schemas
 */
export const AgentIDParamSchema = z.object({
  agentID: z
    .string()
    .min(1, 'Agent ID is required')
    .max(20, 'Agent ID must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Agent ID must contain only uppercase letters and numbers'),
});

export const CustomerIDParamSchema = z.object({
  customerID: z
    .string()
    .min(1, 'Customer ID is required')
    .max(20, 'Customer ID must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Customer ID must contain only uppercase letters and numbers'),
});

export const WagerIDParamSchema = z.object({
  wagerID: z
    .string()
    .min(1, 'Wager ID is required')
    .regex(/^[A-Z0-9-_]+$/, 'Wager ID format is invalid'),
});

/**
 * Common response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    requestId: z.string().optional(),
  });

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
});

/**
 * Success response schema
 */
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().optional(),
  });

/**
 * Paginated response schema
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().int().min(0),
      limit: z.number().int().min(1),
      offset: z.number().int().min(0),
      hasMore: z.boolean(),
      page: z.number().int().min(1).optional(),
      totalPages: z.number().int().min(1).optional(),
    }),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().optional(),
  });

/**
 * Status enumeration schemas
 */
export const CustomerStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending',
  'blocked',
]);
export const WagerStatusSchema = z.enum(['pending', 'completed', 'cancelled', 'settled', 'void']);
export const TransactionStatusSchema = z.enum(['pending', 'completed', 'failed', 'cancelled']);
export const TransactionTypeSchema = z.enum([
  'deposit',
  'withdrawal',
  'transfer',
  'bonus',
  'fee',
  'adjustment',
]);

/**
 * Amount schema with validation
 */
export const AmountSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
});

/**
 * Balance schema
 */
export const BalanceSchema = z.object({
  current: z.number(),
  available: z.number(),
  pending: z.number(),
  creditLimit: z.number().optional(),
  currency: z.string().length(3).default('USD'),
});

/**
 * Contact information schema
 */
export const ContactInfoSchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/)
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Audit fields schema
 */
export const AuditFieldsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().int().min(1).optional(),
});

/**
 * Common query parameters combining multiple schemas
 */
export const CommonQuerySchema = z
  .object({})
  .merge(PaginationQuerySchema)
  .merge(DateRangeQuerySchema)
  .merge(SortingQuerySchema)
  .merge(SearchFilterSchema);

// Export types for TypeScript
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;
export type SortingQuery = z.infer<typeof SortingQuerySchema>;
export type SearchFilter = z.infer<typeof SearchFilterSchema>;
export type AgentIDParam = z.infer<typeof AgentIDParamSchema>;
export type CustomerIDParam = z.infer<typeof CustomerIDParamSchema>;
export type WagerIDParam = z.infer<typeof WagerIDParamSchema>;
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;
export type WagerStatus = z.infer<typeof WagerStatusSchema>;
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type Amount = z.infer<typeof AmountSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type AuditFields = z.infer<typeof AuditFieldsSchema>;
export type CommonQuery = z.infer<typeof CommonQuerySchema>;
