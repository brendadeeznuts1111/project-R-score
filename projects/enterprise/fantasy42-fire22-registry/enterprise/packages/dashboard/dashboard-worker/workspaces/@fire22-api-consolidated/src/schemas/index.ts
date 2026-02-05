/**
 * Fire22 API Validation Schemas
 *
 * Re-exports all validation schemas from @fire22/validator with additional
 * dashboard-specific schemas
 */

// Re-export all schemas from @fire22/validator
export * from '@fire22/validator/schemas';

// Additional schemas specific to the dashboard API
import { z } from 'zod';

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// Request Schemas
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(100),
  rememberMe: z.boolean().optional(),
});

/**
 * Refresh token request schema
 */
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Agent ID parameter schema
 */
export const AgentIDParamSchema = z.object({
  agentID: z
    .string()
    .min(1, 'Agent ID is required')
    .max(20, 'Agent ID must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Agent ID must contain only uppercase letters and numbers'),
});

/**
 * Customer ID parameter schema
 */
export const CustomerIDParamSchema = z.object({
  customerID: z
    .string()
    .min(1, 'Customer ID is required')
    .max(20, 'Customer ID must be 20 characters or less'),
});

/**
 * Pagination query schema
 */
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .default('1'),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .default('10'),
  offset: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .optional(),
});

/**
 * Date range query schema
 */
export const DateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('weekly'),
});

/**
 * Live wagers request schema
 */
export const GetLiveWagersRequestSchema = z.object({
  agentID: z.string().min(1, 'Agent ID is required'),
});

/**
 * Weekly figures request schema
 */
export const GetWeeklyFiguresRequestSchema = z.object({
  agentID: z.string().min(1, 'Agent ID is required'),
  week: z.string().optional(),
  year: z.string().optional(),
});

/**
 * Agent performance request schema
 */
export const GetAgentPerformanceRequestSchema = z.object({
  agentID: z.string().min(1, 'Agent ID is required'),
  period: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Customer admin request schema
 */
export const GetCustomerAdminRequestSchema = z.object({
  agentID: z.string().min(1, 'Agent ID is required'),
  status: z.enum(['active', 'inactive', 'suspended', 'all']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

/**
 * Customer details query schema
 */
export const GetCustomerDetailsQuerySchema = z.object({
  customerID: z.string().min(1, 'Customer ID is required'),
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// Admin Schemas
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * Settle wager request schema
 */
export const SettleWagerRequestSchema = z.object({
  wagerId: z.string().min(1, 'Wager ID is required'),
  result: z.enum(['win', 'lose', 'push', 'cancelled']),
  amount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Bulk settle request schema
 */
export const BulkSettleRequestSchema = z.object({
  wagers: z
    .array(
      z.object({
        wagerId: z.string().min(1),
        result: z.enum(['win', 'lose', 'push', 'cancelled']),
        amount: z.number().min(0).optional(),
      })
    )
    .min(1, 'At least one wager is required'),
  notes: z.string().max(500).optional(),
});

/**
 * Void wager request schema
 */
export const VoidWagerRequestSchema = z.object({
  wagerId: z.string().min(1, 'Wager ID is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

/**
 * Create customer request schema
 */
export const CreateCustomerRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  agentID: z.string().min(1, 'Agent ID is required'),
  creditLimit: z.number().min(0),
  weeklyLimit: z.number().min(0).optional(),
  phone: z
    .string()
    .regex(/^\+?\d{10,15}$/)
    .optional(),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Process deposit request schema
 */
export const ProcessDepositRequestSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  method: z.enum(['bank_transfer', 'credit_card', 'crypto', 'cash', 'other']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// Financial Schemas
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * Withdrawal request schema
 */
export const WithdrawalRequestSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  method: z.enum(['bank_transfer', 'crypto', 'check', 'other']),
  accountDetails: z
    .object({
      accountNumber: z.string().optional(),
      routingNumber: z.string().optional(),
      cryptoAddress: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Approve withdrawal request schema
 */
export const ApproveWithdrawalRequestSchema = z.object({
  withdrawalId: z.string().min(1, 'Withdrawal ID is required'),
  approverNotes: z.string().max(500).optional(),
});

/**
 * Complete withdrawal request schema
 */
export const CompleteWithdrawalRequestSchema = z.object({
  withdrawalId: z.string().min(1, 'Withdrawal ID is required'),
  transactionHash: z.string().min(1, 'Transaction hash is required').optional(),
  completionNotes: z.string().max(500).optional(),
});

/**
 * Reject withdrawal request schema
 */
export const RejectWithdrawalRequestSchema = z.object({
  withdrawalId: z.string().min(1, 'Withdrawal ID is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// Response Schemas
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * Generic success response schema
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Generic error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false).optional(),
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Login response schema
 */
export const LoginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      role: z.string(),
      level: z.number().int().min(1).max(5),
      permissions: z.array(z.string()),
    }),
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      tokenType: z.literal('Bearer'),
      expiresIn: z.number().int(),
    }),
  }),
  message: z.string(),
});

/**
 * Health check response schema
 */
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  uptime: z.number().min(0).optional(),
  services: z.record(z.string()).optional(),
  performance: z
    .object({
      uptime: z.number().min(0),
      memory: z.any(),
      cpu: z.any(),
    })
    .optional(),
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// Validation Helpers
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===

/**
 * Get schema for a specific endpoint
 */
export function getSchemaForEndpoint(endpoint: string, method: string = 'GET'): z.ZodType | null {
  const schemaMap: Record<string, z.ZodType> = {
    // Auth endpoints
    'POST:/api/auth/login': LoginRequestSchema,
    'POST:/api/auth/refresh': RefreshTokenRequestSchema,

    // Manager endpoints
    'POST:/api/manager/getLiveWagers': GetLiveWagersRequestSchema,
    'POST:/api/manager/getWeeklyFigureByAgent': GetWeeklyFiguresRequestSchema,
    'POST:/api/manager/getAgentPerformance': GetAgentPerformanceRequestSchema,
    'POST:/api/manager/getCustomerAdmin': GetCustomerAdminRequestSchema,
    'GET:/api/manager/getCustomerDetails': GetCustomerDetailsQuerySchema,

    // Admin endpoints
    'POST:/api/admin/settle-wager': SettleWagerRequestSchema,
    'POST:/api/admin/bulk-settle': BulkSettleRequestSchema,
    'POST:/api/admin/void-wager': VoidWagerRequestSchema,
    'POST:/api/admin/create-customer': CreateCustomerRequestSchema,
    'POST:/api/admin/process-deposit': ProcessDepositRequestSchema,

    // Financial endpoints
    'POST:/api/withdrawals/request': WithdrawalRequestSchema,
    'POST:/api/withdrawals/approve': ApproveWithdrawalRequestSchema,
    'POST:/api/withdrawals/complete': CompleteWithdrawalRequestSchema,
    'POST:/api/withdrawals/reject': RejectWithdrawalRequestSchema,
  };

  const key = `${method.toUpperCase()}:${endpoint}`;
  return schemaMap[key] || null;
}

/**
 * Validate request data for an endpoint
 */
export async function validateEndpointRequest(
  endpoint: string,
  method: string,
  data: any
): Promise<any> {
  const schema = getSchemaForEndpoint(endpoint, method);

  if (!schema) {
    return data; // No validation schema defined
  }

  return await schema.parseAsync(data);
}
