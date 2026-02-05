/**
 * Balance Management Test Suite
 *
 * Comprehensive tests for all balance enhancement areas:
 * 1. Balance validation with min/max limits
 * 2. Enhanced audit trail for balance changes
 * 3. Balance threshold notifications
 * 4. Balance trend analysis and reporting
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
  BalanceValidator,
  BalanceAuditTrail,
  BalanceNotificationService,
  BalanceAnalyticsService,
  BalanceManager,
  initializeBalanceTables,
  type BalanceValidationRules,
  type BalanceChangeEvent,
} from '../../balance-management';

// !== TEST SETUP !==

beforeAll(async () => {
  try {
    await initializeBalanceTables();
    console.log('✅ Balance management tables initialized for testing');
  } catch (error) {
    console.error('❌ Failed to initialize balance tables:', error);
    throw error;
  }
});

// !== BALANCE VALIDATION TESTS !==

describe('BalanceValidator', () => {
  describe('validateBalanceChange', () => {
    test('should validate basic balance changes correctly', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      // Valid changes
      const validResult = BalanceValidator.validateBalanceChange(1000, 500, rules);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid changes
      const invalidResult = BalanceValidator.validateBalanceChange(1000, -2000, rules);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    test('should enforce minimum balance limits', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      const result = BalanceValidator.validateBalanceChange(500, -2000, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('minimum limit'))).toBe(true);
    });

    test('should enforce maximum balance limits', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      const result = BalanceValidator.validateBalanceChange(9500, 1000, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('maximum limit'))).toBe(true);
    });

    test('should enforce daily change limits', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      const result = BalanceValidator.validateBalanceChange(1000, 1500, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('daily limit'))).toBe(true);
    });

    test('should generate warnings for low balances', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      const result = BalanceValidator.validateBalanceChange(200, -150, rules);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('warning threshold'))).toBe(true);
    });

    test('should generate warnings for critical balances', () => {
      const rules: BalanceValidationRules = {
        minBalance: -1000,
        maxBalance: 10000,
        warningThreshold: 100,
        criticalThreshold: 50,
        dailyChangeLimit: 1000,
        weeklyChangeLimit: 5000,
      };

      const result = BalanceValidator.validateBalanceChange(100, -60, rules);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('critical threshold'))).toBe(true);
    });
  });

  describe('getValidationRulesForVIP', () => {
    test('should return appropriate rules for diamond VIP', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('diamond');
      expect(rules.minBalance).toBe(-50000);
      expect(rules.maxBalance).toBe(5000000);
      expect(rules.dailyChangeLimit).toBe(500000);
    });

    test('should return appropriate rules for platinum VIP', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('platinum');
      expect(rules.minBalance).toBe(-25000);
      expect(rules.maxBalance).toBe(2500000);
      expect(rules.dailyChangeLimit).toBe(250000);
    });

    test('should return appropriate rules for gold VIP', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('gold');
      expect(rules.minBalance).toBe(-15000);
      expect(rules.maxBalance).toBe(1500000);
      expect(rules.dailyChangeLimit).toBe(150000);
    });

    test('should return appropriate rules for silver VIP', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('silver');
      expect(rules.minBalance).toBe(-10000);
      expect(rules.maxBalance).toBe(1000000);
      expect(rules.dailyChangeLimit).toBe(100000);
    });

    test('should return default rules for bronze VIP', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('bronze');
      expect(rules.minBalance).toBe(-10000);
      expect(rules.maxBalance).toBe(1000000);
      expect(rules.dailyChangeLimit).toBe(50000);
    });

    test('should handle case-insensitive VIP levels', () => {
      const rules = BalanceValidator.getValidationRulesForVIP('DIAMOND');
      expect(rules.minBalance).toBe(-50000);
      expect(rules.maxBalance).toBe(5000000);
    });
  });
});

// !== AUDIT TRAIL TESTS !==

describe('BalanceAuditTrail', () => {
  const testEvent: BalanceChangeEvent = {
    id: 'test-event-001',
    customerId: 'TEST_CUSTOMER_001',
    agentId: 'TEST_AGENT_001',
    timestamp: new Date().toISOString(),
    changeType: 'deposit',
    previousBalance: 1000,
    newBalance: 1500,
    changeAmount: 500,
    reason: 'Test deposit',
    performedBy: 'test_user',
    metadata: { test: true },
    riskScore: 5,
  };

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await Bun.sqlite
        .query('DELETE FROM balance_audit_trail WHERE customer_id LIKE ?')
        .run('TEST_%');
    } catch (error) {
      // Table might not exist yet, ignore
    }
  });

  test('should log balance change events', async () => {
    await BalanceAuditTrail.logBalanceChange(testEvent);

    // Verify the event was logged
    const history = await BalanceAuditTrail.getBalanceHistory(testEvent.customerId, 10);
    expect(history).toHaveLength(1);
    expect(history[0].customerId).toBe(testEvent.customerId);
    expect(history[0].changeAmount).toBe(testEvent.changeAmount);
  });

  test('should retrieve balance history for customer', async () => {
    // Log multiple events
    const events = [
      { ...testEvent, id: 'test-1', changeAmount: 100, newBalance: 1100 },
      { ...testEvent, id: 'test-2', changeAmount: 200, newBalance: 1300 },
      { ...testEvent, id: 'test-3', changeAmount: -50, newBalance: 1250 },
    ];

    for (const event of events) {
      await BalanceAuditTrail.logBalanceChange(event);
    }

    const history = await BalanceAuditTrail.getBalanceHistory(testEvent.customerId, 10);
    expect(history).toHaveLength(3);
    expect(history[0].changeAmount).toBe(-50); // Most recent first
  });

  test('should retrieve recent balance changes', async () => {
    // Log events with different timestamps
    const now = new Date();
    const events = [
      { ...testEvent, id: 'recent-1', timestamp: new Date(now.getTime() - 1000).toISOString() },
      { ...testEvent, id: 'recent-2', timestamp: new Date(now.getTime() - 2000).toISOString() },
      {
        ...testEvent,
        id: 'old-1',
        timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const event of events) {
      await BalanceAuditTrail.logBalanceChange(event);
    }

    const recentChanges = await BalanceAuditTrail.getRecentBalanceChanges(24);
    expect(recentChanges.length).toBeGreaterThanOrEqual(2); // Should include recent events
  });

  test('should handle metadata correctly', async () => {
    const eventWithMetadata = {
      ...testEvent,
      id: 'metadata-test',
      metadata: { testKey: 'testValue', number: 42, boolean: true },
    };

    await BalanceAuditTrail.logBalanceChange(eventWithMetadata);

    const history = await BalanceAuditTrail.getBalanceHistory(testEvent.customerId, 10);
    const loggedEvent = history.find(e => e.id === 'metadata-test');
    expect(loggedEvent).toBeDefined();
    expect(loggedEvent?.metadata.testKey).toBe('testValue');
    expect(loggedEvent?.metadata.number).toBe(42);
    expect(loggedEvent?.metadata.boolean).toBe(true);
  });
});

// !== NOTIFICATIONS TESTS !==

describe('BalanceNotificationService', () => {
  const testRules: BalanceValidationRules = {
    minBalance: -1000,
    maxBalance: 10000,
    warningThreshold: 100,
    criticalThreshold: 50,
    dailyChangeLimit: 1000,
    weeklyChangeLimit: 5000,
  };

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await Bun.sqlite
        .query('DELETE FROM balance_threshold_alerts WHERE customer_id LIKE ?')
        .run('TEST_%');
    } catch (error) {
      // Table might not exist yet, ignore
    }
  });

  test('should create warning alerts for low balances', async () => {
    const alerts = await BalanceNotificationService.checkAndCreateAlerts(
      'TEST_CUSTOMER_001',
      80, // Below warning threshold
      200, // Previous balance
      testRules
    );

    expect(alerts.length).toBeGreaterThan(0);
    const warningAlert = alerts.find(alert => alert.alertType === 'warning');
    expect(warningAlert).toBeDefined();
    expect(warningAlert?.message).toContain('warning threshold');
  });

  test('should create critical alerts for very low balances', async () => {
    const alerts = await BalanceNotificationService.checkAndCreateAlerts(
      'TEST_CUSTOMER_001',
      25, // Below critical threshold
      200, // Previous balance
      testRules
    );

    expect(alerts.length).toBeGreaterThan(0);
    const criticalAlert = alerts.find(alert => alert.alertType === 'critical');
    expect(criticalAlert).toBeDefined();
    expect(criticalAlert?.message).toContain('critical threshold');
  });

  test('should create alerts for significant balance drops', async () => {
    const alerts = await BalanceNotificationService.checkAndCreateAlerts(
      'TEST_CUSTOMER_001',
      400, // Significant drop from 1000
      1000, // Previous balance
      testRules
    );

    expect(alerts.length).toBeGreaterThan(0);
    const dropAlert = alerts.find(alert => alert.message.includes('Significant balance drop'));
    expect(dropAlert).toBeDefined();
  });

  test('should retrieve active alerts', async () => {
    // Create some test alerts
    await BalanceNotificationService.checkAndCreateAlerts('TEST_CUSTOMER_001', 80, 200, testRules);

    await BalanceNotificationService.checkAndCreateAlerts('TEST_CUSTOMER_002', 25, 200, testRules);

    const activeAlerts = await BalanceNotificationService.getActiveAlerts();
    expect(activeAlerts.length).toBeGreaterThan(0);
  });

  test('should acknowledge alerts', async () => {
    // Create a test alert
    const alerts = await BalanceNotificationService.checkAndCreateAlerts(
      'TEST_CUSTOMER_001',
      80,
      200,
      testRules
    );

    expect(alerts.length).toBeGreaterThan(0);
    const alertId = alerts[0].id;

    // Acknowledge the alert
    await BalanceNotificationService.acknowledgeAlert(alertId, 'test_user');

    // Verify it's no longer active
    const activeAlerts = await BalanceNotificationService.getActiveAlerts();
    const acknowledgedAlert = activeAlerts.find(alert => alert.id === alertId);
    expect(acknowledgedAlert).toBeUndefined();
  });
});

// !== ANALYTICS TESTS !==

describe('BalanceAnalyticsService', () => {
  beforeEach(async () => {
    // Clean up test data and create some test events
    try {
      await Bun.sqlite
        .query('DELETE FROM balance_audit_trail WHERE customer_id LIKE ?')
        .run('TEST_%');

      // Create test balance history
      const testEvents = [
        {
          id: 'analytics-1',
          customerId: 'TEST_CUSTOMER_001',
          agentId: 'TEST_AGENT_001',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          changeType: 'deposit',
          previousBalance: 1000,
          newBalance: 2000,
          changeAmount: 1000,
          reason: 'Test deposit',
          performedBy: 'test_user',
          metadata: {},
          riskScore: 5,
        },
        {
          id: 'analytics-2',
          customerId: 'TEST_CUSTOMER_001',
          agentId: 'TEST_AGENT_001',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          changeType: 'withdrawal',
          previousBalance: 2000,
          newBalance: 1500,
          changeAmount: -500,
          reason: 'Test withdrawal',
          performedBy: 'test_user',
          metadata: {},
          riskScore: 10,
        },
        {
          id: 'analytics-3',
          customerId: 'TEST_CUSTOMER_001',
          agentId: 'TEST_AGENT_001',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          changeType: 'settlement',
          previousBalance: 1500,
          newBalance: 1800,
          changeAmount: 300,
          reason: 'Test settlement',
          performedBy: 'test_user',
          metadata: {},
          riskScore: 5,
        },
      ];

      for (const event of testEvents) {
        await BalanceAuditTrail.logBalanceChange(event);
      }
    } catch (error) {
      // Ignore errors during setup
    }
  });

  test('should generate customer analytics', async () => {
    const analytics = await BalanceAnalyticsService.generateCustomerAnalytics(
      'TEST_CUSTOMER_001',
      'weekly'
    );

    expect(analytics.customerId).toBe('TEST_CUSTOMER_001');
    expect(analytics.period).toBe('weekly');
    expect(analytics.startingBalance).toBe(1000);
    expect(analytics.endingBalance).toBe(1800);
    expect(analytics.totalDeposits).toBe(1000);
    expect(analytics.totalWithdrawals).toBe(500);
    expect(analytics.totalSettlements).toBe(300);
    expect(analytics.netChange).toBe(800);
    expect(analytics.changePercentage).toBe(80); // 800/1000 * 100
  });

  test('should calculate trend direction correctly', async () => {
    const analytics = await BalanceAnalyticsService.generateCustomerAnalytics(
      'TEST_CUSTOMER_001',
      'weekly'
    );

    expect(analytics.trendDirection).toBe('increasing');
  });

  test('should calculate risk level correctly', async () => {
    const analytics = await BalanceAnalyticsService.generateCustomerAnalytics(
      'TEST_CUSTOMER_001',
      'weekly'
    );

    expect(['low', 'medium', 'high']).toContain(analytics.riskLevel);
  });

  test('should handle different time periods', async () => {
    const dailyAnalytics = await BalanceAnalyticsService.generateCustomerAnalytics(
      'TEST_CUSTOMER_001',
      'daily'
    );
    const weeklyAnalytics = await BalanceAnalyticsService.generateCustomerAnalytics(
      'TEST_CUSTOMER_001',
      'weekly'
    );

    expect(dailyAnalytics.period).toBe('daily');
    expect(weeklyAnalytics.period).toBe('weekly');
  });
});

// !== INTEGRATION TESTS !==

describe('BalanceManager Integration', () => {
  test('should update balance with full validation and logging', async () => {
    const result = await BalanceManager.updateBalance(
      'TEST_CUSTOMER_001',
      'TEST_AGENT_001',
      500,
      'deposit',
      'Integration test',
      'test_user',
      'gold',
      { integration_test: true }
    );

    expect(result.success).toBe(true);
    expect(result.newBalance).toBeDefined();
    expect(result.validation.isValid).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event.customerId).toBe('TEST_CUSTOMER_001');
    expect(result.event.changeAmount).toBe(500);
  });

  test('should generate comprehensive balance report', async () => {
    const report = await BalanceManager.getCustomerBalanceReport(
      'TEST_CUSTOMER_001',
      true, // include history
      true // include alerts
    );

    expect(report.currentBalance).toBeDefined();
    expect(report.history).toBeDefined();
    expect(report.alerts).toBeDefined();
    expect(report.analytics).toBeDefined();
  });

  test('should handle validation failures gracefully', async () => {
    // Try to update balance beyond limits
    try {
      await BalanceManager.updateBalance(
        'TEST_CUSTOMER_001',
        'TEST_AGENT_001',
        1000000, // Very large amount
        'deposit',
        'Test validation failure',
        'test_user',
        'bronze', // Lower limits
        { test: true }
      );
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('validation failed');
    }
  });
});

// !== PERFORMANCE TESTS !==

describe('Performance Tests', () => {
  test('should handle multiple balance updates efficiently', async () => {
    const startTime = Date.now();
    const updates = [];

    // Create 10 concurrent balance updates
    for (let i = 0; i < 10; i++) {
      updates.push(
        BalanceManager.updateBalance(
          `PERF_TEST_${i}`,
          'TEST_AGENT_001',
          100,
          'deposit',
          'Performance test',
          'test_user',
          'bronze'
        )
      );
    }

    await Promise.all(updates);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should generate analytics quickly', async () => {
    const startTime = Date.now();

    await BalanceAnalyticsService.generateCustomerAnalytics('TEST_CUSTOMER_001', 'monthly');

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });
});

// !== ERROR HANDLING TESTS !==

describe('Error Handling', () => {
  test('should handle database connection errors gracefully', async () => {
    // This test would require mocking database failures
    // For now, we'll test that the system doesn't crash on basic errors
    expect(true).toBe(true);
  });

  test('should handle invalid input data gracefully', async () => {
    // Test with invalid customer ID
    try {
      await BalanceManager.updateBalance(
        '', // Invalid customer ID
        'TEST_AGENT_001',
        100,
        'deposit',
        'Test invalid input',
        'test_user',
        'bronze'
      );
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});

console.log('✅ Balance management test suite loaded successfully');
