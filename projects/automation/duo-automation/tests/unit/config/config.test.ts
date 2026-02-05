/**
 * Configuration Management Tests
 * Tests for port configuration, environment variables, and validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getPorts, getDefaultPorts, getPortUrl, validatePorts, getPortConflicts, type PortConfig } from '../src/config/ports.js';

describe('Port Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getDefaultPorts', () => {
    it('should return default port configuration', () => {
      const ports = getDefaultPorts();
      
      expect(ports.webServer).toBe(8080);
      expect(ports.redis).toBe(6379);
      expect(ports.storageDashboard).toBe(3004);
      expect(ports.analyticsDashboard).toBe(3005);
      expect(ports.adminDashboard).toBe(3006);
      expect(ports.metricsDashboard).toBe(3001);
      expect(ports.systemDashboard).toBe(3000);
      expect(ports.cashappDashboard).toBe(3007);
      expect(ports.empireCommandDashboard).toBe(3008);
      expect(ports.tokenManagementDashboard).toBe(3009);
      expect(ports.enhancedDashboard).toBe(3010);
      expect(ports.postgres).toBe(5432);
      expect(ports.imapSsl).toBe(993);
      expect(ports.smtp).toBe(587);
      expect(ports.smtpSsl).toBe(465);
      expect(ports.otlp).toBe(4318);
      expect(ports.deviceEndpoint).toBe(26689);
    });
  });

  describe('getPorts', () => {
    it('should use environment variables when set', () => {
      process.env.WEB_SERVER_PORT = '9000';
      process.env.REDIS_PORT = '6380';
      process.env.STORAGE_DASHBOARD_PORT = '3010';
      
      const ports = getPorts();
      
      expect(ports.webServer).toBe(9000);
      expect(ports.redis).toBe(6380);
      expect(ports.storageDashboard).toBe(3010);
    });

    it('should use defaults when environment variables not set', () => {
      // Clear relevant environment variables
      delete process.env.WEB_SERVER_PORT;
      delete process.env.REDIS_PORT;
      
      const ports = getPorts();
      
      expect(ports.webServer).toBe(8080);
      expect(ports.redis).toBe(6379);
    });

    it('should handle invalid environment variables gracefully', () => {
      process.env.WEB_SERVER_PORT = 'invalid';
      process.env.REDIS_PORT = '6380';
      
      const ports = getPorts();
      
      expect(ports.webServer).toBeNaN(); // parseInt('invalid') is NaN
      expect(ports.redis).toBe(6380);
    });
  });

  describe('getPortUrl', () => {
    it('should generate correct URLs with default host', () => {
      const url = getPortUrl('webServer');
      expect(url).toBe('http://localhost:8080');
    });

    it('should generate correct URLs with custom host', () => {
      process.env.HOST = 'example.com';
      const url = getPortUrl('webServer');
      expect(url).toBe('http://example.com:8080');
    });

    it('should include path when provided', () => {
      const url = getPortUrl('webServer', '/api/v1');
      expect(url).toBe('http://localhost:8080/api/v1');
    });

    it('should work with all port types', () => {
      const webUrl = getPortUrl('webServer');
      const redisUrl = getPortUrl('redis');
      const dashboardUrl = getPortUrl('analyticsDashboard');
      
      expect(webUrl).toBe('http://localhost:8080');
      expect(redisUrl).toBe('http://localhost:6379');
      expect(dashboardUrl).toBe('http://localhost:3005');
    });
  });

  describe('validatePorts', () => {
    it('should validate correct port configuration', () => {
      const validPorts: PortConfig = {
        webServer: 8080,
        redis: 6379,
        storageDashboard: 3004,
        analyticsDashboard: 3005,
        adminDashboard: 3006,
        metricsDashboard: 3001,
        systemDashboard: 3000,
        cashappDashboard: 3007,
        empireCommandDashboard: 3008,
        tokenManagementDashboard: 3009,
        enhancedDashboard: 3004,
        postgres: 5432,
        imapSsl: 993,
        smtp: 587,
        smtpSsl: 465,
        otlp: 4318,
        deviceEndpoint: 26689,
      };
      
      expect(validatePorts(validPorts)).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      const invalidPorts: PortConfig = {
        ...getDefaultPorts(),
        webServer: 0, // Invalid
      };
      
      expect(validatePorts(invalidPorts)).toBe(false);
    });

    it('should reject ports out of range', () => {
      const invalidPorts: PortConfig = {
        ...getDefaultPorts(),
        redis: 70000, // Out of range
      };
      
      expect(validatePorts(invalidPorts)).toBe(false);
    });

    it('should reject negative ports', () => {
      const invalidPorts: PortConfig = {
        ...getDefaultPorts(),
        smtp: -1, // Negative
      };
      
      expect(validatePorts(invalidPorts)).toBe(false);
    });
  });

  describe('getPortConflicts', () => {
    it('should detect no conflicts in default configuration', () => {
      const ports = getDefaultPorts();
      const conflicts = getPortConflicts(ports);
      
      expect(conflicts).toHaveLength(0);
    });

    it('should detect port conflicts', () => {
      const conflictingPorts: PortConfig = {
        ...getDefaultPorts(),
        webServer: 3000, // Conflict with systemDashboard (original)
        storageDashboard: 3000, // Conflict with both systemDashboard and webServer
      };
      
      const conflicts = getPortConflicts(conflictingPorts);
      
      expect(conflicts.length).toBeGreaterThan(0);
      // The conflict detection reports the second occurrence, so storageDashboard will be reported
      expect(conflicts).toContain('storageDashboard');
      // webServer won't be reported because systemDashboard was seen first
    });

    it('should detect multiple conflicts', () => {
      const conflictingPorts: PortConfig = {
        ...getDefaultPorts(),
        webServer: 3000, // Conflict with systemDashboard
        redis: 3000,     // Another conflict
      };
      
      const conflicts = getPortConflicts(conflictingPorts);
      
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });
});

describe('Environment Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should work with production environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.WEB_SERVER_PORT = '80';
    process.env.REDIS_PORT = '6379';
    process.env.HOST = 'empire-pro.com';
    
    const ports = getPorts();
    const webUrl = getPortUrl('webServer');
    
    expect(ports.webServer).toBe(80);
    expect(webUrl).toBe('http://empire-pro.com:80');
  });

  it('should work with development environment variables', () => {
    process.env.NODE_ENV = 'development';
    process.env.WEB_SERVER_PORT = '3000';
    process.env.HOST = 'localhost';
    
    const ports = getPorts();
    const webUrl = getPortUrl('webServer');
    
    expect(ports.webServer).toBe(3000);
    expect(webUrl).toBe('http://localhost:3000');
  });
});

describe('Security Tests', () => {
  it('should not expose sensitive information in URLs', () => {
    const urls = [
      getPortUrl('webServer'),
      getPortUrl('redis'),
      getPortUrl('postgres'),
    ];
    
    urls.forEach(url => {
      expect(url).not.toContain('password');
      expect(url).not.toContain('secret');
      expect(url).not.toContain('key');
    });
  });

  it('should handle port injection attempts', () => {
    process.env.WEB_SERVER_PORT = '8080; DROP TABLE users;';
    
    const ports = getPorts();
    
    // parseInt will parse the first valid number (8080) and ignore the rest
    expect(ports.webServer).toBe(8080);
    // The injection attempt is safely handled by parseInt
  });
});
