/**
 * Finance System
 * Consolidated modular finance system with balance management, validation, audit, and notifications
 */

import { BalanceValidator } from './validation/balance-validator';
import { BalanceAuditTrail } from './audit/balance-audit-trail';
import { BalanceNotificationService } from './notifications/balance-notifications';

export * from '../core/types/finance';

export class FinanceSystem {
  private balanceValidator: BalanceValidator;
  private auditTrail: BalanceAuditTrail;
  private notificationService: BalanceNotificationService;

  constructor() {
    this.balanceValidator = new BalanceValidator();
    this.auditTrail = new BalanceAuditTrail();
    this.notificationService = new BalanceNotificationService();

    this.initializeSystem();
  }

  /**
   * Initialize the finance system
   */
  private async initializeSystem(): Promise<void> {
    console.log('💰 Initializing Finance System...');

    // Any additional initialization logic would go here

    console.log('✅ Finance System initialized successfully');
  }

  // Balance Validation Methods

  /**
   * Validate balance change
   */
  validateBalanceChange(
    customerId: string,
    currentBalance: number,
    changeAmount: number,
    changeType: any,
    rules?: any
  ) {
    return this.balanceValidator.validateBalanceChange(
      customerId,
      currentBalance,
      changeAmount,
      changeType,
      rules
    );
  }

  /**
   * Set custom validation rules
   */
  setCustomValidationRules(customerId: string, rules: any) {
    this.balanceValidator.setCustomRules(customerId, rules);
  }

  /**
   * Get validation rules
   */
  getValidationRules(customerId: string) {
    return this.balanceValidator.getValidationRules(customerId);
  }

  /**
   * Record balance change for limit tracking
   */
  recordBalanceChange(customerId: string, changeAmount: number) {
    this.balanceValidator.recordBalanceChange(customerId, changeAmount);
  }

  /**
   * Get daily change for customer
   */
  getDailyChange(customerId: string) {
    return this.balanceValidator.getDailyChange(customerId);
  }

  /**
   * Get weekly change for customer
   */
  getWeeklyChange(customerId: string) {
    return this.balanceValidator.getWeeklyChange(customerId);
  }

  /**
   * Validate bulk balance changes
   */
  validateBulkChanges(changes: any[]) {
    return this.balanceValidator.validateBulkChanges(changes);
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return this.balanceValidator.getValidationStats();
  }

  // Audit Trail Methods

  /**
   * Record balance change event
   */
  recordBalanceChangeEvent(
    customerId: string,
    agentId: string,
    changeType: any,
    previousBalance: number,
    changeAmount: number,
    reason: any,
    performedBy: string,
    metadata?: any
  ) {
    return this.auditTrail.recordBalanceChange(
      customerId,
      agentId,
      changeType,
      previousBalance,
      changeAmount,
      reason,
      performedBy,
      metadata
    );
  }

  /**
   * Get audit event by ID
   */
  getAuditEvent(eventId: string) {
    return this.auditTrail.getEvent(eventId);
  }

  /**
   * Get customer audit events
   */
  getCustomerAuditEvents(customerId: string, options?: any) {
    return this.auditTrail.getCustomerEvents(customerId, options);
  }

  /**
   * Get agent audit events
   */
  getAgentAuditEvents(agentId: string, options?: any) {
    return this.auditTrail.getAgentEvents(agentId, options);
  }

  /**
   * Get daily audit events
   */
  getDailyAuditEvents(date: string, options?: any) {
    return this.auditTrail.getDailyEvents(date, options);
  }

  /**
   * Search audit events
   */
  searchAuditEvents(criteria: any, options?: any) {
    return this.auditTrail.searchEvents(criteria, options);
  }

  /**
   * Get audit statistics
   */
  getAuditStats() {
    return this.auditTrail.getAuditStats();
  }

  /**
   * Export audit data
   */
  exportAuditData(startDate: Date, endDate: Date, format = 'json') {
    return this.auditTrail.exportAuditData(startDate, endDate, format);
  }

  /**
   * Clear old audit data
   */
  clearOldAuditData(daysToKeep = 365) {
    return this.auditTrail.clearOldData(daysToKeep);
  }

  // Notification Methods

