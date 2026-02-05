/**
 * 🏈 Fire22 Platform - Type Exports
 * Centralized exports for all Fire22 types and interfaces
 */

// Core entity types
export type {
  Fire22Customer,
  Fire22Agent,
  Fire22Transaction,
  Fire22Bet,
  Fire22Bonus,
  Fire22Game,
  Fire22Odds,
  Fire22Session,
  Fire22AuditLog,
  Fire22CustomerMetrics,
  Fire22Entity,
  Fire22EntityType,
} from './entities';

// Enum types
export type {
  CustomerTier,
  CustomerStatus,
  KYCStatus,
  AgentType,
  AgentStatus,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  BetType,
  BetStatus,
  SportType,
  BonusType,
  BonusStatus,
  OddsType,
} from './entities';

// Constants
export { FIRE22_CONSTRAINTS, FIRE22_BUSINESS_RULES } from './entities';

// Default export
export { default } from './entities';
