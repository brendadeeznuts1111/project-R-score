/**
 * Core Domain Models Index
 * Exports all core business logic and domain models
 */

// Agent Domain
export * from './agent';

// Workflow Domain
export * from './workflow';

// Command Domain
export * from './command';

// Security Domain
export * from './security';

// Shared types and utilities for core domain
export interface DomainResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Core domain event types
export enum DomainEventType {
  AGENT_CREATED = 'agent.created',
  AGENT_STARTED = 'agent.started',
  AGENT_STOPPED = 'agent.stopped',
  AGENT_ERROR = 'agent.error',

  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_EXECUTED = 'workflow.executed',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',

  COMMAND_EXECUTED = 'command.executed',
  COMMAND_FAILED = 'command.failed',

  SECURITY_VIOLATION = 'security.violation',
  SECURITY_ACCESS_DENIED = 'security.access_denied',
  SECURITY_ACCESS_GRANTED = 'security.access_granted'
}

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  timestamp: Date;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

// Domain event publisher interface
export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: DomainEventType, handler: (event: DomainEvent) => void): void;
  unsubscribe(eventType: DomainEventType, handler: (event: DomainEvent) => void): void;
}

// Factory functions for core domain objects
export function createDomainEvent(
  type: DomainEventType,
  aggregateId: string,
  aggregateType: string,
  payload: Record<string, any>,
  metadata?: Record<string, any>
): DomainEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date(),
    aggregateId,
    aggregateType,
    payload,
    metadata
  };
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  const hasNext = options.page < totalPages;
  const hasPrev = options.page > 1;

  return {
    items,
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
    hasNext,
    hasPrev
  };
}