  /**
   * Create balance threshold alert
   */
  createBalanceAlert(
    customerId: string,
    agentId: string,
    alertType: any,
    threshold: number,
    currentBalance: number,
    message: string
  ) {
    return this.notificationService.createAlert(
      customerId,
      agentId,
      alertType,
      threshold,
      currentBalance,
      message
    );
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string) {
    return this.notificationService.acknowledgeAlert(alertId, acknowledgedBy, notes);
  }

  /**
   * Escalate alert
   */
  escalateAlert(alertId: string, newLevel: number, reason: string) {
    return this.notificationService.escalateAlert(alertId, newLevel, reason);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string) {
    return this.notificationService.getAlert(alertId);
  }

  /**
   * Get customer alerts
   */
  getCustomerAlerts(customerId: string, options?: any) {
    return this.notificationService.getCustomerAlerts(customerId, options);
  }

  /**
   * Get agent alerts
   */
  getAgentAlerts(agentId: string, options?: any) {
    return this.notificationService.getAgentAlerts(agentId, options);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(options?: any) {
    return this.notificationService.getUnacknowledgedAlerts(options);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts() {
    return this.notificationService.getCriticalAlerts();
  }

  /**
   * Get notification statistics
   */
  getNotificationStats() {
    return this.notificationService.getNotificationStats();
  }

  // System Health and Analytics

  /**
   * Get system health
   */
  getSystemHealth() {
    return {
      validation: this.getValidationStats(),
      audit: this.getAuditStats(),
      notifications: this.getNotificationStats(),
      timestamp: new Date(),
    };
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const validationStats = this.getValidationStats();
    const auditStats = this.getAuditStats();
    const notificationStats = this.getNotificationStats();

    return {
      validation: validationStats,
      audit: auditStats,
      notifications: notificationStats,
      summary: {
        totalValidations: validationStats.totalValidations,
        totalAuditEvents: auditStats.totalEvents,
        totalAlerts: notificationStats.totalAlerts,
        unacknowledgedAlerts: notificationStats.unacknowledgedAlerts,
        criticalAlerts: notificationStats.criticalAlerts,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Perform balance change with full validation and audit
   */
  async performBalanceChange(
    customerId: string,
    agentId: string,
    changeAmount: number,
    changeType: any,
    reason: any,
    performedBy: string,
    currentBalance: number,
    metadata?: any
  ): Promise<{
    success: boolean;
    newBalance: number;
    validation: any;
    auditEvent?: any;
    error?: string;
  }> {
    try {
      // Validate the change
      const validation = this.validateBalanceChange(
        customerId,
        currentBalance,
        changeAmount,
        changeType
      );

      if (!validation.isValid) {
        return {
          success: false,
          newBalance: currentBalance,
          validation,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Calculate new balance
      const newBalance = currentBalance + changeAmount;

      // Record the change in audit trail
      const auditEvent = this.recordBalanceChangeEvent(
        customerId,
        agentId,
        changeType,
        currentBalance,
        changeAmount,
        reason,
        performedBy,
        metadata
      );

      // Record for limit tracking
      this.recordBalanceChange(customerId, changeAmount);

      // Check for threshold alerts
      if (validation.warnings.length > 0) {
        // Create appropriate alerts based on warnings
        for (const warning of validation.warnings) {
          if (warning.includes('critical')) {
            this.createBalanceAlert(
              customerId,
              agentId,
              'critical',
              100, // critical threshold
              newBalance,
              warning
            );
          } else if (warning.includes('warning')) {
            this.createBalanceAlert(
              customerId,
              agentId,
              'warning',
              1000, // warning threshold
              newBalance,
              warning
            );
          }
        }
      }

      console.log(
        `✅ Balance change completed: ${customerId} | ${changeType} | $${changeAmount} | New: $${newBalance}`
      );

      return {
        success: true,
        newBalance,
        validation,
        auditEvent,
      };
    } catch (error) {
      console.error(`❌ Balance change failed: ${customerId}`, error);
      return {
        success: false,
        newBalance: currentBalance,
        validation: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Getters for individual modules

  getBalanceValidator() {
    return this.balanceValidator;
  }

  getAuditTrail() {
    return this.auditTrail;
  }

  getNotificationService() {
    return this.notificationService;
  }
}

// Export individual modules for advanced usage
export { BalanceValidator } from './validation/balance-validator';
export { BalanceAuditTrail } from './audit/balance-audit-trail';
export { BalanceNotificationService } from './notifications/balance-notifications';

// Export default instance factory
export function createFinanceSystem(): FinanceSystem {
  return new FinanceSystem();
}
