/**
 * Fire22 API Validation Schemas
 *
 * Re-exports all validation schemas from @fire22/validator with additional
 * dashboard-specific schemas
 */
export * from '@fire22/validator/schemas';
import { z } from 'zod';
/**
 * Login request schema
 */
export declare const LoginRequestSchema: z.ZodObject<
  {
    username: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    username: string;
    password: string;
    rememberMe?: boolean | undefined;
  },
  {
    username: string;
    password: string;
    rememberMe?: boolean | undefined;
  }
>;
/**
 * Refresh token request schema
 */
export declare const RefreshTokenRequestSchema: z.ZodObject<
  {
    refreshToken: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    refreshToken: string;
  },
  {
    refreshToken: string;
  }
>;
/**
 * Agent ID parameter schema
 */
export declare const AgentIDParamSchema: z.ZodObject<
  {
    agentID: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    agentID: string;
  },
  {
    agentID: string;
  }
>;
/**
 * Customer ID parameter schema
 */
export declare const CustomerIDParamSchema: z.ZodObject<
  {
    customerID: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    customerID: string;
  },
  {
    customerID: string;
  }
>;
/**
 * Pagination query schema
 */
export declare const PaginationQuerySchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    offset: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
    offset?: number | undefined;
  },
  {
    page?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
  }
>;
/**
 * Date range query schema
 */
export declare const DateRangeQuerySchema: z.ZodObject<
  {
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    period: z.ZodDefault<z.ZodEnum<['daily', 'weekly', 'monthly', 'yearly']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string | undefined;
    endDate?: string | undefined;
  },
  {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }
>;
/**
 * Live wagers request schema
 */
export declare const GetLiveWagersRequestSchema: z.ZodObject<
  {
    agentID: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    agentID: string;
  },
  {
    agentID: string;
  }
>;
/**
 * Weekly figures request schema
 */
export declare const GetWeeklyFiguresRequestSchema: z.ZodObject<
  {
    agentID: z.ZodString;
    week: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    agentID: string;
    week?: string | undefined;
    year?: string | undefined;
  },
  {
    agentID: string;
    week?: string | undefined;
    year?: string | undefined;
  }
>;
/**
 * Agent performance request schema
 */
export declare const GetAgentPerformanceRequestSchema: z.ZodObject<
  {
    agentID: z.ZodString;
    period: z.ZodDefault<z.ZodEnum<['daily', 'weekly', 'monthly']>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    agentID: string;
    period: 'daily' | 'weekly' | 'monthly';
    startDate?: string | undefined;
    endDate?: string | undefined;
  },
  {
    agentID: string;
    period?: 'daily' | 'weekly' | 'monthly' | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }
>;
/**
 * Customer admin request schema
 */
export declare const GetCustomerAdminRequestSchema: z.ZodObject<
  {
    agentID: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<['active', 'inactive', 'suspended', 'all']>>;
    limit: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    agentID: string;
    status?: 'active' | 'inactive' | 'suspended' | 'all' | undefined;
    limit?: number | undefined;
  },
  {
    agentID: string;
    status?: 'active' | 'inactive' | 'suspended' | 'all' | undefined;
    limit?: number | undefined;
  }
>;
/**
 * Customer details query schema
 */
export declare const GetCustomerDetailsQuerySchema: z.ZodObject<
  {
    customerID: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    customerID: string;
  },
  {
    customerID: string;
  }
>;
/**
 * Settle wager request schema
 */
export declare const SettleWagerRequestSchema: z.ZodObject<
  {
    wagerId: z.ZodString;
    result: z.ZodEnum<['win', 'lose', 'push', 'cancelled']>;
    amount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    result: 'push' | 'cancelled' | 'win' | 'lose';
    wagerId: string;
    notes?: string | undefined;
    amount?: number | undefined;
  },
  {
    result: 'push' | 'cancelled' | 'win' | 'lose';
    wagerId: string;
    notes?: string | undefined;
    amount?: number | undefined;
  }
>;
/**
 * Bulk settle request schema
 */
export declare const BulkSettleRequestSchema: z.ZodObject<
  {
    wagers: z.ZodArray<
      z.ZodObject<
        {
          wagerId: z.ZodString;
          result: z.ZodEnum<['win', 'lose', 'push', 'cancelled']>;
          amount: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          result: 'push' | 'cancelled' | 'win' | 'lose';
          wagerId: string;
          amount?: number | undefined;
        },
        {
          result: 'push' | 'cancelled' | 'win' | 'lose';
          wagerId: string;
          amount?: number | undefined;
        }
      >,
      'many'
    >;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    wagers: {
      result: 'push' | 'cancelled' | 'win' | 'lose';
      wagerId: string;
      amount?: number | undefined;
    }[];
    notes?: string | undefined;
  },
  {
    wagers: {
      result: 'push' | 'cancelled' | 'win' | 'lose';
      wagerId: string;
      amount?: number | undefined;
    }[];
    notes?: string | undefined;
  }
