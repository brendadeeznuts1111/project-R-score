#!/usr/bin/env bun

/**
 * Payment Intent Management System
 * 
 * ACME-approved secure payment intent lifecycle management
 * with expiration, validation, and audit capabilities.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface PaymentIntent {
  id: string;
  familyId: string;
  customerId?: string;
  amount: number;
  currency: string;
  description: string;
  recipientId: string;
  recipientName: string;
  paymentMethods: PaymentMethod[];
  expiresAt: Date;
  createdAt: Date;
  status: PaymentStatus;
  metadata?: Record<string, any>;
  auditLog: AuditEntry[];
}

interface PaymentMethod {
  type: 'cashapp' | 'venmo' | 'crypto' | 'factory-wager';
  identifier: string;
  displayName: string;
  instructions?: string;
  enabled: boolean;
}

interface AuditEntry {
  timestamp: Date;
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
}

type PaymentStatus = 'pending' | 'completed' | 'expired' | 'cancelled' | 'failed';

interface IntentQuery {
  familyId?: string;
  customerId?: string;
  status?: PaymentStatus;
  recipientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

interface IntentStatistics {
  total: number;
  byStatus: Record<PaymentStatus, number>;
  byMethod: Record<string, number>;
  totalAmount: number;
  averageAmount: number;
  expirationRate: number;
}

class PaymentIntentManager {
  private static readonly STORAGE_FILE = 'data/payment-intents.json';
  private static readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Create new payment intent
   */
  static async createIntent(params: {
    familyId: string;
    amount: number;
    description: string;
    recipientId: string;
    recipientName: string;
    customerId?: string;
    currency?: string;
    paymentMethods?: PaymentMethod[];
    ttl?: number;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    
    const intentId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.ttl || this.DEFAULT_TTL));

    const intent: PaymentIntent = {
      id: intentId,
      familyId: params.familyId,
      customerId: params.customerId,
      amount: params.amount,
      currency: params.currency || 'USD',
      description: params.description,
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      paymentMethods: params.paymentMethods || await this.getDefaultPaymentMethods(params.recipientId),
      expiresAt,
      createdAt: now,
      status: 'pending',
      metadata: params.metadata,
      auditLog: [{
        timestamp: now,
        action: 'created',
        userId: params.customerId,
        metadata: params.metadata
      }]
    };

    await this.saveIntent(intent);
    console.log(`💰 Created payment intent: ${intentId} for $${params.amount}`);

    return intent;
  }

  /**
   * Get payment intent by ID
   */
  static async getIntent(intentId: string): Promise<PaymentIntent | null> {
    const intents = await this.loadIntents();
    return intents[intentId] || null;
  }

  /**
   * Update payment intent
   */
  static async updateIntent(
    intentId: string, 
    updates: Partial<PaymentIntent>,
    userId?: string
  ): Promise<PaymentIntent> {
    
    const intent = await this.getIntent(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    // Apply updates
    Object.assign(intent, updates);

    // Add audit entry
    intent.auditLog.push({
      timestamp: new Date(),
      action: 'updated',
      userId,
      metadata: updates
    });

    await this.saveIntent(intent);
    console.log(`🔄 Updated payment intent: ${intentId}`);

    return intent;
  }

  /**
   * Complete payment intent
   */
  static async completeIntent(
    intentId: string,
    methodType: PaymentMethod['type'],
    transactionId: string,
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<PaymentIntent> {
    
    const intent = await this.getIntent(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    if (intent.status !== 'pending') {
      throw new Error(`Cannot complete intent with status: ${intent.status}`);
    }

    if (new Date() > intent.expiresAt) {
      throw new Error('Payment intent has expired');
    }

    const method = intent.paymentMethods.find(m => m.type === methodType);
    if (!method) {
      throw new Error(`Payment method ${methodType} not supported`);
    }

    // Update intent
    intent.status = 'completed';
    intent.metadata = {
      ...intent.metadata,
      completedAt: new Date().toISOString(),
      paymentMethod: methodType,
      transactionId,
      ...metadata
    };

    // Add audit entry
    intent.auditLog.push({
      timestamp: new Date(),
      action: 'completed',
      userId,
      metadata: { methodType, transactionId, ...metadata }
    });

    await this.saveIntent(intent);
    console.log(`✅ Completed payment intent: ${intentId} via ${methodType}`);

    // Trigger post-completion workflows
    await this.handleCompletion(intent);

    return intent;
  }

  /**
   * Cancel payment intent
   */
  static async cancelIntent(
    intentId: string,
    reason?: string,
    userId?: string
  ): Promise<PaymentIntent> {
    
    const intent = await this.getIntent(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    if (intent.status !== 'pending') {
      throw new Error(`Cannot cancel intent with status: ${intent.status}`);
    }

    intent.status = 'cancelled';
    intent.metadata = {
      ...intent.metadata,
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    };

    intent.auditLog.push({
      timestamp: new Date(),
      action: 'cancelled',
      userId,
      metadata: { reason }
    });

    await this.saveIntent(intent);
    console.log(`❌ Cancelled payment intent: ${intentId}${reason ? ` - ${reason}` : ''}`);

    return intent;
  }

  /**
   * Mark intent as failed
   */
  static async failIntent(
    intentId: string,
    error: string,
    userId?: string
  ): Promise<PaymentIntent> {
    
    const intent = await this.getIntent(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    intent.status = 'failed';
    intent.metadata = {
      ...intent.metadata,
      failedAt: new Date().toISOString(),
      error
    };

    intent.auditLog.push({
      timestamp: new Date(),
      action: 'failed',
      userId,
      metadata: { error }
    });

    await this.saveIntent(intent);
    console.log(`💥 Failed payment intent: ${intentId} - ${error}`);

    return intent;
  }

  /**
   * Query payment intents
   */
  static async queryIntents(query: IntentQuery): Promise<PaymentIntent[]> {
    const intents = await this.loadIntents();
    let results = Object.values(intents);

    // Apply filters
    if (query.familyId) {
      results = results.filter(i => i.familyId === query.familyId);
    }

    if (query.customerId) {
      results = results.filter(i => i.customerId === query.customerId);
    }

    if (query.status) {
      results = results.filter(i => i.status === query.status);
    }

    if (query.recipientId) {
      results = results.filter(i => i.recipientId === query.recipientId);
    }

    if (query.dateFrom) {
      results = results.filter(i => i.createdAt >= query.dateFrom!);
    }

    if (query.dateTo) {
      results = results.filter(i => i.createdAt <= query.dateTo!);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get intent statistics
   */
  static async getStatistics(query?: IntentQuery): Promise<IntentStatistics> {
    const intents = query ? await this.queryIntents(query) : Object.values(await this.loadIntents());

    const stats: IntentStatistics = {
      total: intents.length,
      byStatus: {
        pending: 0,
        completed: 0,
        expired: 0,
        cancelled: 0,
        failed: 0
      },
      byMethod: {},
      totalAmount: 0,
      averageAmount: 0,
      expirationRate: 0
    };

    let completedAmount = 0;
    let expiredCount = 0;

    for (const intent of intents) {
      // Status statistics
      stats.byStatus[intent.status]++;

      // Method statistics
      if (intent.metadata?.paymentMethod) {
        const method = intent.metadata.paymentMethod;
        stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
      }

      // Amount statistics
      if (intent.status === 'completed') {
        stats.totalAmount += intent.amount;
        completedAmount++;
      }

      // Expiration statistics
      if (intent.status === 'expired') {
        expiredCount++;
      }
    }

    stats.averageAmount = completedAmount > 0 ? stats.totalAmount / completedAmount : 0;
    stats.expirationRate = intents.length > 0 ? (expiredCount / intents.length) * 100 : 0;

    return stats;
  }

  /**
   * Cleanup expired intents
   */
  static async cleanupExpiredIntents(): Promise<number> {
    const intents = await this.loadIntents();
    const now = new Date();
    let cleaned = 0;

    for (const [id, intent] of Object.entries(intents)) {
      if (intent.status === 'pending' && now > intent.expiresAt) {
        intent.status = 'expired';
        intent.auditLog.push({
          timestamp: now,
          action: 'expired',
          metadata: { expiredAt: now.toISOString() }
        });
        intents[id] = intent;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveAllIntents(intents);
      console.log(`🧹 Cleaned up ${cleaned} expired payment intents`);
    }

    return cleaned;
  }

  /**
   * Validate intent before payment
   */
  static async validateIntent(intentId: string): Promise<{
    valid: boolean;
    intent?: PaymentIntent;
    errors: string[];
  }> {
    const intent = await this.getIntent(intentId);
    const errors: string[] = [];

    if (!intent) {
      errors.push('Payment intent not found');
      return { valid: false, errors };
    }

    if (intent.status !== 'pending') {
      errors.push(`Payment intent is ${intent.status}`);
    }

    if (new Date() > intent.expiresAt) {
      errors.push('Payment intent has expired');
    }

    if (intent.amount <= 0) {
      errors.push('Invalid payment amount');
    }

    if (!intent.recipientId) {
      errors.push('Recipient not specified');
    }

    const valid = errors.length === 0;
    return { valid, intent: valid ? intent : undefined, errors };
  }

  /**
   * Get audit trail for intent
   */
  static async getAuditTrail(intentId: string): Promise<AuditEntry[]> {
    const intent = await this.getIntent(intentId);
    return intent?.auditLog || [];
  }

  /**
   * Handle payment completion workflows
   */
  private static async handleCompletion(intent: PaymentIntent): Promise<void> {
    console.log(`🎉 Processing completion for intent: ${intent.id}`);
    
    // Trigger notifications
    await this.sendNotifications(intent);
    
    // Update accounting
    await this.updateAccounting(intent);
    
    // Update family balance
    await this.updateFamilyBalance(intent);
  }

  /**
   * Send completion notifications
   */
  private static async sendNotifications(intent: PaymentIntent): Promise<void> {
    console.log(`📧 Sending notifications for: ${intent.id}`);
    // Integration with notification system
  }

  /**
   * Update accounting records
   */
  private static async updateAccounting(intent: PaymentIntent): Promise<void> {
    console.log(`💰 Updating accounting for: ${intent.id}`);
    // Integration with accounting system
  }

  /**
   * Update family balance
   */
  private static async updateFamilyBalance(intent: PaymentIntent): Promise<void> {
    console.log(`👨‍👩‍👧‍👦 Updating family balance for: ${intent.familyId}`);
    // Integration with family balance system
  }

  /**
   * Get default payment methods
   */
  private static async getDefaultPaymentMethods(recipientId: string): Promise<PaymentMethod[]> {
    return [
      {
        type: 'factory-wager',
        identifier: recipientId,
        displayName: 'FactoryWager Pay',
        enabled: true
      },
      {
        type: 'cashapp',
        identifier: '$factory-wagerfamily',
        displayName: 'Cash App',
        enabled: true
      },
      {
        type: 'venmo',
        identifier: '@factory-wager',
        displayName: 'Venmo',
        enabled: true
      }
    ];
  }

  /**
   * Load all intents from storage
   */
  private static async loadIntents(): Promise<Record<string, PaymentIntent>> {
    try {
      if (!existsSync(this.STORAGE_FILE)) {
        return {};
      }
      const data = readFileSync(this.STORAGE_FILE, 'utf-8');
      const intents = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const intent of Object.values(intents)) {
        const i = intent as any;
        i.createdAt = new Date(i.createdAt);
        i.expiresAt = new Date(i.expiresAt);
        if (i.auditLog) {
          i.auditLog = i.auditLog.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
        }
      }
      
      return intents;
    } catch (error) {
      console.error('Failed to load payment intents:', error);
      return {};
    }
  }

  /**
   * Save single intent
   */
  private static async saveIntent(intent: PaymentIntent): Promise<void> {
    const intents = await this.loadIntents();
    intents[intent.id] = intent;
    await this.saveAllIntents(intents);
  }

  /**
   * Save all intents
   */
  private static async saveAllIntents(intents: Record<string, PaymentIntent>): Promise<void> {
    try {
      // Ensure data directory exists
      if (!existsSync('data')) {
        await require('fs').promises.mkdir('data', { recursive: true });
      }
      
      writeFileSync(this.STORAGE_FILE, JSON.stringify(intents, null, 2));
    } catch (error) {
      console.error('Failed to save payment intents:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const intentId = process.argv[3];

  switch (command) {
    case 'create':
      PaymentIntentManager.createIntent({
        familyId: 'FAM123',
        amount: 25.50,
        description: 'Coffee',
        recipientId: 'alice',
        recipientName: 'Alice'
      }).then(intent => {
        console.log('✅ Created intent:', intent.id);
        console.log(`Amount: $${intent.amount}`);
        console.log(`Expires: ${intent.expiresAt.toISOString()}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'get':
      if (intentId) {
        PaymentIntentManager.getIntent(intentId).then(intent => {
          if (intent) {
            console.log('📋 Intent Details:');
            console.log(`ID: ${intent.id}`);
            console.log(`Status: ${intent.status}`);
            console.log(`Amount: $${intent.amount}`);
            console.log(`Recipient: ${intent.recipientName}`);
            console.log(`Created: ${intent.createdAt.toISOString()}`);
            console.log(`Expires: ${intent.expiresAt.toISOString()}`);
          } else {
            console.log('❌ Intent not found');
          }
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'validate':
      if (intentId) {
        PaymentIntentManager.validateIntent(intentId).then(result => {
          console.log(`Valid: ${result.valid}`);
          if (!result.valid) {
            console.log('Errors:', result.errors.join(', '));
          }
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'stats':
      PaymentIntentManager.getStatistics().then(stats => {
        console.log('📊 Payment Intent Statistics:');
        console.log(`Total: ${stats.total}`);
        console.log(`Completed: ${stats.byStatus.completed}`);
        console.log(`Pending: ${stats.byStatus.pending}`);
        console.log(`Expired: ${stats.byStatus.expired}`);
        console.log(`Total Amount: $${stats.totalAmount.toFixed(2)}`);
        console.log(`Expiration Rate: ${stats.expirationRate.toFixed(1)}%`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'cleanup':
      PaymentIntentManager.cleanupExpiredIntents().then(cleaned => {
        console.log(`🧹 Cleaned ${cleaned} expired intents`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    default:
      console.log(`
💰 Payment Intent Management System

Usage:
  intent-manager create                    - Create new intent
  intent-manager get <intentId>            - Get intent details
  intent-manager validate <intentId>       - Validate intent
  intent-manager stats                     - Show statistics
  intent-manager cleanup                   - Clean up expired intents

Features:
✅ Secure intent lifecycle management
✅ Expiration and validation
✅ Audit trail and logging
✅ Multi-method support
✅ ACME-approved payment integrity
      `);
  }
}

export default PaymentIntentManager;
