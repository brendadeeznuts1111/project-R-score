#!/usr/bin/env bun

/**
 * Payment Reference System Demo
 * Demonstrates the complete payment reference integration with Fire22 Dashboard
 */

interface PaymentReference {
  reference: string;
  userId: string;
  telegramUsername?: string;
  amount: number;
  currency: string;
  notes: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

interface PaymentSystemConfig {
  enabled: boolean;
  referenceFormat: string;
  autoGeneration: boolean;
  validation: {
    minAmount: number;
    maxAmount: number;
    requiredFields: string[];
  };
  telegram: {
    notifications: boolean;
    commands: string[];
  };
  currencies: string[];
  statuses: string[];
}

class PaymentReferenceSystem {
  private payments: Map<string, PaymentReference> = new Map();
  private config: PaymentSystemConfig;

  constructor() {
    this.config = {
      enabled: true,
      referenceFormat: 'PAY-{timestamp}-{random}',
      autoGeneration: true,
      validation: {
        minAmount: 1.0,
        maxAmount: 100000.0,
        requiredFields: ['amount', 'notes', 'userId'],
      },
      telegram: {
        notifications: true,
        commands: ['/payment', '/payment-status', '/create-payment', '/payment-history'],
      },
      currencies: ['USD', 'EUR', 'GBP', 'JPY'],
      statuses: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    };

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const samplePayments: PaymentReference[] = [
      {
        reference: 'PAY-20241219-001-A1B2C3',
        userId: 'user001',
        telegramUsername: 'john_doe',
        amount: 150.0,
        currency: 'USD',
        notes: 'Monthly subscription payment',
        status: 'completed',
        createdAt: new Date('2024-12-19T10:00:00Z'),
        updatedAt: new Date('2024-12-19T10:05:00Z'),
        processedAt: new Date('2024-12-19T10:05:00Z'),
      },
      {
        reference: 'PAY-20241219-002-C4D5E6',
        userId: 'user002',
        telegramUsername: 'jane_smith',
        amount: 75.5,
        currency: 'EUR',
        notes: 'Premium feature upgrade',
        status: 'pending',
        createdAt: new Date('2024-12-19T11:00:00Z'),
        updatedAt: new Date('2024-12-19T11:00:00Z'),
      },
      {
        reference: 'PAY-20241219-003-F7G8H9',
        userId: 'user003',
        telegramUsername: 'bob_wilson',
        amount: 2500.0,
        currency: 'USD',
        notes: 'Large transaction for business account',
        status: 'processing',
        createdAt: new Date('2024-12-19T12:00:00Z'),
        updatedAt: new Date('2024-12-19T12:30:00Z'),
      },
    ];

    samplePayments.forEach(payment => {
      this.payments.set(payment.reference, payment);
    });
  }

