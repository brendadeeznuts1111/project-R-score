/**
 * Balance Audit Trail Module
 * Comprehensive audit logging for all balance changes and transactions
 */

import type {
  BalanceChangeEvent,
  BalanceChangeCreate,
  TransactionType,
  BalanceChangeReason,
} from '../../../core/types/finance';

export class BalanceAuditTrail {
  private events: Map<string, BalanceChangeEvent> = new Map();
  private customerEvents: Map<string, string[]> = new Map();
  private agentEvents: Map<string, string[]> = new Map();
  private dailyEvents: Map<string, string[]> = new Map();
  private maxEventsPerCustomer = 1000;
  private retentionDays = 365;

  /**
   * Record a balance change event
   */
  recordBalanceChange(
    customerId: string,
    agentId: string,
    changeType: TransactionType,
    previousBalance: number,
    changeAmount: number,
    reason: BalanceChangeReason,
    performedBy: string,
    metadata?: Record<string, any>
  ): BalanceChangeEvent {
    const event: BalanceChangeEvent = {
      id: this.generateEventId(),
      customerId,
      agentId,
      timestamp: new Date().toISOString(),
      changeType,
      previousBalance,
      newBalance: previousBalance + changeAmount,
      changeAmount,
      reason,
      performedBy,
      metadata: {
        ...metadata,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        sessionId: metadata?.sessionId,
        deviceId: metadata?.deviceId,
      },
      riskScore: this.calculateRiskScore(changeAmount, changeType, previousBalance),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Store event
    this.events.set(event.id, event);

    // Update indexes
    this.addToCustomerIndex(customerId, event.id);
    this.addToAgentIndex(agentId, event.id);
    this.addToDailyIndex(event.timestamp.split('T')[0], event.id);

    // Cleanup old events
    this.cleanupOldEvents(customerId);

    console.log(
      `💰 Balance change recorded: ${customerId} | ${changeType} | $${changeAmount} | ${reason}`
    );

    return event;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): BalanceChangeEvent | null {
    return this.events.get(eventId) || null;
  }

  /**
   * Get events for a customer
   */
  getCustomerEvents(
    customerId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      types?: TransactionType[];
    }
  ): BalanceChangeEvent[] {
    const eventIds = this.customerEvents.get(customerId) || [];
    let events = eventIds
      .map(id => this.events.get(id))
      .filter((event): event is BalanceChangeEvent => event !== undefined);

    // Apply filters
    if (options?.startDate) {
      events = events.filter(e => new Date(e.timestamp) >= options.startDate!);
    }

    if (options?.endDate) {
      events = events.filter(e => new Date(e.timestamp) <= options.endDate!);
    }

    if (options?.types && options.types.length > 0) {
      events = events.filter(e => options.types!.includes(e.changeType));
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || events.length;
    events = events.slice(offset, offset + limit);

    // Sort by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get events for an agent
   */
  getAgentEvents(
    agentId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
    }
  ): BalanceChangeEvent[] {
    const eventIds = this.agentEvents.get(agentId) || [];
    let events = eventIds
      .map(id => this.events.get(id))
      .filter((event): event is BalanceChangeEvent => event !== undefined);

    // Apply filters
    if (options?.customerId) {
      events = events.filter(e => e.customerId === options.customerId);
    }

    if (options?.startDate) {
      events = events.filter(e => new Date(e.timestamp) >= options.startDate!);
    }

    if (options?.endDate) {
      events = events.filter(e => new Date(e.timestamp) <= options.endDate!);
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || events.length;
    events = events.slice(offset, offset + limit);

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get events for a specific date
   */
  getDailyEvents(
    date: string,
    options?: { limit?: number; offset?: number }
  ): BalanceChangeEvent[] {
    const eventIds = this.dailyEvents.get(date) || [];
    let events = eventIds
      .map(id => this.events.get(id))
      .filter((event): event is BalanceChangeEvent => event !== undefined);

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || events.length;
    events = events.slice(offset, offset + limit);

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Search events by criteria
   */
  searchEvents(
    criteria: {
      customerId?: string;
      agentId?: string;
      changeType?: TransactionType;
      reason?: BalanceChangeReason;
      minAmount?: number;
      maxAmount?: number;
      startDate?: Date;
      endDate?: Date;
      performedBy?: string;
    },
    options?: { limit?: number; offset?: number }
  ): BalanceChangeEvent[] {
    let allEvents = Array.from(this.events.values());

    // Apply filters
    if (criteria.customerId) {
      allEvents = allEvents.filter(e => e.customerId === criteria.customerId);
    }

    if (criteria.agentId) {
      allEvents = allEvents.filter(e => e.agentId === criteria.agentId);
    }

    if (criteria.changeType) {
      allEvents = allEvents.filter(e => e.changeType === criteria.changeType);
    }

    if (criteria.reason) {
      allEvents = allEvents.filter(e => e.reason === criteria.reason);
    }

    if (criteria.minAmount !== undefined) {
      allEvents = allEvents.filter(e => Math.abs(e.changeAmount) >= criteria.minAmount!);
    }

    if (criteria.maxAmount !== undefined) {
      allEvents = allEvents.filter(e => Math.abs(e.changeAmount) <= criteria.maxAmount!);
    }

    if (criteria.startDate) {
      allEvents = allEvents.filter(e => new Date(e.timestamp) >= criteria.startDate!);
    }

    if (criteria.endDate) {
      allEvents = allEvents.filter(e => new Date(e.timestamp) <= criteria.endDate!);
    }

    if (criteria.performedBy) {
      allEvents = allEvents.filter(e => e.performedBy === criteria.performedBy);
    }

    // Sort by timestamp (newest first)
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || allEvents.length;

    return allEvents.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  getAuditStats(): {
    totalEvents: number;
    eventsByType: Record<TransactionType, number>;
    eventsByReason: Record<BalanceChangeReason, number>;
    customerCount: number;
    agentCount: number;
    averageChangeAmount: number;
    largestChange: number;
    dailyStats: Array<{ date: string; count: number; volume: number }>;
  } {
    const events = Array.from(this.events.values());
    const eventsByType: Record<TransactionType, number> = {} as any;
    const eventsByReason: Record<BalanceChangeReason, number> = {} as any;

    let totalVolume = 0;
    let largestChange = 0;
    const customers = new Set<string>();
    const agents = new Set<string>();
    const dailyStats = new Map<string, { count: number; volume: number }>();

    events.forEach(event => {
      // Count by type
      eventsByType[event.changeType] = (eventsByType[event.changeType] || 0) + 1;

      // Count by reason
      eventsByReason[event.reason] = (eventsByReason[event.reason] || 0) + 1;

      // Track customers and agents
      customers.add(event.customerId);
      agents.add(event.agentId);

      // Calculate volume
      totalVolume += Math.abs(event.changeAmount);
      largestChange = Math.max(largestChange, Math.abs(event.changeAmount));

      // Daily stats
      const date = event.timestamp.split('T')[0];
      const daily = dailyStats.get(date) || { count: 0, volume: 0 };
      daily.count++;
      daily.volume += Math.abs(event.changeAmount);
      dailyStats.set(date, daily);
    });

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByReason,
      customerCount: customers.size,
      agentCount: agents.size,
      averageChangeAmount: events.length > 0 ? totalVolume / events.length : 0,
      largestChange,
      dailyStats: Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        count: stats.count,
        volume: stats.volume,
      })),
    };
  }

  /**
   * Export audit data
   */
  exportAuditData(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): string {
    const events = Array.from(this.events.values())
      .filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (format === 'csv') {
      const headers = [
        'ID',
        'Customer ID',
        'Agent ID',
        'Timestamp',
        'Type',
        'Previous Balance',
        'Change Amount',
        'New Balance',
        'Reason',
        'Performed By',
        'Risk Score',
      ];

      const rows = events.map(e => [
        e.id,
        e.customerId,
        e.agentId,
        e.timestamp,
        e.changeType,
        e.previousBalance.toFixed(2),
        e.changeAmount.toFixed(2),
        e.newBalance.toFixed(2),
        e.reason,
        e.performedBy,
        e.riskScore?.toString() || '',
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Clear old audit data
   */
  clearOldData(daysToKeep: number = this.retentionDays): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let clearedCount = 0;
    const eventsToRemove: string[] = [];

    for (const [eventId, event] of this.events) {
      if (new Date(event.timestamp) < cutoffDate) {
        eventsToRemove.push(eventId);
        clearedCount++;
      }
    }

    // Remove events and clean up indexes
    eventsToRemove.forEach(eventId => {
      const event = this.events.get(eventId);
      if (event) {
        this.removeFromCustomerIndex(event.customerId, eventId);
        this.removeFromAgentIndex(event.agentId, eventId);
        this.removeFromDailyIndex(event.timestamp.split('T')[0], eventId);
      }
      this.events.delete(eventId);
    });

    console.log(`🧹 Cleared ${clearedCount} old audit events`);
    return clearedCount;
  }

  // Private methods

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRiskScore(
    changeAmount: number,
    changeType: TransactionType,
    previousBalance: number
  ): number {
    let riskScore = 0;

    // Amount-based risk
    const absAmount = Math.abs(changeAmount);
    if (absAmount > 100000) riskScore += 50;
    else if (absAmount > 50000) riskScore += 30;
    else if (absAmount > 10000) riskScore += 15;

    // Type-based risk
    switch (changeType) {
      case 'adjustment':
      case 'system':
        riskScore += 20;
        break;
      case 'withdrawal':
        riskScore += 10;
        break;
      case 'wager':
        riskScore += 5;
        break;
    }

    // Balance ratio risk
    if (previousBalance > 0) {
      const ratio = absAmount / previousBalance;
      if (ratio > 1) riskScore += 40;
      else if (ratio > 0.5) riskScore += 20;
      else if (ratio > 0.1) riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  private addToCustomerIndex(customerId: string, eventId: string): void {
    if (!this.customerEvents.has(customerId)) {
      this.customerEvents.set(customerId, []);
    }
    this.customerEvents.get(customerId)!.unshift(eventId);
  }

  private addToAgentIndex(agentId: string, eventId: string): void {
    if (!this.agentEvents.has(agentId)) {
      this.agentEvents.set(agentId, []);
    }
    this.agentEvents.get(agentId)!.unshift(eventId);
  }

  private addToDailyIndex(date: string, eventId: string): void {
    if (!this.dailyEvents.has(date)) {
      this.dailyEvents.set(date, []);
    }
    this.dailyEvents.get(date)!.push(eventId);
  }

  private removeFromCustomerIndex(customerId: string, eventId: string): void {
    const events = this.customerEvents.get(customerId);
    if (events) {
      const index = events.indexOf(eventId);
      if (index > -1) {
        events.splice(index, 1);
      }
    }
  }

  private removeFromAgentIndex(agentId: string, eventId: string): void {
    const events = this.agentEvents.get(agentId);
    if (events) {
      const index = events.indexOf(eventId);
      if (index > -1) {
        events.splice(index, 1);
      }
    }
  }

  private removeFromDailyIndex(date: string, eventId: string): void {
    const events = this.dailyEvents.get(date);
    if (events) {
      const index = events.indexOf(eventId);
      if (index > -1) {
        events.splice(index, 1);
      }
    }
  }

  private cleanupOldEvents(customerId: string): void {
    const events = this.customerEvents.get(customerId);
    if (events && events.length > this.maxEventsPerCustomer) {
      const excessCount = events.length - this.maxEventsPerCustomer;
      const eventsToRemove = events.splice(-excessCount);

      eventsToRemove.forEach(eventId => {
        const event = this.events.get(eventId);
        if (event) {
          this.removeFromAgentIndex(event.agentId, eventId);
          this.removeFromDailyIndex(event.timestamp.split('T')[0], eventId);
        }
        this.events.delete(eventId);
      });
    }
  }
}
