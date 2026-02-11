import { describe, test, expect } from 'bun:test';
import {
  PortManager,
  ConnectionPool,
  OptimizedFetch,
  ProjectServer,
  DNSOptimizer,
  ValidationUtils,
} from '../lib/http/port-management-system';

// ============================================================================
// ValidationUtils — pure functions, no side effects
// ============================================================================

describe('ValidationUtils', () => {
  describe('validatePort', () => {
    test('accepts valid ports', () => {
      expect(ValidationUtils.validatePort(3000).isValid).toBe(true);
      expect(ValidationUtils.validatePort(1).isValid).toBe(true);
      expect(ValidationUtils.validatePort(65535).isValid).toBe(true);
    });

    test('rejects port below minimum', () => {
      const result = ValidationUtils.validatePort(0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects port above maximum', () => {
      const result = ValidationUtils.validatePort(65536);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects NaN', () => {
      const result = ValidationUtils.validatePort(NaN);
      expect(result.isValid).toBe(false);
    });

    test('includes context in error messages', () => {
      const result = ValidationUtils.validatePort(-1, 'MyPort');
      expect(result.errors[0]).toContain('MyPort');
    });
  });

  describe('validateConnectionLimit', () => {
    test('accepts valid connection limits', () => {
      expect(ValidationUtils.validateConnectionLimit(1).isValid).toBe(true);
      expect(ValidationUtils.validateConnectionLimit(512).isValid).toBe(true);
    });

    test('rejects limit below minimum', () => {
      const result = ValidationUtils.validateConnectionLimit(0);
      expect(result.isValid).toBe(false);
    });

    test('rejects limit above maximum', () => {
      const result = ValidationUtils.validateConnectionLimit(100000);
      expect(result.isValid).toBe(false);
    });

    test('rejects NaN', () => {
      const result = ValidationUtils.validateConnectionLimit(NaN);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePortRange', () => {
    test('accepts valid range', () => {
      const result = ValidationUtils.validatePortRange(3000, 4000);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('rejects inverted range', () => {
      const result = ValidationUtils.validatePortRange(4000, 3000);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('greater than'))).toBe(true);
    });

    test('accepts equal start and end', () => {
      const result = ValidationUtils.validatePortRange(3000, 3000);
      expect(result.isValid).toBe(true);
    });

    test('propagates invalid port errors', () => {
      const result = ValidationUtils.validatePortRange(-1, 99999);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================================================
// PortManager — core allocation logic
// ============================================================================

describe('PortManager', () => {
  test('allocatePort returns a valid port number', async () => {
    const port = await PortManager.allocatePort('/tmp/test-project-pm');
    expect(port).toBeGreaterThanOrEqual(1);
    expect(port).toBeLessThanOrEqual(65535);
    // Clean up
    PortManager.releasePort('/tmp/test-project-pm');
  });

  test('allocatePort returns same port for same project', async () => {
    const port1 = await PortManager.allocatePort('/tmp/test-same-pm');
    const port2 = await PortManager.allocatePort('/tmp/test-same-pm');
    expect(port1).toBe(port2);
    PortManager.releasePort('/tmp/test-same-pm');
  });

  test('releasePort frees the allocation', async () => {
    const port = await PortManager.allocatePort('/tmp/test-release-pm');
    PortManager.releasePort('/tmp/test-release-pm');
    const allocated = PortManager.getAllocatedPorts();
    expect(allocated.has('/tmp/test-release-pm')).toBe(false);
  });

  test('getAllocatedPorts returns a map copy', async () => {
    const port = await PortManager.allocatePort('/tmp/test-alloc-pm');
    const ports = PortManager.getAllocatedPorts();
    expect(ports).toBeInstanceOf(Map);
    expect(ports.get('/tmp/test-alloc-pm')).toBe(port);
    PortManager.releasePort('/tmp/test-alloc-pm');
  });
});

// ============================================================================
// ConnectionPool — basic construction
// ============================================================================

describe('ConnectionPool', () => {
  test('can be instantiated with empty stats', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      connectionTimeout: 5000,
      keepAlive: true,
      retryAttempts: 3,
      retryDelay: 100,
    });
    expect(pool).toBeDefined();
    const stats = pool.getStats();
    // Empty pool has no entries
    expect(Object.keys(stats).length).toBe(0);
  });
});

// ============================================================================
// DNSOptimizer — smoke test (no network)
// ============================================================================

describe('DNSOptimizer', () => {
  test('getDNSCacheStats returns stats object', () => {
    const stats = DNSOptimizer.getDNSCacheStats();
    // May return fallback stats if Bun.dns not available
    expect(stats).toBeDefined();
  });
});
