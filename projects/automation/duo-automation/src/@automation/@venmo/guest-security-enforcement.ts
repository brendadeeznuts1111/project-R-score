#!/usr/bin/env bun

/**
 * Guest Security & Repayment Enforcement
 * 
 * ACME's sophisticated security system for guest payments with automatic
 * repayment enforcement and inviter notifications. Since 1972, we've protected
 * family finances while maintaining trust and relationships.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface GuestPaymentRule {
  memberId: string;
  ruleType: 'preauth_hold' | 'concurrent_limit' | 'repayment_reminder' | 'inviter_alert';
  parameters: Record<string, any>;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

interface GuestTransaction {
  id: string;
  guestId: string;
  amount: number;
  currency: string;
  description: string;
  recipientId: string;
  recipientName: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  requiresRepayment: boolean;
  repaymentAmount: number;
  repaymentDue: Date;
  repaymentStatus: 'pending' | 'completed' | 'overdue';
  inviterId: string;
  inviterNotified: boolean;
  frontingMemberId?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

interface RepaymentReminder {
  id: string;
  transactionId: string;
  guestId: string;
  inviterId: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  type: '24h_warning' | '48h_overdue' | '72h_escalation';
  message: string;
}

interface SecurityAlert {
  id: string;
  type: 'payment_attempt' | 'repayment_overdue' | 'suspicious_activity' | 'rule_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  memberId: string;
  guestId?: string;
  transactionId?: string;
  message: string;
  data: Record<string, any>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

class GuestSecurityEnforcement {
  private static readonly RULES_FILE = 'data/guest-security-rules.json';
  private static readonly TRANSACTIONS_FILE = 'data/guest-transactions.json';
  private static readonly REMINDERS_FILE = 'data/repayment-reminders.json';
  private static readonly ALERTS_FILE = 'data/security-alerts.json';
  
  // ACME's security thresholds - refined over 50+ years
  private static readonly SECURITY_THRESHOLDS = {
    GUEST_MAX_SINGLE_PAYMENT: 50.00,
    GUEST_MAX_DAILY_TOTAL: 100.00,
    GUEST_MAX_CONCURRENT: 1,
    REPAYMENT_DEADLINE_HOURS: 24,
    OVERDUE_ESCALATION_HOURS: [48, 72],
    PREAUTH_HOLD_PERCENTAGE: 1.1, // 110% of payment amount
    SUSPICIOUS_ACTIVITY_THRESHOLD: 3 // Failed attempts in 1 hour
  };

  /**
   * Enforce guest payment security rules
   */
  static async enforceGuestPaymentRules(
    guestId: string,
    amount: number,
    recipientId: string,
    paymentMethod: string
  ): Promise<{
    allowed: boolean;
    requiresFronting: boolean;
    frontingMemberId?: string;
    securityChecks: string[];
    warnings: string[];
    blockedReason?: string;
  }> {
    
    const securityChecks: string[] = [];
    const warnings: string[] = [];
    let allowed = true;
    let requiresFronting = false;
    let frontingMemberId: string | undefined;
    let blockedReason: string | undefined;

    // Load guest security rules
    const rules = await this.getGuestSecurityRules(guestId);
    
    // Check 1: Single payment limit
    if (amount > this.SECURITY_THRESHOLDS.GUEST_MAX_SINGLE_PAYMENT) {
      allowed = false;
      blockedReason = `Payment amount $${amount} exceeds guest limit of $${this.SECURITY_THRESHOLDS.GUEST_MAX_SINGLE_PAYMENT}`;
      securityChecks.push('single_payment_limit_exceeded');
    }

    // Check 2: Daily spending limit
    const dailyTotal = await this.getGuestDailyTotal(guestId);
    if (dailyTotal + amount > this.SECURITY_THRESHOLDS.GUEST_MAX_DAILY_TOTAL) {
      allowed = false;
      blockedReason = `Daily total $${dailyTotal + amount} would exceed guest limit of $${this.SECURITY_THRESHOLDS.GUEST_MAX_DAILY_TOTAL}`;
      securityChecks.push('daily_limit_exceeded');
    }

    // Check 3: Concurrent transaction limit
    const concurrentCount = await this.getGuestConcurrentTransactions(guestId);
    if (concurrentCount >= this.SECURITY_THRESHOLDS.GUEST_MAX_CONCURRENT) {
      allowed = false;
      blockedReason = `Guest has ${concurrentCount} concurrent transactions (limit: ${this.SECURITY_THRESHOLDS.GUEST_MAX_CONCURRENT})`;
      securityChecks.push('concurrent_limit_exceeded');
    }

    // Check 4: Suspicious activity detection
    const suspiciousActivity = await this.detectSuspiciousActivity(guestId);
    if (suspiciousActivity) {
      allowed = false;
      blockedReason = 'Suspicious activity detected';
      securityChecks.push('suspicious_activity');
      await this.createSecurityAlert('suspicious_activity', 'high', guestId, null, null, suspiciousActivity);
    }

    // Check 5: Payment method validation
    const methodValidation = await this.validatePaymentMethod(guestId, paymentMethod, amount);
    if (!methodValidation.valid) {
      allowed = false;
      blockedReason = methodValidation.reason;
      securityChecks.push('payment_method_invalid');
    }

    // If allowed, determine if fronting is required
    if (allowed) {
      const frontingDecision = await this.determineFrontingRequirement(guestId, amount, recipientId);
      requiresFronting = frontingDecision.required;
      frontingMemberId = frontingDecision.frontingMemberId;
      
      if (requiresFronting) {
        securityChecks.push('fronting_required');
        warnings.push('Payment will be fronted by family member');
      }
    }

    // Log security check
    await this.logSecurityCheck(guestId, amount, recipientId, allowed, securityChecks, warnings);

    return {
      allowed,
      requiresFronting,
      frontingMemberId,
      securityChecks,
      warnings,
      blockedReason
    };
  }

  /**
   * Create guest transaction with repayment tracking
   */
  static async createGuestTransaction(params: {
    guestId: string;
    amount: number;
    currency: string;
    description: string;
    recipientId: string;
    recipientName: string;
    paymentMethod: string;
    inviterId: string;
    frontingMemberId?: string;
  }): Promise<GuestTransaction> {
    
    const transactionId = randomUUID();
    const now = new Date();
    const repaymentDue = new Date(now.getTime() + this.SECURITY_THRESHOLDS.REPAYMENT_DEADLINE_HOURS * 60 * 60 * 1000);

    const transaction: GuestTransaction = {
      id: transactionId,
      guestId: params.guestId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      paymentMethod: params.paymentMethod,
      status: 'pending',
      requiresRepayment: true,
      repaymentAmount: params.amount,
      repaymentDue,
      repaymentStatus: 'pending',
      inviterId: params.inviterId,
      inviterNotified: false,
      frontingMemberId: params.frontingMemberId,
      createdAt: now,
      metadata: {
        securityEnforced: true,
        repaymentTracking: true
      }
    };

    await this.saveTransaction(transaction);

    // Schedule repayment reminders
    await this.scheduleRepaymentReminders(transaction);

    // Notify inviter of guest payment
    await this.notifyInviterOfPayment(transaction);

    console.log(`💰 Created guest transaction: ${transactionId} for $${params.amount}`);
    console.log(`📅 Repayment due: ${repaymentDue.toISOString()}`);

    return transaction;
  }

  /**
   * Complete guest transaction and start repayment tracking
   */
  static async completeGuestTransaction(
    transactionId: string,
    actualAmount?: number
  ): Promise<GuestTransaction> {
    
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    // Update transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    if (actualAmount) {
      transaction.amount = actualAmount;
      transaction.repaymentAmount = actualAmount;
    }

    await this.saveTransaction(transaction);

    // Start repayment tracking
    await this.startRepaymentTracking(transaction);

    console.log(`✅ Completed guest transaction: ${transactionId}`);
    console.log(`💳 Repayment tracking started for $${transaction.repaymentAmount}`);

    return transaction;
  }

  /**
   * Process guest repayment
   */
  static async processGuestRepayment(
    transactionId: string,
    repaymentAmount: number,
    paymentMethod: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    transaction?: GuestTransaction;
    overpayment?: number;
    message?: string;
  }> {
    
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.repaymentStatus === 'completed') {
      return { success: false, message: 'Repayment already completed' };
    }

    if (repaymentAmount < transaction.repaymentAmount) {
      return { success: false, message: 'Partial repayment not supported' };
    }

    // Process repayment
    transaction.repaymentStatus = 'completed';
    transaction.metadata = {
      ...transaction.metadata,
      repaidAt: new Date().toISOString(),
      repaymentMethod: paymentMethod,
      repaymentAmount,
      ...metadata
    };

    await this.saveTransaction(transaction);

    // Update guest trust score
    await this.updateGuestTrustForRepayment(transaction.guestId, true);

    // Notify inviter of repayment
    await this.notifyInviterOfRepayment(transaction);

    // Cancel pending reminders
    await this.cancelRepaymentReminders(transactionId);

    const overpayment = repaymentAmount - transaction.repaymentAmount;

    console.log(`💳 Processed guest repayment: $${repaymentAmount} for transaction ${transactionId}`);
    if (overpayment > 0) {
      console.log(`💰 Overpayment: $${overpayment}`);
    }

    return {
      success: true,
      transaction,
      overpayment: overpayment > 0 ? overpayment : undefined,
      message: 'Repayment processed successfully'
    };
  }

  /**
   * Check for overdue repayments and send alerts
   */
  static async checkOverdueRepayments(): Promise<{
    overdueCount: number;
    escalatedCount: number;
    alertsCreated: number;
  }> {
    
    const transactions = await this.loadTransactions();
    const now = new Date();
    
    let overdueCount = 0;
    let escalatedCount = 0;
    let alertsCreated = 0;

    for (const transaction of Object.values(transactions)) {
      if (transaction.repaymentStatus === 'pending' && now > transaction.repaymentDue) {
        overdueCount++;

        const hoursOverdue = Math.floor((now.getTime() - transaction.repaymentDue.getTime()) / (60 * 60 * 1000));

        // Check for escalation thresholds
        if (this.SECURITY_THRESHOLDS.OVERDUE_ESCALATION_HOURS.includes(hoursOverdue)) {
          escalatedCount++;
          await this.escalateOverduePayment(transaction, hoursOverdue);
          alertsCreated++;
        }

        // Notify inviter if not already notified
        if (!transaction.inviterNotified) {
          await this.notifyInviterOfOverduePayment(transaction);
          transaction.inviterNotified = true;
          await this.saveTransaction(transaction);
        }
      }
    }

    console.log(`🚨 Overdue repayment check: ${overdueCount} overdue, ${escalatedCount} escalated, ${alertsCreated} alerts created`);

    return { overdueCount, escalatedCount, alertsCreated };
  }

  /**
   * Get guest security rules
   */
  private static async getGuestSecurityRules(guestId: string): Promise<GuestPaymentRule[]> {
    const rules = await this.loadSecurityRules();
    return Object.values(rules).filter(rule => rule.memberId === guestId && rule.active);
  }

  /**
   * Get guest's daily total spending
   */
  private static async getGuestDailyTotal(guestId: string): Promise<number> {
    const transactions = await this.loadTransactions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTransactions = Object.values(transactions).filter(t => 
      t.guestId === guestId && 
      t.status === 'completed' && 
      t.createdAt >= today
    );

    return dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Get guest's concurrent transaction count
   */
  private static async getGuestConcurrentTransactions(guestId: string): Promise<number> {
    const transactions = await this.loadTransactions();
    return Object.values(transactions).filter(t => 
      t.guestId === guestId && 
      ['pending', 'completed'].includes(t.status) &&
      t.repaymentStatus === 'pending'
    ).length;
  }

  /**
   * Detect suspicious activity
   */
  private static async detectSuspiciousActivity(guestId: string): Promise<Record<string, any> | null> {
    const transactions = await this.loadTransactions();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentFailures = Object.values(transactions).filter(t => 
      t.guestId === guestId && 
      t.status === 'failed' && 
      t.createdAt >= oneHourAgo
    );

    if (recentFailures.length >= this.SECURITY_THRESHOLDS.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      return {
        reason: 'Multiple failed payment attempts',
        count: recentFailures.length,
        timeframe: '1 hour',
        transactions: recentFailures.map(t => ({ id: t.id, amount: t.amount, timestamp: t.createdAt }))
      };
    }

    return null;
  }

  /**
   * Validate payment method for guest
   */
  private static async validatePaymentMethod(
    guestId: string,
    paymentMethod: string,
    amount: number
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // Guests can use any enabled payment method
    // Additional validation could be added here
    return { valid: true };
  }

  /**
   * Determine if fronting is required
   */
  private static async determineFrontingRequirement(
    guestId: string,
    amount: number,
    recipientId: string
  ): Promise<{ required: boolean; frontingMemberId?: string }> {
    
    // For guests, fronting is typically required for amounts over $25
    if (amount > 25) {
      // Find suitable family member to front
      const frontingMemberId = await this.findFrontingMember(guestId, recipientId);
      return { required: true, frontingMemberId };
    }

    return { required: false };
  }

  /**
   * Find family member to front payment
   */
  private static async findFrontingMember(guestId: string, recipientId: string): Promise<string | undefined> {
    // In production, this would find the most suitable family member
    // For now, return the inviter or a default member
    return 'alice-cousin'; // Simplified for demo
  }

  /**
   * Schedule repayment reminders
   */
  private static async scheduleRepaymentReminders(transaction: GuestTransaction): Promise<void> {
    const reminders: RepaymentReminder[] = [];

    // 24-hour warning
    reminders.push({
      id: randomUUID(),
      transactionId: transaction.id,
      guestId: transaction.guestId,
      inviterId: transaction.inviterId,
      scheduledFor: new Date(transaction.repaymentDue.getTime() - 2 * 60 * 60 * 1000), // 2 hours before due
      sent: false,
      type: '24h_warning',
      message: `Reminder: Your $${transaction.repaymentAmount} repayment is due in 2 hours`
    });

    // 48-hour overdue
    reminders.push({
      id: randomUUID(),
      transactionId: transaction.id,
      guestId: transaction.guestId,
      inviterId: transaction.inviterId,
      scheduledFor: new Date(transaction.repaymentDue.getTime() + 48 * 60 * 60 * 1000),
      sent: false,
      type: '48h_overdue',
      message: `URGENT: Your $${transaction.repaymentAmount} repayment is 48 hours overdue`
    });

    // 72-hour escalation
    reminders.push({
      id: randomUUID(),
      transactionId: transaction.id,
      guestId: transaction.guestId,
      inviterId: transaction.inviterId,
      scheduledFor: new Date(transaction.repaymentDue.getTime() + 72 * 60 * 60 * 1000),
      sent: false,
      type: '72h_escalation',
      message: `CRITICAL: Your $${transaction.repaymentAmount} repayment is 72 hours overdue. Account access may be restricted.`
    });

    for (const reminder of reminders) {
      await this.saveRepaymentReminder(reminder);
    }
  }

  /**
   * Start repayment tracking
   */
  private static async startRepaymentTracking(transaction: GuestTransaction): Promise<void> {
    console.log(`📊 Starting repayment tracking for transaction ${transaction.id}`);
    // Integration with repayment tracking system
  }

  /**
   * Update guest trust score for repayment
   */
  private static async updateGuestTrustForRepayment(guestId: string, onTime: boolean): Promise<void> {
    const adjustment = onTime ? 5 : -3;
    console.log(`📈 Updating guest trust for ${guestId}: ${adjustment > 0 ? '+' : ''}${adjustment}`);
    // Integration with trust score system
  }

  /**
   * Escalate overdue payment
   */
  private static async escalateOverduePayment(transaction: GuestTransaction, hoursOverdue: number): Promise<void> {
    await this.createSecurityAlert(
      'repayment_overdue',
      hoursOverdue >= 72 ? 'critical' : 'high',
      transaction.guestId,
      transaction.id,
      transaction.inviterId,
      {
        hoursOverdue,
        amount: transaction.repaymentAmount,
        dueDate: transaction.repaymentDue
      }
    );
  }

  /**
   * Create security alert
   */
  private static async createSecurityAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    memberId: string,
    guestId?: string,
    transactionId?: string,
    data?: Record<string, any>
  ): Promise<void> {
    
    const alert: SecurityAlert = {
      id: randomUUID(),
      type,
      severity,
      memberId,
      guestId,
      transactionId,
      message: this.generateAlertMessage(type, data),
      data: data || {},
      createdAt: new Date(),
      acknowledged: false
    };

    await this.saveSecurityAlert(alert);
    console.log(`🚨 Security alert created: ${type} - ${severity}`);
  }

  /**
   * Generate alert message
   */
  private static generateAlertMessage(type: SecurityAlert['type'], data?: Record<string, any>): string {
    switch (type) {
      case 'repayment_overdue':
        return `Guest payment overdue by ${data?.hoursOverdue || 0} hours`;
      case 'suspicious_activity':
        return `Suspicious activity detected: ${data?.reason || 'Unknown'}`;
      case 'payment_attempt':
        return `Payment attempt blocked: ${data?.reason || 'Security violation'}`;
      default:
        return 'Security alert triggered';
    }
  }

  /**
   * Notification methods (placeholders for integration)
   */
  private static async notifyInviterOfPayment(transaction: GuestTransaction): Promise<void> {
    console.log(`📱 Notifying inviter ${transaction.inviterId} of guest payment: $${transaction.amount}`);
  }

  private static async notifyInviterOfOverduePayment(transaction: GuestTransaction): Promise<void> {
    console.log(`🚨 Notifying inviter ${transaction.inviterId} of overdue payment: $${transaction.repaymentAmount}`);
  }

  private static async notifyInviterOfRepayment(transaction: GuestTransaction): Promise<void> {
    console.log(`✅ Notifying inviter ${transaction.inviterId} of repayment: $${transaction.repaymentAmount}`);
  }

  private static async logSecurityCheck(
    guestId: string,
    amount: number,
    recipientId: string,
    allowed: boolean,
    checks: string[],
    warnings: string[]
  ): Promise<void> {
    console.log(`🔒 Security check for guest ${guestId}: $${amount} -> ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
    if (checks.length > 0) console.log(`  Checks: ${checks.join(', ')}`);
    if (warnings.length > 0) console.log(`  Warnings: ${warnings.join(', ')}`);
  }

  /**
   * Data persistence methods
   */
  private static async loadSecurityRules(): Promise<Record<string, GuestPaymentRule>> {
    try {
      if (!existsSync(this.RULES_FILE)) {
        return {};
      }
      const data = readFileSync(this.RULES_FILE, 'utf-8');
      const rules = JSON.parse(data);
      
      for (const [id, rule] of Object.entries(rules)) {
        const r = rule as any;
        r.createdAt = new Date(r.createdAt);
        if (r.lastTriggered) {
          r.lastTriggered = new Date(r.lastTriggered);
        }
      }
      
      return rules;
    } catch (error) {
      console.error('Failed to load security rules:', error);
      return {};
    }
  }

  private static async loadTransactions(): Promise<Record<string, GuestTransaction>> {
    try {
      if (!existsSync(this.TRANSACTIONS_FILE)) {
        return {};
      }
      const data = readFileSync(this.TRANSACTIONS_FILE, 'utf-8');
      const transactions = JSON.parse(data);
      
      for (const [id, transaction] of Object.entries(transactions)) {
        const t = transaction as any;
        t.createdAt = new Date(t.createdAt);
        t.repaymentDue = new Date(t.repaymentDue);
        if (t.completedAt) {
          t.completedAt = new Date(t.completedAt);
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to load transactions:', error);
      return {};
    }
  }

  private static async saveTransaction(transaction: GuestTransaction): Promise<void> {
    const transactions = await this.loadTransactions();
    transactions[transaction.id] = transaction;
    
    try {
      writeFileSync(this.TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.error('Failed to save transaction:', error);
      throw error;
    }
  }

  private static async getTransaction(transactionId: string): Promise<GuestTransaction | null> {
    const transactions = await this.loadTransactions();
    return transactions[transactionId] || null;
  }

  private static async loadRepaymentReminders(): Promise<Record<string, RepaymentReminder>> {
    try {
      if (!existsSync(this.REMINDERS_FILE)) {
        return {};
      }
      const data = readFileSync(this.REMINDERS_FILE, 'utf-8');
      const reminders = JSON.parse(data);
      
      for (const [id, reminder] of Object.entries(reminders)) {
        const r = reminder as any;
        r.scheduledFor = new Date(r.scheduledFor);
        if (r.sentAt) {
          r.sentAt = new Date(r.sentAt);
        }
      }
      
      return reminders;
    } catch (error) {
      console.error('Failed to load repayment reminders:', error);
      return {};
    }
  }

  private static async saveRepaymentReminder(reminder: RepaymentReminder): Promise<void> {
    const reminders = await this.loadRepaymentReminders();
    reminders[reminder.id] = reminder;
    
    try {
      writeFileSync(this.REMINDERS_FILE, JSON.stringify(reminders, null, 2));
    } catch (error) {
      console.error('Failed to save repayment reminder:', error);
    }
  }

  private static async cancelRepaymentReminders(transactionId: string): Promise<void> {
    const reminders = await this.loadRepaymentReminders();
    
    for (const [id, reminder] of Object.entries(reminders)) {
      if (reminder.transactionId === transactionId && !reminder.sent) {
        reminder.sent = true;
        reminder.sentAt = new Date();
        reminders[id] = reminder;
      }
    }
    
    try {
      writeFileSync(this.REMINDERS_FILE, JSON.stringify(reminders, null, 2));
    } catch (error) {
      console.error('Failed to cancel repayment reminders:', error);
    }
  }

  private static async loadSecurityAlerts(): Promise<Record<string, SecurityAlert>> {
    try {
      if (!existsSync(this.ALERTS_FILE)) {
        return {};
      }
      const data = readFileSync(this.ALERTS_FILE, 'utf-8');
      const alerts = JSON.parse(data);
      
      for (const [id, alert] of Object.entries(alerts)) {
        const a = alert as any;
        a.createdAt = new Date(a.createdAt);
        if (a.acknowledgedAt) {
          a.acknowledgedAt = new Date(a.acknowledgedAt);
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Failed to load security alerts:', error);
      return {};
    }
  }

  private static async saveSecurityAlert(alert: SecurityAlert): Promise<void> {
    const alerts = await this.loadSecurityAlerts();
    alerts[alert.id] = alert;
    
    try {
      writeFileSync(this.ALERTS_FILE, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Failed to save security alert:', error);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const guestId = process.argv[3] || 'guest-sarah';

  switch (command) {
    case 'check':
      const amount = parseFloat(process.argv[4]) || 25.00;
      GuestSecurityEnforcement.enforceGuestPaymentRules(guestId, amount, 'bob-cousin', 'factory-wager')
        .then(result => {
          console.log('🔒 Security Check Result:');
          console.log(`Allowed: ${result.allowed}`);
          console.log(`Requires Fronting: ${result.requiresFronting}`);
          if (result.frontingMemberId) {
            console.log(`Fronting Member: ${result.frontingMemberId}`);
          }
          if (result.securityChecks.length > 0) {
            console.log(`Security Checks: ${result.securityChecks.join(', ')}`);
          }
          if (result.warnings.length > 0) {
            console.log(`Warnings: ${result.warnings.join(', ')}`);
          }
          if (result.blockedReason) {
            console.log(`Blocked: ${result.blockedReason}`);
          }
        })
        .catch(error => console.error('❌ Error:', error.message));
      break;

    case 'create-transaction':
      GuestSecurityEnforcement.createGuestTransaction({
        guestId,
        amount: 25.00,
        currency: 'USD',
        description: 'BBQ Supplies',
        recipientId: 'bob-cousin',
        recipientName: 'Bob',
        paymentMethod: 'factory-wager',
        inviterId: 'alice-cousin',
        frontingMemberId: 'alice-cousin'
      }).then(transaction => {
        console.log('💰 Guest Transaction Created:');
        console.log(`ID: ${transaction.id}`);
        console.log(`Amount: $${transaction.amount}`);
        console.log(`Repayment Due: ${transaction.repaymentDue.toISOString()}`);
        console.log(`Fronting Member: ${transaction.frontingMemberId}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'check-overdue':
      GuestSecurityEnforcement.checkOverdueRepayments().then(result => {
        console.log('🚨 Overdue Repayment Check:');
        console.log(`Overdue: ${result.overdueCount}`);
        console.log(`Escalated: ${result.escalatedCount}`);
        console.log(`Alerts Created: ${result.alertsCreated}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    default:
      console.log(`
🔒 Guest Security Enforcement - ACME's Protection System

Usage:
  guest-security check <guestId> <amount>     - Check payment security rules
  guest-security create-transaction <guestId> - Create guest transaction
  guest-security check-overdue                - Check for overdue repayments

Security Features:
✅ Payment amount and frequency limits
✅ Concurrent transaction controls
✅ Suspicious activity detection
✅ Automatic repayment tracking
✅ Inviter notifications and alerts
✅ Escalation for overdue payments

"Protecting family finances while maintaining trust" - ACME Since 1972 🎩
      `);
  }
}

export default GuestSecurityEnforcement;
export { GuestPaymentRule, GuestTransaction, RepaymentReminder, SecurityAlert };
