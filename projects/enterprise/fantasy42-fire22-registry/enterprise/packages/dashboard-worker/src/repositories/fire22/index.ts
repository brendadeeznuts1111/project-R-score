/**
 * 🏈 Fire22 Repository Exports
 * Centralized exports for all Fire22 repository classes
 */

// Repository classes
export { Fire22BaseRepository } from './base-repository';
export { Fire22CustomerRepository } from './customer-repository';
export { Fire22AgentRepository } from './agent-repository';

// Repository types and interfaces
export type {
  RepositoryResult,
  PaginationOptions,
  SearchOptions,
  QueryOptions,
} from './base-repository';

export type { CustomerSearchOptions, CustomerMetrics } from './customer-repository';

export type { AgentSearchOptions, AgentMetrics, AgentHierarchy } from './agent-repository';

// Repository instances (singleton pattern)
import { Fire22CustomerRepository } from './customer-repository';
import { Fire22AgentRepository } from './agent-repository';

export const customerRepository = new Fire22CustomerRepository();
export const agentRepository = new Fire22AgentRepository();
