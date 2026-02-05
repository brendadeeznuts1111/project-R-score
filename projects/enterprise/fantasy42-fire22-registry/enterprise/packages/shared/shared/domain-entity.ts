/**
 * Base Domain Entity
 * Foundation for all domain entities in the Crystal Clear Architecture
 */

import { DomainEvents, BaseDomainEvent } from './events/domain-events';

export abstract class DomainEntity {
  protected readonly id: string;
  protected readonly createdAt: Date;
  protected updatedAt: Date;
  protected domainEvents: BaseDomainEvent[] = [];

  constructor(id: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getId(): string {
    return this.id;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  protected markAsModified(): void {
    this.updatedAt = new Date();
  }

  /**
   * Add a domain event to be published
   */
  protected addDomainEvent(event: BaseDomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get all domain events (typically called by repository after save)
   */
  public getDomainEvents(): BaseDomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clear domain events after they've been published
   */
  public clearDomainEvents(): void {
    this.domainEvents = [];
  }

  equals(other: DomainEntity): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return `${this.constructor.name}[id=${this.id}]`;
  }
}

// Domain Error for consistent error handling across domains
export class DomainError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.context = context;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}
