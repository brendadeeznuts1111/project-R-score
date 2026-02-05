/**
 * Shared Domain Components Index
 * Domain-Driven Design Implementation
 */

// Core Infrastructure
export { DomainEntity } from './domain-entity';
export { ValueObject } from './value-object';
export { DomainError } from './domain-entity';

// Events System
export { DomainEvents, BaseDomainEvent, type DomainEvent } from './events/domain-events';
export { DomainEventHandlers } from './events/domain-event-handlers';
export {
  EventWorkflows,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowContext,
} from './events/event-workflows';

// Orchestration
export {
  DomainOrchestrator,
  type BusinessProcessResult,
  type BusinessProcessStep,
} from './domain-orchestrator';

// Re-export commonly used types
export type {
  FantasyGatewayConfig,
  SportEventQuery,
  AgentQuery,
  BetQuery,
} from '../external/fantasy402/gateway/fantasy402-gateway';
export type { ExternalEvent, InternalEvent } from '../external/shared/external-event-mapper';

// Re-export fantasy entities
export { FantasySportEvent } from '../external/fantasy402/entities/fantasy-sport-event';
export { FantasyAccount } from '../external/fantasy402/entities/fantasy-account';
export { FantasyAgent } from '../external/fantasy402/entities/fantasy-agent';
export { FantasyBet } from '../external/fantasy402/entities/fantasy-bet';
