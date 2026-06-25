/**
 * 🏈 Fire22 Entity Exports
 * Centralized exports for all Fire22 entity classes
 */

// Entity classes
export { Fire22CustomerEntity } from './customer';
export { Fire22AgentEntity } from './agent';

// Type re-exports for convenience
export type {
  Fire22Customer,
  Fire22Agent,
  CustomerTier,
  CustomerStatus,
  KYCStatus,
  AgentType,
  AgentStatus,
} from '../../types/fire22/entities';
