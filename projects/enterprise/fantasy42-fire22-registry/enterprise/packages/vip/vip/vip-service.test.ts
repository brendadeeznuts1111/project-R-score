/**
 * VIP Service Tests - Domain-Driven Design Testing Example
 * Demonstrates testing patterns with error handling and logging
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { VipService, VipRepository, VipClient, CommissionCalculation } from './vip-service';

import {
  DomainError,
  ErrorCode,
  ValidationError,
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../core/errors/domain-errors';

import {
  TestSetup,
  TestFixtures,
  DomainAssertions,
  TestDatabase,
} from '../core/testing/test-infrastructure';

// Mock Repository Implementation
class MockVipRepository implements VipRepository {
  private db = new TestDatabase();

  async save(client: VipClient): Promise<VipClient> {
    return await this.db.save('vipClients', client);
  }

  async findById(id: string): Promise<VipClient | null> {
    return await this.db.findById('vipClients', id);
  }

  async findByUserId(userId: string): Promise<VipClient | null> {
    const clients = await this.db.findAll<VipClient>('vipClients');
    return clients.find(client => client.userId === userId) || null;
  }

  async findAll(): Promise<VipClient[]> {
    return await this.db.findAll<VipClient>('vipClients');
  }

  async delete(id: string): Promise<boolean> {
    return await this.db.delete('vipClients', id);
  }

  // Test helper methods
  async clear(): Promise<void> {
    await this.db.clear('vipClients');
  }

  async seedTestData(): Promise<VipClient[]> {
    const clients = [
      TestFixtures.createVipClient({
        id: 'vip-platinum-001',
        userId: 'user-platinum',
        tier: 'platinum',
        commission: 0.05,
      }),
      TestFixtures.createVipClient({
        id: 'vip-gold-001',
        userId: 'user-gold',
        tier: 'gold',
        commission: 0.03,
      }),
      TestFixtures.createVipClient({
        id: 'vip-silver-001',
        userId: 'user-silver',
        tier: 'silver',
        commission: 0.02,
      }),
    ];

    for (const client of clients) {
      await this.save(client);
    }

    return clients;
  }
}

describe('VipService - Domain-Driven Design', () => {
  let testSetup: TestSetup;
  let repository: MockVipRepository;
  let vipService: VipService;

  beforeEach(async () => {
    testSetup = new TestSetup('vip');
    repository = new MockVipRepository();
    vipService = VipServiceFactory.create(repository);

    // Setup logger to use our mock transport
    const logger = DomainLogger.getInstance();
    logger.addTransport(testSetup.logger);
  });

  afterEach(async () => {
    testSetup.reset();
    await repository.clear();
  });

  describe('createVipClient', () => {
    it('should create a valid VIP client successfully', async () => {
      // Arrange
      const clientData = {
        userId: 'user-123',
        tier: 'gold' as const,
        commission: 0.03,
        managerId: 'manager-456',
        status: 'active' as const,
      };

      // Act
      const result = await testSetup.expectAsync(() => vipService.createVipClient(clientData));

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(clientData.userId);
      expect(result.tier).toBe(clientData.tier);
      expect(result.commission).toBe(clientData.commission);

      // Verify logging
      testSetup.expectLog('Creating new VIP client');
      testSetup.expectLog('VIP client created successfully');
    });

    it('should reject duplicate user VIP accounts', async () => {
      // Arrange
      const clientData = {
        userId: 'user-123',
        tier: 'gold' as const,
        commission: 0.03,
        managerId: 'manager-456',
        status: 'active' as const,
      };

      // Create first client
      await vipService.createVipClient(clientData);

      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.createVipClient(clientData),
        undefined,
        ErrorCode.BUSINESS_RULE_VIOLATION
      );

      // Verify error details
      const error = testSetup.errorHandler.getLastError();
      expect(error?.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
      expect(error?.message).toContain('already has a VIP client account');
    });

    it('should validate commission rates by tier', async () => {
      // Arrange
      const invalidClientData = {
        userId: 'user-123',
        tier: 'gold' as const,
        commission: 0.05, // Wrong rate for gold tier
        managerId: 'manager-456',
        status: 'active' as const,
      };

      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.createVipClient(invalidClientData),
        undefined,
        ErrorCode.VALIDATION_ERROR
      );

      // Verify error details
      const error = testSetup.errorHandler.getLastError();
      expect(error?.details?.field).toBe('commission');
      expect(error?.details?.expected).toBe(0.03);
      expect(error?.details?.actual).toBe(0.05);
    });

    it('should log business operations correctly', async () => {
      // Arrange
      const clientData = {
        userId: 'user-123',
        tier: 'platinum' as const,
        commission: 0.05,
        managerId: 'manager-456',
        status: 'active' as const,
      };

      // Act
      await vipService.createVipClient(clientData);

      // Assert
      testSetup.expectLog('VIP client creation validation passed');
      testSetup.expectLog('VIP client created successfully');

      // Verify log context
      const logs = testSetup.logger.getLogsByDomain('vip');
      expect(logs.length).toBeGreaterThan(0);

      const businessLogs = testSetup.logger.getLogsByCategory('business');
      expect(businessLogs.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCommission', () => {
    let testClient: VipClient;

    beforeEach(async () => {
      testClient = await repository.save(
        TestFixtures.createVipClient({
          id: 'vip-test-001',
          userId: 'user-test',
          tier: 'platinum',
          commission: 0.05,
        })
      );
    });

    it('should calculate commission correctly for active clients', async () => {
      // Arrange
      const betAmount = 1000;

      // Act
      const result = await testSetup.expectAsync(() =>
        vipService.calculateCommission(testClient.id, betAmount)
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.baseAmount).toBe(betAmount);
      expect(result.commissionRate).toBe(0.05);
      expect(result.totalCommission).toBe(55); // 1000 * 0.05 * 1.1 (platinum bonus)
      expect(result.effectiveRate).toBe(0.055); // 0.05 * 1.1
    });

    it('should apply platinum tier bonus multiplier', async () => {
      // Arrange
      const betAmount = 500;

      // Act
      const result = await vipService.calculateCommission(testClient.id, betAmount);

      // Assert
      expect(result.effectiveRate).toBe(0.055); // 0.05 * 1.1
      expect(result.totalCommission).toBe(27.5); // 500 * 0.055
    });

    it('should apply gold tier bonus for large bets', async () => {
      // Arrange
      const goldClient = await repository.save(
        TestFixtures.createVipClient({
          id: 'vip-gold-test',
          userId: 'user-gold-test',
          tier: 'gold',
          commission: 0.03,
        })
      );

      // Act
      const result = await vipService.calculateCommission(goldClient.id, 1500);

      // Assert
      expect(result.effectiveRate).toBe(0.0315); // 0.03 * 1.05
      expect(result.totalCommission).toBe(47.25); // 1500 * 0.0315
    });

    it('should reject inactive clients', async () => {
      // Arrange
      const inactiveClient = await repository.save(
        TestFixtures.createVipClient({
          id: 'vip-inactive',
          userId: 'user-inactive',
          tier: 'gold',
          status: 'inactive',
        })
      );

      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.calculateCommission(inactiveClient.id, 100),
        undefined,
        ErrorCode.BUSINESS_RULE_VIOLATION
      );

      // Verify error
      const error = testSetup.errorHandler.getLastError();
      expect(error?.message).toContain('inactive VIP client');
    });

    it('should handle non-existent clients', async () => {
      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.calculateCommission('non-existent-id', 100),
        undefined,
        ErrorCode.ENTITY_NOT_FOUND
      );
    });

    it('should log performance metrics', async () => {
      // Act
      await vipService.calculateCommission(testClient.id, 1000);

      // Assert
      testSetup.expectLog('Calculating VIP commission');
      testSetup.expectLog('Commission calculated');

      // Verify metrics logging
      const performanceLogs = testSetup.logger.getLogsByCategory('performance');
      expect(performanceLogs.length).toBeGreaterThan(0);

      const calculationLog = performanceLogs.find(log =>
        log.message.includes('Commission calculated')
      );
      expect(calculationLog?.metrics).toBeDefined();
    });
  });

  describe('updateVipTier', () => {
    let testClient: VipClient;

    beforeEach(async () => {
      testClient = await repository.save(
        TestFixtures.createVipClient({
          id: 'vip-tier-test',
          userId: 'user-tier-test',
          tier: 'silver',
          commission: 0.02,
        })
      );
    });

    it('should allow tier upgrades', async () => {
      // Act
      const result = await testSetup.expectAsync(() =>
        vipService.updateVipTier(testClient.id, 'gold', 'manager-123')
      );

      // Assert
      expect(result.tier).toBe('gold');
      expect(result.updatedAt).not.toBe(testClient.updatedAt);

      // Verify audit logging
      testSetup.expectLog('VIP client tier updated', 1); // INFO level
    });

    it('should reject tier downgrades', async () => {
      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.updateVipTier(testClient.id, 'bronze', 'manager-123'),
        undefined,
        ErrorCode.BUSINESS_RULE_VIOLATION
      );

      // Verify error
      const error = testSetup.errorHandler.getLastError();
      expect(error?.message).toContain('downgrades are not allowed');
    });

    it('should handle non-existent clients', async () => {
      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.updateVipTier('non-existent', 'gold', 'manager-123'),
        undefined,
        ErrorCode.ENTITY_NOT_FOUND
      );
    });

    it('should validate tier values', async () => {
      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.updateVipTier(testClient.id, 'invalid-tier' as any, 'manager-123'),
        undefined,
        ErrorCode.VALIDATION_ERROR
      );
    });

    it('should publish tier change events', async () => {
      // Act
      await vipService.updateVipTier(testClient.id, 'platinum', 'manager-123');

      // Assert
      testSetup.expectEvent('vip.client.tier.updated', payload => {
        return (
          payload.clientId === testClient.id &&
          payload.oldTier === 'silver' &&
          payload.newTier === 'platinum'
        );
      });
    });

    it('should audit tier changes with metadata', async () => {
      // Act
      await vipService.updateVipTier(testClient.id, 'gold', 'manager-123');

      // Assert
      const auditLogs = testSetup.logger.getLogsByCategory('audit');
      const tierUpdateLog = auditLogs.find(log => log.message.includes('VIP client tier updated'));

      expect(tierUpdateLog).toBeDefined();
      expect(tierUpdateLog?.context.metadata).toEqual({
        oldTier: 'silver',
        newTier: 'gold',
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle domain errors gracefully', async () => {
      // Arrange
      testSetup.errorHandler.setShouldThrow(false);

      // Act
      const result = await vipService.calculateCommission('non-existent', 100);

      // Assert
      expect(result).toBeUndefined(); // Should not throw due to error handler config

      // Verify error was captured
      testSetup.errorHandler.expectError(ErrorCode.ENTITY_NOT_FOUND);
    });

    it('should provide detailed error context', async () => {
      // Act & Assert
      await testSetup.expectAsync(
        () => vipService.calculateCommission('non-existent', 100),
        undefined,
        ErrorCode.ENTITY_NOT_FOUND
      );

      // Verify error context
      const error = testSetup.errorHandler.getLastError();
      expect(error?.context.domain).toBe('vip');
      expect(error?.context.operation).toBe('calculateCommission');
      expect(error?.context.correlationId).toBeDefined();
      expect(error?.context.timestamp).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation timing', async () => {
      // Act
      await vipService.calculateCommission(testClient.id, 1000);

      // Assert
      const performanceLogs = testSetup.logger.getLogsByCategory('performance');
      const timingLog = performanceLogs.find(log =>
        log.message.includes('Completed calculateCommission')
      );

      expect(timingLog).toBeDefined();
      expect(timingLog?.context.duration).toBeDefined();
      expect(timingLog?.context.duration).toBeGreaterThan(0);
    });

    it('should log business metrics', async () => {
      // Act
      await vipService.calculateCommission(testClient.id, 2000);

      // Assert
      const businessLogs = testSetup.logger.getLogsByCategory('business');
      const calculationLog = businessLogs.find(log =>
        log.message.includes('Commission calculated')
      );

      expect(calculationLog?.metrics).toBeDefined();
      expect(calculationLog?.metrics?.totalCommission).toBe(110); // 2000 * 0.055
    });
  });

  describe('Domain Assertions', () => {
    it('should validate email formats', () => {
      expect(() => DomainAssertions.assertValidEmail('valid@email.com')).not.toThrow();
      expect(() => DomainAssertions.assertValidEmail('invalid-email')).toThrow();
    });

    it('should validate positive amounts', () => {
      expect(() => DomainAssertions.assertPositiveAmount(100)).not.toThrow();
      expect(() => DomainAssertions.assertPositiveAmount(-50)).toThrow();
      expect(() => DomainAssertions.assertPositiveAmount(0)).toThrow();
    });

    it('should validate string lengths', () => {
      expect(() => DomainAssertions.assertStringLength('test', 2, 10, 'field')).not.toThrow();
      expect(() => DomainAssertions.assertStringLength('a', 2, 10, 'field')).toThrow();
      expect(() =>
        DomainAssertions.assertStringLength('this-is-too-long', 2, 10, 'field')
      ).toThrow();
    });
  });
});

// Test Factory for creating service instances
export class VipServiceFactory {
  static create(repository: VipRepository): VipService {
    return new VipService(repository);
  }

  static createWithTestSetup(): {
    service: VipService;
    setup: TestSetup;
    repository: MockVipRepository;
  } {
    const setup = new TestSetup('vip');
    const repository = new MockVipRepository();
    const service = new VipService(repository);

    // Configure logger
    const logger = DomainLogger.getInstance();
    logger.addTransport(setup.logger);

    return { service, setup, repository };
  }
}
