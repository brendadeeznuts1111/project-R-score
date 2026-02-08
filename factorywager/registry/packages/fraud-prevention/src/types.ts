/**
 * Fraud prevention types: account history events and reference lookups.
 */

import { z } from 'zod';

/** Event types for account history (audit trail) */
export const AccountEventTypeSchema = z.enum([
  'login',
  'logout',
  'pref_change',
  'payment_attempt',
  'payment_success',
  'payment_failed',
  'gateway_link',
  'gateway_unlink',
  'profile_create',
  'profile_update',
  'phone_verified',
  'email_verified',
  'device_register',
  'suspicious_activity',
  'fraud_flag',
]);
export type AccountEventType = z.infer<typeof AccountEventTypeSchema>;

/** Reference type for cross-lookup (hashed identifiers) */
export const ReferenceTypeSchema = z.enum(['phone_hash', 'email_hash', 'device_id']);
export type ReferenceType = z.infer<typeof ReferenceTypeSchema>;

/** Single account history row */
export interface AccountHistoryEntry {
  id: number;
  userId: string;
  eventType: AccountEventType;
  timestamp: number;
  metadata: string | null;
  ipHash: string | null;
  deviceHash: string | null;
  gateway: string | null;
  amountCents: number | null;
  success: number; // 0 | 1
}

/** Input for recording an event */
export const RecordEventInputSchema = z.object({
  userId: z.string().regex(/^@[\w-]+$/),
  eventType: AccountEventTypeSchema,
  metadata: z.record(z.unknown()).optional(),
  ipHash: z.string().optional(),
  deviceHash: z.string().optional(),
  gateway: z.string().optional(),
  amountCents: z.number().int().nonnegative().optional(),
  success: z.boolean().optional(),
});
export type RecordEventInput = z.infer<typeof RecordEventInputSchema>;

/** Reference lookup row (hashed value -> userId link) */
export interface ReferenceLookupRow {
  id: number;
  referenceType: ReferenceType;
  valueHash: string;
  userId: string;
  createdAt: number;
}

/** Input for registering a reference (e.g. phone hash linked to userId) */
export const RegisterReferenceInputSchema = z.object({
  userId: z.string().regex(/^@[\w-]+$/),
  referenceType: ReferenceTypeSchema,
  valueHash: z.string().length(64), // SHA-256 hex
});
export type RegisterReferenceInput = z.infer<typeof RegisterReferenceInputSchema>;

/** Cross-lookup result: same identifier linked to multiple accounts */
export interface CrossLookupResult {
  referenceType: ReferenceType;
  valueHash: string;
  userIds: string[];
  count: number;
}

/** Fraud signal severity */
export const FraudSignalSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type FraudSignalSeverity = z.infer<typeof FraudSignalSeveritySchema>;
