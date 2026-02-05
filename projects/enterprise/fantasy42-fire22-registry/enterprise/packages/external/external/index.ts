/**
 * External Integrations Index
 * Domain-Driven Design Implementation
 */

// Fantasy402 Integration
export {
  Fantasy402Gateway,
  type FantasyGatewayConfig,
  type SportEventQuery,
  type AgentQuery,
  type BetQuery,
} from './fantasy402/gateway/fantasy402-gateway';
export { Fantasy402Adapter } from './fantasy402/adapters/fantasy402-adapter';
export {
  FantasySportEvent,
  type EventStatus,
  type SportType,
} from './fantasy402/entities/fantasy-sport-event';
export {
  FantasyAgent,
  type AgentType,
  type AgentStatus,
} from './fantasy402/entities/fantasy-agent';
export { FantasyAccount } from './fantasy402/entities/fantasy-account';
export {
  FantasyBet,
  type BetStatus,
  type BetResult,
  type BetType,
} from './fantasy402/entities/fantasy-bet';

// Shared Components
export {
  ExternalEventMapper,
  type ExternalEvent,
  type InternalEvent,
} from './shared/external-event-mapper';

// Re-export shared domain components for convenience
export { DomainEvents, BaseDomainEvent, type DomainEvent } from '../shared/events/domain-events';
export { DomainEntity } from '../shared/domain-entity';
export { ValueObject } from '../shared/value-object';
export { DomainError } from '../shared/domain-entity';
