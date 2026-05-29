/**
 * @factorywager/fraud-prevention
 * Account history (audit trail), cross-lookup references (phone/email/device hashes), fraud signals.
 */

export { FraudPreventionEngine, getDefaultDbPath } from './core';
export {
  hashPhone,
  hashReferenceValue,
  normalizePhone,
  validatePhoneNormalized,
} from './phone';
export type {
  AccountEventType,
  AccountHistoryEntry,
  CrossLookupResult,
  FraudSignalSeverity,
  RecordEventInput,
  ReferenceLookupRow,
  ReferenceType,
  RegisterReferenceInput,
} from './types';
export {
  AccountEventTypeSchema,
  RecordEventInputSchema,
  ReferenceTypeSchema,
  RegisterReferenceInputSchema,
} from './types';
