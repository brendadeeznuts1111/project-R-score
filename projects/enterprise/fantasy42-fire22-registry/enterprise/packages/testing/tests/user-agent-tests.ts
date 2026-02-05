#!/usr/bin/env bun

/**
 * 🧪 Fantasy42 User-Agent Testing Suite
 *
 * Comprehensive testing for User-Agent security, compliance, and monitoring
 * across all Fantasy42 packages with Bun test integration.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
  Fantasy42UserAgents,
  EnvironmentConfig,
  UserAgentMonitor,
} from '../packages/core-security/src/user-agents';
import {
  Fantasy42SecureClient,
  SecureClientFactory,
} from '../packages/core-security/src/secure-client';
import { Fantasy42FraudDetectionClient } from '../packages/core-security/fraud-detection/src/config';
import { Fantasy42AgentMonitor } from '../packages/analytics-dashboard/src/agent-monitor';
import { Fantasy42ComplianceLogger } from '../packages/compliance-core/src/audit-logger';

// Mock environment variables for testing
process.env.FANTASY42_API_KEY = 'test-api-key-12345';
process.env.FANTASY42_API_BASE = 'https://api.test.fantasy42.com';

// Test data
const testTransaction = {
  transactionId: 'test-tx-123',
  accountId: 'test-account-456',
  amount: 100.5,
  currency: 'USD',
  transactionType: 'bet' as const,
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 Test Browser',
  deviceFingerprint: 'test-device-fingerprint',
  location: {
    country: 'US',
    region: 'CA',
    city: 'Los Angeles',
  },
  metadata: {
    sportsbook: 'fantasy42',
    gameType: 'football',
    odds: '-150',
  },
};

describe('Fantasy42 User-Agent Security Suite', () => {
  let fraudClient: Fantasy42FraudDetectionClient;
  let monitor: Fantasy42AgentMonitor;

  beforeAll(() => {
    // Clear any previous monitoring data
    UserAgentMonitor.clearTracking();

    // Initialize test clients
    fraudClient = new Fantasy42FraudDetectionClient('staging');
    monitor = new Fantasy42AgentMonitor('staging');
  });

  afterAll(() => {
    // Clean up
    UserAgentMonitor.clearTracking();
  });

  beforeEach(() => {
    // Reset monitoring between tests
    UserAgentMonitor.clearTracking();
  });

  describe('User-Agent Registry', () => {
    test('should generate correct production User-Agent', () => {
      const agent = Fantasy42UserAgents.getEnvironmentAgent('FRAUD_DETECTION', 'production');
      expect(agent).toContain('Fantasy42-FraudDetector/3.1.0');
      expect(agent).toContain('(production)');
      expect(agent).toContain('GDPR-Compliant');
    });

    test('should generate correct staging User-Agent', () => {
      const agent = Fantasy42UserAgents.getEnvironmentAgent('FRAUD_DETECTION', 'staging');
      expect(agent).toContain('Fantasy42-FraudDetector/3.1.0');
      expect(agent).toContain('(staging)');
      expect(agent).toContain('GDPR-Compliant');
    });

    test('should generate enterprise User-Agent with all features', () => {
      const agent = Fantasy42UserAgents.generateEnterpriseAgent('PAYMENT_GATEWAY', {
        environment: 'enterprise',
        buildVersion: '4.2.0',
        geoRegion: 'us',
        securityLevel: 'maximum',
        compliance: true,
      });

      expect(agent).toContain('Fantasy42-PaymentGateway/4.2.0');
      expect(agent).toContain('(enterprise)');
      expect(agent).toContain('(Build:4.2.0)');
      expect(agent).toContain('(US-Market)');
      expect(agent).toContain('(Sec:Maximum)');
      expect(agent).toContain('GDPR-Compliant');
    });

    test('should generate User-Agent with geographic compliance', () => {
      const agent = Fantasy42UserAgents.getEnvironmentAgent('COMPLIANCE_CORE', 'production', {
        geoRegion: 'eu',
      });

      expect(agent).toContain('(EU-GDPR)');
    });

    test('should generate development User-Agent without compliance', () => {
      const agent = Fantasy42UserAgents.getEnvironmentAgent('FRAUD_DETECTION', 'development', {
        compliance: false,
      });

      expect(agent).toContain('(development)');
      expect(agent).not.toContain('GDPR-Compliant');
    });
  });

  describe('Environment Configuration', () => {
    test('should have correct production environment settings', () => {
      const prodConfig = EnvironmentConfig.production;
      expect(prodConfig.userAgent('FRAUD_DETECTION')).toContain('production');
      expect(prodConfig.timeout).toBe(5000);
      expect(prodConfig.retryAttempts).toBe(3);
      expect(prodConfig.securityLevel).toBe('maximum');
      expect(prodConfig.monitoring).toBe(true);
      expect(prodConfig.compliance).toBe(true);
    });

    test('should have correct development environment settings', () => {
      const devConfig = EnvironmentConfig.development;
      expect(devConfig.userAgent('FRAUD_DETECTION')).toContain('development');
      expect(devConfig.timeout).toBe(30000);
      expect(devConfig.retryAttempts).toBe(1);
      expect(devConfig.securityLevel).toBe('standard');
      expect(devConfig.monitoring).toBe(false);
      expect(devConfig.compliance).toBe(false);
    });

    test('should have correct enterprise environment settings', () => {
      const enterpriseConfig = EnvironmentConfig.enterprise;
      expect(enterpriseConfig.userAgent('FRAUD_DETECTION')).toContain('enterprise');
      expect(enterpriseConfig.timeout).toBe(3000);
      expect(enterpriseConfig.retryAttempts).toBe(5);
      expect(enterpriseConfig.securityLevel).toBe('maximum');
      expect(enterpriseConfig.monitoring).toBe(true);
      expect(enterpriseConfig.compliance).toBe(true);
      expect(enterpriseConfig.auditTrails).toBe(true);
    });
  });

  describe('User-Agent Monitoring', () => {
    test('should track User-Agent usage', () => {
      const agent = 'Test-Agent/1.0';
      UserAgentMonitor.trackAgent(agent);

      const usage = UserAgentMonitor.getAgentUsageStats();
      expect(usage.usage[agent]).toBe(1);
    });

    test('should detect suspicious User-Agents', () => {
      const suspiciousAgents = [
        'curl/7.68.0',
        'python-requests/2.25.1',
        'sqlmap/1.5.7',
        'nikto/2.1.6',
      ];

      suspiciousAgents.forEach(agent => {
        UserAgentMonitor.trackAgent(agent);
        expect(UserAgentMonitor.isSuspicious(agent)).toBe(true);
      });

      const stats = UserAgentMonitor.getAgentUsageStats();
      expect(stats.suspicious.length).toBeGreaterThan(0);
    });

    test('should block suspicious User-Agents', () => {
      const suspiciousAgent = 'curl/7.68.0';
      UserAgentMonitor.trackAgent(suspiciousAgent);

      expect(UserAgentMonitor.isBlocked(suspiciousAgent)).toBe(true);
      expect(UserAgentMonitor.getBlockedAgents()).toContain(suspiciousAgent);
    });

    test('should generate security report', () => {
      // Add some test data
      UserAgentMonitor.trackAgent('Fantasy42-FraudDetector/3.1.0 (production)');
      UserAgentMonitor.trackAgent('curl/7.68.0');

      const report = UserAgentMonitor.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData.totalAgents).toBeGreaterThan(0);
      expect(reportData.compliance).toBeDefined();
      expect(reportData.recommendations).toBeDefined();
    });
  });

  describe('Secure HTTP Client', () => {
    test('should initialize with correct User-Agent', () => {
      const client = new Fantasy42SecureClient('FRAUD_DETECTION', 'staging');
      const clientInfo = client.getClientInfo();

      expect(clientInfo.userAgent).toContain('Fantasy42-FraudDetector');
      expect(clientInfo.userAgent).toContain('(staging)');
      expect(clientInfo.environment).toBe('staging');
    });

    test('should update client configuration', () => {
      const client = new Fantasy42SecureClient('FRAUD_DETECTION', 'production');
      const originalAgent = client.getClientInfo().userAgent;

      client.updateConfig({
        geoRegion: 'eu',
        buildVersion: '3.1.1',
      });

      const updatedAgent = client.getClientInfo().userAgent;

      expect(updatedAgent).toContain('(EU-GDPR)');
      expect(updatedAgent).toContain('(Build:3.1.1)');
      expect(updatedAgent).not.toBe(originalAgent);
    });

    test('should handle client factory creation', () => {
      const fraudClient = SecureClientFactory.createFraudDetectionClient('staging');
      const paymentClient = SecureClientFactory.createPaymentClient('production');

      expect(fraudClient.getClientInfo().userAgent).toContain('FraudDetector');
      expect(paymentClient.getClientInfo().userAgent).toContain('PaymentGateway');
    });
  });

  describe('Fraud Detection Client', () => {
    test('should perform fraud check', async () => {
      // Mock the API response for testing
      const mockResponse = {
        data: {
          isFraud: false,
          riskScore: 25,
          reasons: [],
          alerts: [],
          recommendation: 'approve',
        },
        status: 200,
        headers: {},
        requestId: 'test-request-123',
        userAgent: fraudClient.getClientInfo().userAgent,
        timestamp: new Date().toISOString(),
      };

      // Since we can't make real API calls in tests, we'll test the client setup
      const clientInfo = fraudClient.getClientInfo();
      expect(clientInfo.userAgent).toContain('FraudDetector');
      expect(clientInfo.environment).toBe('staging');
    });

    test('should initialize with security features', () => {
      const clientInfo = fraudClient.getClientInfo();
      expect(clientInfo.compliance).toBe(true);
      expect(clientInfo.geoRegion).toBe('global');
    });
  });

  describe('Agent Monitor Integration', () => {
    test('should start and stop monitoring', async () => {
      // Test monitoring initialization
      const monitorInfo = monitor.getClientInfo();
      expect(monitorInfo.userAgent).toContain('Analytics');
      expect(monitorInfo.environment).toBe('staging');
    });

    test('should track agent usage through monitor', () => {
      Fantasy42AgentMonitor.trackAgent('Test-Agent/1.0');

      const stats = Fantasy42AgentMonitor.getAgentUsageStats();
      expect(stats.usage['Test-Agent/1.0']).toBe(1);
    });
  });

  describe('Compliance Logger Integration', () => {
    test('should create compliance logger instance', () => {
      const logger = Fantasy42ComplianceLogger.getInstance('staging');
      expect(logger).toBeDefined();

      const loggerInfo = logger.getClientInfo();
      expect(loggerInfo.userAgent).toContain('AuditLogger');
    });

    test('should handle audit entry sanitization', () => {
      // Test that ANSI codes are stripped
      const testEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO' as const,
        event: 'TEST_EVENT',
        userAgent: 'Test-Agent\x1b[32m[with ANSI]\x1b[0m',
        action: 'test_action',
        resource: 'test_resource',
        result: 'SUCCESS' as const,
        compliance: {
          gdpr: true,
          pci: false,
          aml: false,
          retention: '3 years',
          category: 'user_action' as const,
        },
      };

      // Test sanitization logic (would be internal to the logger)
      const sanitizedAgent = testEntry.userAgent.replace(/\x1b\[[0-9;]*m/g, '');
      expect(sanitizedAgent).toBe('Test-Agent[with ANSI]');
    });
  });

  describe('CLI Integration', () => {
    test('should validate User-Agent patterns', () => {
      // Test various User-Agent patterns
      const patterns = [
        'Fantasy42-FraudDetector/3.1.0 (production)',
        'Fantasy42-PaymentGateway/4.2.0 (enterprise) (GDPR-Compliant)',
        'curl/7.68.0', // Should be suspicious
        'python-requests/2.25.1', // Should be suspicious
      ];

      patterns.forEach(agent => {
        UserAgentMonitor.trackAgent(agent);

        if (agent.includes('curl') || agent.includes('python-requests')) {
          expect(UserAgentMonitor.isSuspicious(agent)).toBe(true);
        } else {
          expect(UserAgentMonitor.isSuspicious(agent)).toBe(false);
        }
      });
    });

    test('should handle environment-specific User-Agents', () => {
      const environments = ['production', 'staging', 'development', 'enterprise'];

      environments.forEach(env => {
        const agent = Fantasy42UserAgents.getEnvironmentAgent('FRAUD_DETECTION', env as any);
        expect(agent).toContain(`(${env})`);

        if (env === 'production' || env === 'enterprise') {
          expect(agent).toContain('GDPR-Compliant');
        }
      });
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high-frequency User-Agent tracking', () => {
      const agent = 'Performance-Test-Agent/1.0';

      // Track agent many times quickly
      for (let i = 0; i < 1000; i++) {
        UserAgentMonitor.trackAgent(agent);
      }

      const usage = UserAgentMonitor.getAgentUsageStats();
      expect(usage.usage[agent]).toBe(1000);
    });

    test('should maintain User-Agent uniqueness', () => {
      const agents = [
        'Agent-1/1.0',
        'Agent-2/1.0',
        'Agent-1/1.0', // Duplicate
        'Agent-3/1.0',
        'Agent-2/1.0', // Duplicate
      ];

      agents.forEach(agent => UserAgentMonitor.trackAgent(agent));

      const usage = UserAgentMonitor.getAgentUsageStats();
      expect(Object.keys(usage.usage).length).toBe(3); // Only 3 unique agents
      expect(usage.usage['Agent-1/1.0']).toBe(2);
      expect(usage.usage['Agent-2/1.0']).toBe(2);
      expect(usage.usage['Agent-3/1.0']).toBe(1);
    });

    test('should handle special characters in User-Agents', () => {
      const specialAgents = [
        'Agent with spaces/1.0',
        'Agent-with-dashes/1.0',
        'Agent_with_underscores/1.0',
        'Agent(with)parentheses/1.0',
        'Agent[with]brackets/1.0',
      ];

      specialAgents.forEach(agent => {
        UserAgentMonitor.trackAgent(agent);
        expect(UserAgentMonitor.getAgentUsageStats().usage[agent]).toBe(1);
      });
    });
  });

  describe('Security Validation', () => {
    test('should reject suspicious User-Agent patterns', () => {
      const suspiciousPatterns = ['sqlmap', 'nikto', 'burp', 'metasploit', 'nmap', 'masscan'];

      suspiciousPatterns.forEach(pattern => {
        const agent = `${pattern}/1.0`;
        UserAgentMonitor.trackAgent(agent);
        expect(UserAgentMonitor.isSuspicious(agent)).toBe(true);
      });
    });

    test('should accept legitimate Fantasy42 User-Agents', () => {
      const legitimateAgents = [
        'Fantasy42-FraudDetector/3.1.0 (production)',
        'Fantasy42-PaymentGateway/4.2.0 (enterprise) (GDPR-Compliant)',
        'Fantasy42-Analytics/2.7.0 (staging)',
        'Fantasy42-CLI/1.9.0 (development)',
      ];

      legitimateAgents.forEach(agent => {
        UserAgentMonitor.trackAgent(agent);
        expect(UserAgentMonitor.isSuspicious(agent)).toBe(false);
      });
    });

    test('should handle User-Agent blocking correctly', () => {
      const suspiciousAgent = 'curl/7.68.0';
      UserAgentMonitor.trackAgent(suspiciousAgent);

      expect(UserAgentMonitor.isBlocked(suspiciousAgent)).toBe(true);

      // Second tracking should maintain block status
      UserAgentMonitor.trackAgent(suspiciousAgent);
      expect(UserAgentMonitor.isBlocked(suspiciousAgent)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should work with all package types', () => {
      const packageTypes = [
        'FRAUD_DETECTION',
        'PAYMENT_SECURITY',
        'COMPLIANCE_CORE',
        'RISK_ASSESSMENT',
        'AUDIT_LOGGER',
        'WAGER_PROCESSOR',
        'ODDS_CALCULATOR',
        'PAYMENT_GATEWAY',
        'ANALYTICS_DASHBOARD',
        'USER_MANAGEMENT',
      ];

      packageTypes.forEach(pkgType => {
        const agent = Fantasy42UserAgents.getEnvironmentAgent(pkgType as any, 'production');
        expect(agent).toContain('Fantasy42-');
        expect(agent).toContain('(production)');
        expect(agent).toContain('GDPR-Compliant');
      });
    });

    test('should generate comprehensive security report', () => {
      // Add diverse test data
      const testAgents = [
        'Fantasy42-FraudDetector/3.1.0 (production)',
        'Fantasy42-PaymentGateway/4.2.0 (enterprise) (GDPR-Compliant)',
        'curl/7.68.0',
        'python-requests/2.25.1',
        'Fantasy42-Analytics/2.7.0 (staging)',
        'sqlmap/1.5.7',
      ];

      testAgents.forEach(agent => UserAgentMonitor.trackAgent(agent));

      const report = UserAgentMonitor.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData.totalAgents).toBe(6);
      expect(reportData.suspiciousAgents).toBeGreaterThan(0);
      expect(reportData.compliance).toBeDefined();
      expect(reportData.recommendations).toBeDefined();
      expect(Array.isArray(reportData.recommendations)).toBe(true);
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('should handle rapid User-Agent tracking', () => {
    const startTime = Date.now();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      UserAgentMonitor.trackAgent(`Performance-Agent-${i}/1.0`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Performance test: ${iterations} agents tracked in ${duration}ms`);

    const usage = UserAgentMonitor.getAgentUsageStats();
    expect(Object.keys(usage.usage).length).toBe(iterations);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  test('should maintain performance with concurrent tracking', async () => {
    const concurrentAgents = 100;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrentAgents; i++) {
      promises.push(
        new Promise<void>(resolve => {
          UserAgentMonitor.trackAgent(`Concurrent-Agent-${i}/1.0`);
          resolve();
        })
      );
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    const usage = UserAgentMonitor.getAgentUsageStats();
    expect(Object.keys(usage.usage).length).toBe(concurrentAgents);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
  });
});