>;
/**
 * Void wager request schema
 */
export declare const VoidWagerRequestSchema: z.ZodObject<
  {
    wagerId: z.ZodString;
    reason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    wagerId: string;
    reason: string;
  },
  {
    wagerId: string;
    reason: string;
  }
>;
/**
 * Create customer request schema
 */
export declare const CreateCustomerRequestSchema: z.ZodObject<
  {
    name: z.ZodString;
    agentID: z.ZodString;
    creditLimit: z.ZodNumber;
    weeklyLimit: z.ZodOptional<z.ZodNumber>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    agentID: string;
    creditLimit: number;
    weeklyLimit?: number | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    notes?: string | undefined;
  },
  {
    name: string;
    agentID: string;
    creditLimit: number;
    weeklyLimit?: number | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    notes?: string | undefined;
  }
>;
/**
 * Process deposit request schema
 */
export declare const ProcessDepositRequestSchema: z.ZodObject<
  {
    customerId: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodEnum<['bank_transfer', 'credit_card', 'crypto', 'cash', 'other']>;
    reference: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    amount: number;
    method: 'bank_transfer' | 'credit_card' | 'crypto' | 'cash' | 'other';
    customerId: string;
    notes?: string | undefined;
    reference?: string | undefined;
  },
  {
    amount: number;
    method: 'bank_transfer' | 'credit_card' | 'crypto' | 'cash' | 'other';
    customerId: string;
    notes?: string | undefined;
    reference?: string | undefined;
  }
>;
/**
 * Withdrawal request schema
 */
export declare const WithdrawalRequestSchema: z.ZodObject<
  {
    customerId: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodEnum<['bank_transfer', 'crypto', 'check', 'other']>;
    accountDetails: z.ZodOptional<
      z.ZodObject<
        {
          accountNumber: z.ZodOptional<z.ZodString>;
          routingNumber: z.ZodOptional<z.ZodString>;
          cryptoAddress: z.ZodOptional<z.ZodString>;
          bankName: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          accountNumber?: string | undefined;
          routingNumber?: string | undefined;
          cryptoAddress?: string | undefined;
          bankName?: string | undefined;
        },
        {
          accountNumber?: string | undefined;
          routingNumber?: string | undefined;
          cryptoAddress?: string | undefined;
          bankName?: string | undefined;
        }
      >
    >;
    notes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    amount: number;
    method: 'bank_transfer' | 'crypto' | 'other' | 'check';
    customerId: string;
    notes?: string | undefined;
    accountDetails?:
      | {
          accountNumber?: string | undefined;
          routingNumber?: string | undefined;
          cryptoAddress?: string | undefined;
          bankName?: string | undefined;
        }
      | undefined;
  },
  {
    amount: number;
    method: 'bank_transfer' | 'crypto' | 'other' | 'check';
    customerId: string;
    notes?: string | undefined;
    accountDetails?:
      | {
          accountNumber?: string | undefined;
          routingNumber?: string | undefined;
          cryptoAddress?: string | undefined;
          bankName?: string | undefined;
        }
      | undefined;
  }
>;
/**
 * Approve withdrawal request schema
 */
export declare const ApproveWithdrawalRequestSchema: z.ZodObject<
  {
    withdrawalId: z.ZodString;
    approverNotes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    withdrawalId: string;
    approverNotes?: string | undefined;
  },
  {
    withdrawalId: string;
    approverNotes?: string | undefined;
  }
>;
/**
 * Complete withdrawal request schema
 */
export declare const CompleteWithdrawalRequestSchema: z.ZodObject<
  {
    withdrawalId: z.ZodString;
    transactionHash: z.ZodOptional<z.ZodString>;
    completionNotes: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    withdrawalId: string;
    transactionHash?: string | undefined;
    completionNotes?: string | undefined;
  },
  {
    withdrawalId: string;
    transactionHash?: string | undefined;
    completionNotes?: string | undefined;
  }
>;
/**
 * Reject withdrawal request schema
 */
export declare const RejectWithdrawalRequestSchema: z.ZodObject<
  {
    withdrawalId: z.ZodString;
    reason: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    reason: string;
    withdrawalId: string;
  },
  {
    reason: string;
    withdrawalId: string;
  }
>;
/**
 * Generic success response schema
 */
