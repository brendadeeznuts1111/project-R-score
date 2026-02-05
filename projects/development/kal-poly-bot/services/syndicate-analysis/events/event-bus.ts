#!/usr/bin/env bun
/**
 * Event Bus for Event-Driven Pattern Detection
 * 
 * Implements event-driven architecture for syndicate pattern detection,
 * allowing decoupled pattern processing and real-time notifications.
 */

import { EventEmitter } from 'events';
import type { SyndicateBet, SyndicatePattern, EmergingPattern } from '../types';

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface PatternDetectedEvent {
  type: 'pattern.detected';
  syndicateId: string;
  pattern: SyndicatePattern;
  timestamp: number;
}

export interface BetRecordedEvent {
  type: 'bet.recorded';
  bet: SyndicateBet;
  timestamp: number;
}

export interface EmergingPatternEvent {
  type: 'pattern.emerging';
  pattern: EmergingPattern;
  timestamp: number;
}

export interface AlertEvent {
  type: 'alert.triggered';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  syndicateId?: string;
  patternType?: string;
  timestamp: number;
}

export type SyndicateEvent = PatternDetectedEvent | BetRecordedEvent | EmergingPatternEvent | AlertEvent;

// =============================================================================
// EVENT BUS
// =============================================================================

export class SyndicateEventBus extends EventEmitter {
  private eventHistory: SyndicateEvent[] = [];
  private maxHistorySize: number = 10000;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }

  // =============================================================================
  // EVENT EMISSION
  // =============================================================================

  emitPatternDetected(syndicateId: string, pattern: SyndicatePattern) {
    const event: PatternDetectedEvent = {
      type: 'pattern.detected',
      syndicateId,
      pattern,
      timestamp: Date.now()
    };

    this.addToHistory(event);
    this.emit('pattern.detected', event);
    this.emit('pattern.*', event);
  }

  emitBetRecorded(bet: SyndicateBet) {
    const event: BetRecordedEvent = {
      type: 'bet.recorded',
      bet,
      timestamp: Date.now()
    };

    this.addToHistory(event);
    this.emit('bet.recorded', event);
    this.emit('bet.*', event);
  }

  emitEmergingPattern(pattern: EmergingPattern) {
    const event: EmergingPatternEvent = {
      type: 'pattern.emerging',
      pattern,
      timestamp: Date.now()
    };

    this.addToHistory(event);
    this.emit('pattern.emerging', event);
    this.emit('pattern.*', event);
  }

  emitAlert(severity: 'critical' | 'high' | 'medium' | 'low', message: string, syndicateId?: string, patternType?: string) {
    const event: AlertEvent = {
      type: 'alert.triggered',
      severity,
      message,
      syndicateId,
      patternType,
      timestamp: Date.now()
    };

    this.addToHistory(event);
    this.emit('alert.triggered', event);
    this.emit('alert.*', event);
  }

  // =============================================================================
  // EVENT HISTORY
  // =============================================================================

  private addToHistory(event: SyndicateEvent) {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getEventHistory(filter?: (event: SyndicateEvent) => boolean): SyndicateEvent[] {
    if (!filter) return [...this.eventHistory];
    return this.eventHistory.filter(filter);
  }

  getRecentEvents(count: number = 100): SyndicateEvent[] {
    return this.eventHistory.slice(-count);
  }

  getEventsByType(type: string): SyndicateEvent[] {
    return this.eventHistory.filter(e => e.type === type);
  }

  getEventsBySyndicate(syndicateId: string): SyndicateEvent[] {
    return this.eventHistory.filter(e => {
      if ('syndicateId' in e) return e.syndicateId === syndicateId;
      if ('bet' in e) return e.bet.syndicateId === syndicateId;
      if ('pattern' in e && 'syndicateId' in e.pattern) return e.pattern.syndicateId === syndicateId;
      return false;
    });
  }

  clearHistory() {
    this.eventHistory = [];
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================

  getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEventRate: number; // events per minute
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentEvents = this.eventHistory.filter(e => e.timestamp > oneMinuteAgo);

    const eventsByType: Record<string, number> = {};
    this.eventHistory.forEach(e => {
      eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      recentEventRate: recentEvents.length
    };
  }
}

// Global event bus instance
export const eventBus = new SyndicateEventBus();
