/**
 * Financial Schemas
 * Payment, transaction, and financial operation validation schemas
 */

import { z } from 'zod';
import { TransactionTypeSchema, TransactionStatusSchema } from '../common';

/**
 * Transaction item schema
 */
export const TransactionItemSchema = z.object({
  id: z.string(),
  customerID: z.string(),
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().optional(),
  reference: z.string().optional(),
  paymentMethod: z.string().optional(),
  gateway: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  fee: z.number().min(0).optional(),
  netAmount: z.number().optional(),
  createdAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Transaction query schema
 */
export const TransactionQuerySchema = z.object({
  customerID: z.string().optional(),
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusSchema.optional(),
  paymentMethod: z.string().optional(),
  amountMin: z.number().min(0).optional(),
  amountMax: z.number().max(1000000).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Transaction response schema
 */
export const TransactionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    transactions: z.array(TransactionItemSchema),
    total: z.number().int().min(0),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Payment method schema
 */
export const PaymentMethodSchema = z.object({
  id: z.string(),
  type: z.enum([
    'credit_card',
    'debit_card',
    'bank_account',
    'paypal',
    'venmo',
    'cashapp',
    'zelle',
    'crypto',
  ]),
  name: z.string(),
  lastFour: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  expiryDate: z
    .string()
    .regex(/^\d{2}\/\d{2}$/)
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Deposit request schema
 */
export const DepositRequestSchema = z.object({
  customerID: z.string(),
  amount: z.number().positive().max(10000),
  currency: z.string().length(3).default('USD'),
  paymentMethodId: z.string(),
  description: z.string().max(200).optional(),
  reference: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Deposit response schema
 */
export const DepositResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    transactionId: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: TransactionStatusSchema,
    estimatedCompletion: z.string().datetime().optional(),
    gatewayTransactionId: z.string().optional(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Withdrawal request schema
 */
export const WithdrawalRequestSchema = z.object({
  customerID: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  paymentMethodId: z.string(),
  description: z.string().max(200).optional(),
  priority: z.enum(['standard', 'express', 'urgent']).default('standard'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Withdrawal response schema
 */
export const WithdrawalResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    transactionId: z.string(),
    amount: z.number(),
    currency: z.string(),
    fee: z.number(),
    netAmount: z.number(),
    status: TransactionStatusSchema,
    estimatedCompletion: z.string().datetime().optional(),
    gatewayTransactionId: z.string().optional(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Transfer request schema
 */
export const TransferRequestSchema = z.object({
  fromCustomerID: z.string(),
  toCustomerID: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(200).optional(),
  transferType: z.enum(['instant', 'scheduled', 'recurring']).default('instant'),
  scheduledDate: z.string().datetime().optional(),
  recurring: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      endDate: z.string().datetime().optional(),
      maxOccurrences: z.number().int().positive().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Transfer response schema
 */
export const TransferResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    transactionId: z.string(),
    fromCustomerID: z.string(),
    toCustomerID: z.string(),
    amount: z.number(),
    currency: z.string(),
    fee: z.number(),
    netAmount: z.number(),
    status: TransactionStatusSchema,
    transferType: z.string(),
    scheduledDate: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Balance inquiry schema
 */
export const BalanceInquirySchema = z.object({
  customerID: z.string(),
  includePending: z.boolean().default(true),
  includeCreditLimit: z.boolean().default(true),
});

/**
 * Balance response schema
 */
export const BalanceResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    customerID: z.string(),
    currentBalance: z.number(),
    availableBalance: z.number(),
    pendingBalance: z.number(),
    creditLimit: z.number().optional(),
    currency: z.string().length(3).default('USD'),
    lastUpdated: z.string().datetime(),
    overdraftProtection: z.boolean().optional(),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Transaction summary schema
 */
export const TransactionSummarySchema = z.object({
  customerID: z.string(),
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Transaction summary response
 */
export const TransactionSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    customerID: z.string(),
    period: z.string(),
    summary: z.object({
      totalDeposits: z.number(),
      totalWithdrawals: z.number(),
      totalTransfers: z.number(),
      totalFees: z.number(),
      netFlow: z.number(),
      transactionCount: z.number(),
      averageTransaction: z.number(),
      largestTransaction: z.number(),
    }),
    breakdown: z.object({
      deposits: z.array(TransactionItemSchema),
      withdrawals: z.array(TransactionItemSchema),
      transfers: z.array(TransactionItemSchema),
      fees: z.array(TransactionItemSchema),
    }),
  }),
  timestamp: z.string().datetime(),
});

/**
 * Payment method management schemas
 */
export const AddPaymentMethodSchema = z.object({
  customerID: z.string(),
  type: z.enum([
    'credit_card',
    'debit_card',
    'bank_account',
    'paypal',
    'venmo',
    'cashapp',
    'zelle',
    'crypto',
  ]),
  token: z.string(), // Payment processor token
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

export const UpdatePaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
  updates: z.object({
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const RemovePaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
  reason: z.string().optional(),
});

/**
 * Currency conversion schema
 */
export const CurrencyConversionSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  amount: z.number().positive(),
  rate: z.number().positive().optional(), // If not provided, will fetch current rate
  timestamp: z.string().datetime().optional(),
});

/**
 * Currency conversion response
 */
export const CurrencyConversionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    fromCurrency: z.string(),
    toCurrency: z.string(),
    amount: z.number(),
    convertedAmount: z.number(),
    rate: z.number(),
    fee: z.number().optional(),
    netAmount: z.number().optional(),
    timestamp: z.string().datetime(),
  }),
});

// Export types for TypeScript
export type TransactionItem = z.infer<typeof TransactionItemSchema>;
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type DepositRequest = z.infer<typeof DepositRequestSchema>;
export type DepositResponse = z.infer<typeof DepositResponseSchema>;
export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;
export type WithdrawalResponse = z.infer<typeof WithdrawalResponseSchema>;
export type TransferRequest = z.infer<typeof TransferRequestSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;
export type BalanceInquiry = z.infer<typeof BalanceInquirySchema>;
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
export type TransactionSummaryResponse = z.infer<typeof TransactionSummaryResponseSchema>;
export type AddPaymentMethod = z.infer<typeof AddPaymentMethodSchema>;
export type UpdatePaymentMethod = z.infer<typeof UpdatePaymentMethodSchema>;
export type RemovePaymentMethod = z.infer<typeof RemovePaymentMethodSchema>;
export type CurrencyConversion = z.infer<typeof CurrencyConversionSchema>;
export type CurrencyConversionResponse = z.infer<typeof CurrencyConversionResponseSchema>;