export declare const SuccessResponseSchema: z.ZodObject<
  {
    success: z.ZodLiteral<true>;
    message: z.ZodString;
    timestamp: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    message: string;
    success: true;
    timestamp?: string | undefined;
  },
  {
    message: string;
    success: true;
    timestamp?: string | undefined;
  }
>;
/**
 * Generic error response schema
 */
export declare const ErrorResponseSchema: z.ZodObject<
  {
    success: z.ZodOptional<z.ZodLiteral<false>>;
    error: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodAny>;
    timestamp: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    message: string;
    error: string;
    success?: false | undefined;
    timestamp?: string | undefined;
    details?: any;
  },
  {
    message: string;
    error: string;
    success?: false | undefined;
    timestamp?: string | undefined;
    details?: any;
  }
>;
/**
 * Login response schema
 */
export declare const LoginResponseSchema: z.ZodObject<
  {
    success: z.ZodLiteral<true>;
    data: z.ZodObject<
      {
        user: z.ZodObject<
          {
            id: z.ZodString;
            username: z.ZodString;
            role: z.ZodString;
            level: z.ZodNumber;
            permissions: z.ZodArray<z.ZodString, 'many'>;
          },
          'strip',
          z.ZodTypeAny,
          {
            level: number;
            id: string;
            role: string;
            permissions: string[];
            username: string;
          },
          {
            level: number;
            id: string;
            role: string;
            permissions: string[];
            username: string;
          }
        >;
        tokens: z.ZodObject<
          {
            accessToken: z.ZodString;
            refreshToken: z.ZodString;
            tokenType: z.ZodLiteral<'Bearer'>;
            expiresIn: z.ZodNumber;
          },
          'strip',
          z.ZodTypeAny,
          {
            refreshToken: string;
            accessToken: string;
            tokenType: 'Bearer';
            expiresIn: number;
          },
          {
            refreshToken: string;
            accessToken: string;
            tokenType: 'Bearer';
            expiresIn: number;
          }
        >;
      },
      'strip',
      z.ZodTypeAny,
      {
        user: {
          level: number;
          id: string;
          role: string;
          permissions: string[];
          username: string;
        };
        tokens: {
          refreshToken: string;
          accessToken: string;
          tokenType: 'Bearer';
          expiresIn: number;
        };
      },
      {
        user: {
          level: number;
          id: string;
          role: string;
          permissions: string[];
          username: string;
        };
        tokens: {
          refreshToken: string;
          accessToken: string;
          tokenType: 'Bearer';
          expiresIn: number;
        };
      }
    >;
    message: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    message: string;
    success: true;
    data: {
      user: {
        level: number;
        id: string;
        role: string;
        permissions: string[];
        username: string;
      };
      tokens: {
        refreshToken: string;
        accessToken: string;
        tokenType: 'Bearer';
        expiresIn: number;
      };
    };
  },
  {
    message: string;
    success: true;
    data: {
      user: {
        level: number;
        id: string;
        role: string;
        permissions: string[];
        username: string;
      };
      tokens: {
        refreshToken: string;
        accessToken: string;
        tokenType: 'Bearer';
        expiresIn: number;
      };
    };
  }
>;
/**
 * Health check response schema
 */
export declare const HealthResponseSchema: z.ZodObject<
  {
    status: z.ZodEnum<['healthy', 'unhealthy', 'degraded']>;
    timestamp: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    uptime: z.ZodOptional<z.ZodNumber>;
    services: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    performance: z.ZodOptional<
      z.ZodObject<
        {
          uptime: z.ZodNumber;
          memory: z.ZodAny;
          cpu: z.ZodAny;
        },
        'strip',
        z.ZodTypeAny,
        {
          uptime: number;
          memory?: any;
          cpu?: any;
        },
        {
          uptime: number;
          memory?: any;
          cpu?: any;
        }
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version?: string | undefined;
    uptime?: number | undefined;
    services?: Record<string, string> | undefined;
    performance?:
      | {
          uptime: number;
          memory?: any;
          cpu?: any;
        }
      | undefined;
  },
  {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version?: string | undefined;
    uptime?: number | undefined;
    services?: Record<string, string> | undefined;
    performance?:
      | {
          uptime: number;
          memory?: any;
          cpu?: any;
        }
      | undefined;
  }
>;
/**
 * Get schema for a specific endpoint
 */
export declare function getSchemaForEndpoint(endpoint: string, method?: string): z.ZodType | null;
/**
 * Validate request data for an endpoint
 */
export declare function validateEndpointRequest(
  endpoint: string,
  method: string,
  data: any
): Promise<any>;
//# sourceMappingURL=index.d.ts.map