  private generatePaymentReference(): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  private validatePayment(data: Partial<PaymentReference>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    this.config.validation.requiredFields.forEach(field => {
      if (!data[field as keyof PaymentReference]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate amount
    if (data.amount !== undefined) {
      if (data.amount < this.config.validation.minAmount) {
        errors.push(`Amount must be at least ${this.config.validation.minAmount}`);
      }
      if (data.amount > this.config.validation.maxAmount) {
        errors.push(`Amount cannot exceed ${this.config.validation.maxAmount}`);
      }
    }

    // Validate currency
    if (data.currency && !this.config.currencies.includes(data.currency)) {
      errors.push(`Invalid currency. Supported: ${this.config.currencies.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async createPayment(
    data: Omit<PaymentReference, 'reference' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<PaymentReference> {
    const validation = this.validatePayment(data);
    if (!validation.valid) {
      throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
    }

    const payment: PaymentReference = {
      ...data,
      reference: this.generatePaymentReference(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.payments.set(payment.reference, payment);

    // Simulate Telegram notification
    if (this.config.telegram.notifications && data.telegramUsername) {
      await this.sendTelegramNotification(payment);
    }

    return payment;
  }

  async getPaymentByReference(reference: string): Promise<PaymentReference | null> {
    return this.payments.get(reference) || null;
  }

  async getPaymentHistory(userId: string): Promise<PaymentReference[]> {
    return Array.from(this.payments.values()).filter(payment => payment.userId === userId);
  }

  async updatePaymentStatus(
    reference: string,
    status: PaymentReference['status']
  ): Promise<PaymentReference | null> {
    const payment = this.payments.get(reference);
    if (!payment) return null;

    payment.status = status;
    payment.updatedAt = new Date();

    if (status === 'completed' || status === 'failed') {
      payment.processedAt = new Date();
    }

    this.payments.set(reference, payment);

    // Simulate Telegram notification for status change
    if (this.config.telegram.notifications && payment.telegramUsername) {
      await this.sendTelegramStatusNotification(payment);
    }

    return payment;
  }

  async getAllPayments(): Promise<PaymentReference[]> {
    return Array.from(this.payments.values());
  }

  async getPaymentsByStatus(status: PaymentReference['status']): Promise<PaymentReference[]> {
    return Array.from(this.payments.values()).filter(payment => payment.status === status);
  }

  private async sendTelegramNotification(payment: PaymentReference): Promise<void> {
    console.info(`📱 Telegram notification sent to @${payment.telegramUsername}:`);
    console.info(`💰 New payment created: ${payment.reference}`);
    console.info(`💵 Amount: ${payment.currency} ${payment.amount}`);
    console.info(`📝 Notes: ${payment.notes}`);
    console.info(`⏰ Created: ${payment.createdAt.toLocaleString()}`);
  }

  private async sendTelegramStatusNotification(payment: PaymentReference): Promise<void> {
    console.info(`📱 Telegram status update sent to @${payment.telegramUsername}:`);
    console.info(`🔄 Payment ${payment.reference} status changed to: ${payment.status}`);
    console.info(`⏰ Updated: ${payment.updatedAt.toLocaleString()}`);
  }

  getSystemStats(): {
    totalPayments: number;
    totalAmount: number;
    statusBreakdown: Record<string, number>;
    currencyBreakdown: Record<string, number>;
  } {
    const payments = Array.from(this.payments.values());
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    const statusBreakdown: Record<string, number> = {};
    const currencyBreakdown: Record<string, number> = {};

    payments.forEach(payment => {
      statusBreakdown[payment.status] = (statusBreakdown[payment.status] || 0) + 1;
      currencyBreakdown[payment.currency] = (currencyBreakdown[payment.currency] || 0) + 1;
    });

    return {
      totalPayments: payments.length,
      totalAmount,
      statusBreakdown,
      currencyBreakdown,
    };
  }

  getConfiguration(): PaymentSystemConfig {
    return this.config;
  }
}

class PaymentReferenceDemo {
  private paymentSystem: PaymentReferenceSystem;

  constructor() {
    this.paymentSystem = new PaymentReferenceSystem();
  }

  async runCompleteDemo(): Promise<void> {
    console.info('🚀 Payment Reference System - Complete Demo');
    console.info('='.repeat(50));

    await this.showConfiguration();
    await this.showExistingPayments();
    await this.createNewPayment();
    await this.checkPaymentStatus();
    await this.updatePaymentStatus();
    await this.showPaymentHistory();
    await this.showSystemStats();
    await this.showTelegramIntegration();
  }

  private async showConfiguration(): Promise<void> {
    console.info('\n⚙️ System Configuration:');
    const config = this.paymentSystem.getConfiguration();
    console.info(`- Enabled: ${config.enabled}`);
    console.info(`- Reference Format: ${config.referenceFormat}`);
    console.info(`- Auto Generation: ${config.autoGeneration}`);
    console.info(`- Min Amount: ${config.validation.minAmount}`);
    console.info(`- Max Amount: ${config.validation.maxAmount}`);
    console.info(`- Supported Currencies: ${config.currencies.join(', ')}`);
    console.info(`- Payment Statuses: ${config.statuses.join(', ')}`);
    console.info(`- Telegram Commands: ${config.telegram.commands.join(', ')}`);
  }

  private async showExistingPayments(): Promise<void> {
    console.info('\n📋 Existing Payments:');
    const payments = await this.paymentSystem.getAllPayments();
    payments.forEach(payment => {
      console.info(
        `- ${payment.reference}: ${payment.currency} ${payment.amount} (${payment.status})`
      );
      console.info(`  User: ${payment.telegramUsername || 'N/A'} | Notes: ${payment.notes}`);
    });
  }

  private async createNewPayment(): Promise<void> {
    console.info('\n➕ Creating New Payment:');
    try {
      const newPayment = await this.paymentSystem.createPayment({
        userId: 'user004',
        telegramUsername: 'demo_user',
        amount: 99.99,
        currency: 'USD',
        notes: 'Demo payment for testing',
      });
      console.info(`✅ Payment created: ${newPayment.reference}`);
      console.info(`💰 Amount: ${newPayment.currency} ${newPayment.amount}`);
      console.info(`📱 Telegram notification sent to @${newPayment.telegramUsername}`);
    } catch (error) {
      console.error(`❌ Payment creation failed: ${error}`);
    }
  }

  private async checkPaymentStatus(): Promise<void> {
    console.info('\n🔍 Checking Payment Status:');
    const reference = 'PAY-20241219-001-A1B2C3';
    const payment = await this.paymentSystem.getPaymentByReference(reference);

    if (payment) {
      console.info(`✅ Payment found: ${payment.reference}`);
      console.info(`💰 Amount: ${payment.currency} ${payment.amount}`);
      console.info(`📊 Status: ${payment.status}`);
      console.info(`📅 Created: ${payment.createdAt.toLocaleString()}`);
    } else {
      console.info(`❌ Payment not found: ${reference}`);
    }
  }

  private async updatePaymentStatus(): Promise<void> {
    console.info('\n🔄 Updating Payment Status:');
    const reference = 'PAY-20241219-002-C4D5E6';
    const updatedPayment = await this.paymentSystem.updatePaymentStatus(reference, 'completed');

    if (updatedPayment) {
      console.info(`✅ Payment status updated: ${updatedPayment.reference}`);
      console.info(`📊 New Status: ${updatedPayment.status}`);
      console.info(`📱 Telegram notification sent to @${updatedPayment.telegramUsername}`);
    } else {
      console.info(`❌ Payment not found: ${reference}`);
    }
  }

  private async showPaymentHistory(): Promise<void> {
    console.info('\n📚 Payment History for User:');
    const userId = 'user001';
    const history = await this.paymentSystem.getPaymentHistory(userId);

    console.info(`User ${userId} has ${history.length} payments:`);
    history.forEach(payment => {
      console.info(
        `- ${payment.reference}: ${payment.currency} ${payment.amount} (${payment.status})`
      );
      console.info(`  Date: ${payment.createdAt.toLocaleDateString()}`);
    });
  }

  private async showSystemStats(): Promise<void> {
    console.info('\n📊 System Statistics:');
    const stats = this.paymentSystem.getSystemStats();

    console.info(`- Total Payments: ${stats.totalPayments}`);
    console.info(`- Total Amount: $${stats.totalAmount.toFixed(2)}`);
    console.info(`- Status Breakdown:`);
    Object.entries(stats.statusBreakdown).forEach(([status, count]) => {
      console.info(`  ${status}: ${count}`);
    });
    console.info(`- Currency Breakdown:`);
    Object.entries(stats.currencyBreakdown).forEach(([currency, count]) => {
      console.info(`  ${currency}: ${count}`);
    });
  }

  private async showTelegramIntegration(): Promise<void> {
    console.info('\n🤖 Telegram Bot Integration:');
    const config = this.paymentSystem.getConfiguration();

    console.info('Available Commands:');
    config.telegram.commands.forEach(command => {
      console.info(`- ${command}`);
    });

    console.info('\nExample Usage:');
    console.info('/payment - Show payment management menu');
    console.info('/payment-status PAY-20241219-001-A1B2C3 - Check specific payment');
    console.info("/create-payment 50.00 'Test payment' - Create new payment");
    console.info('/payment-history - View your payment history');

    console.info('\n📱 Notifications:');
    console.info(
      `- Payment Creation: ${config.telegram.notifications ? '✅ Enabled' : '❌ Disabled'}`
    );
    console.info(
      `- Status Updates: ${config.telegram.notifications ? '✅ Enabled' : '❌ Disabled'}`
    );
  }

  async runSpecificDemo(type: string): Promise<void> {
    switch (type) {
      case 'create':
        await this.createNewPayment();
        break;
      case 'status':
        await this.checkPaymentStatus();
        break;
      case 'history':
        await this.showPaymentHistory();
        break;
      case 'telegram':
        await this.showTelegramIntegration();
        break;
      case 'test':
        await this.runCompleteDemo();
        break;
      default:
        console.info('Available demo types: create, status, history, telegram, test');
        console.info('Usage: bun run payment:demo [type]');
    }
  }
}

async function main(): Promise<void> {
  const demo = new PaymentReferenceDemo();
  const args = process.argv.slice(2);

  if (args.length > 0) {
    await demo.runSpecificDemo(args[0]);
  } else {
    console.info('🚀 Running complete payment reference demo...');
    await demo.runCompleteDemo();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { PaymentReferenceSystem, PaymentReferenceDemo };
