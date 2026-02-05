/**
 * 📦 Fire22 Dashboard - Entity Classes Index
 * Unified exports for all entity classes and utilities
 */

// Base entity classes and utilities
export {
  Entity,
  AuditableEntityClass,
  EntityCollection,
  EntityFactory,
  type ValidationRule,
  type ValidationResult,
  type ValidationError,
} from './base';

// Domain entity classes
export { CustomerEntity, CustomerProfileService } from './customer';
export { AgentEntity, AgentHierarchyService } from './agent';
export { TransactionEntity } from './transaction';
export { WagerEntity } from './wager';

// Re-export with shorter aliases for convenience
export { CustomerEntity as Customer } from './customer';
export { AgentEntity as Agent } from './agent';
export { TransactionEntity as Transaction } from './transaction';
export { WagerEntity as Wager } from './wager';

// Entity factory implementations for each domain
import { EntityFactory } from './base';
import { CustomerEntity } from './customer';
import { AgentEntity } from './agent';
import { TransactionEntity } from './transaction';
import { WagerEntity } from './wager';

/**
 * Customer entity factory
 */
export class CustomerFactory extends EntityFactory<CustomerEntity> {
  create(data: any): CustomerEntity {
    return new CustomerEntity(data);
  }
}

/**
 * Agent entity factory
 */
export class AgentFactory extends EntityFactory<AgentEntity> {
  create(data: any): AgentEntity {
    return new AgentEntity(data);
  }
}

/**
 * Transaction entity factory
 */
export class TransactionFactory extends EntityFactory<TransactionEntity> {
  create(data: any): TransactionEntity {
    return new TransactionEntity(data);
  }
}

/**
 * Wager entity factory
 */
export class WagerFactory extends EntityFactory<WagerEntity> {
  create(data: any): WagerEntity {
    return new WagerEntity(data);
  }
}

// Factory registry for type-safe entity creation
export const EntityFactories = {
  customer: new CustomerFactory(),
  agent: new AgentFactory(),
  transaction: new TransactionFactory(),
  wager: new WagerFactory(),
} as const;

export type EntityFactoryType = keyof typeof EntityFactories;

/**
 * Create entity using factory registry
 */
export function createEntity<T extends EntityFactoryType>(
  entityType: T,
  data: any
): ReturnType<(typeof EntityFactories)[T]['create']> {
  const factory = EntityFactories[entityType];
  return factory.create(data);
}

/**
 * Create multiple entities using factory registry
 */
export function createEntities<T extends EntityFactoryType>(
  entityType: T,
  dataArray: any[]
): ReturnType<(typeof EntityFactories)[T]['create']>[] {
  const factory = EntityFactories[entityType];
  return factory.createMany(dataArray);
}

/**
 * Create entity collection using factory registry
 */
export function createEntityCollection<T extends EntityFactoryType>(
  entityType: T,
  dataArray: any[]
): ReturnType<(typeof EntityFactories)[T]['createCollection']> {
  const factory = EntityFactories[entityType];
  return factory.createCollection(dataArray);
}

// Default export with all factories and utilities
export default {
  // Base classes
  Entity,
  AuditableEntityClass,
  EntityCollection,
  EntityFactory,

  // Domain entities
  CustomerEntity,
  AgentEntity,
  TransactionEntity,
  WagerEntity,

  // Factories
  CustomerFactory,
  AgentFactory,
  TransactionFactory,
  WagerFactory,
  EntityFactories,

  // Utility functions
  createEntity,
  createEntities,
  createEntityCollection,

  // Services
  CustomerProfileService,
  AgentHierarchyService,
};
