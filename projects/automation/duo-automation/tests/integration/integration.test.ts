/**
 * Integration Tests
 * Tests for complete configuration system integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Configuration Integration Tests', () => {
  const originalEnv = process.env;
  let testEnvFile: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    testEnvFile = join(process.cwd(), '.test.env');
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      unlinkSync(testEnvFile);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('End-to-End Configuration Loading', () => {
    it('should load complete configuration from environment file', () => {
      // Create test environment file
      const testEnvContent = `
NODE_ENV=production
WEB_SERVER_PORT=8080
REDIS_PORT=6379
STORAGE_DASHBOARD_PORT=3004
ANALYTICS_DASHBOARD_PORT=3005
ADMIN_DASHBOARD_PORT=3006
METRICS_DASHBOARD_PORT=3001
SYSTEM_DASHBOARD_PORT=3000
CASHAPP_DASHBOARD_PORT=3007
EMPIRE_COMMAND_DASHBOARD_PORT=3008
TOKEN_MANAGEMENT_DASHBOARD_PORT=3009
ENHANCED_DASHBOARD_PORT=3004
POSTGRES_PORT=5432
IMAP_SSL_PORT=993
SMTP_PORT=587
SMTP_SSL_PORT=465
OTLP_PORT=4318
DEVICE_ENDPOINT_PORT=26689

MAPS_SERVICE_URL=https://custom-maps.com
CAPTCHA_SERVICE_URL=https://custom-captcha.com
ANTI_CAPTCHA_SERVICE_URL=https://custom-anti-captcha.com
DUOPLUS_ENDPOINT=https://custom-duoplus.com/analytics
APPLE_ID_URL=https://custom-apple.com

API_URL=https://api.custom.com
STORAGE_URL=https://storage.custom.com
REDIS_URL=redis://custom-redis:6379
POSTGRES_URL=postgresql://custom-postgres:5432/duo_automation

JWT_SECRET=production-jwt-secret-key
ENCRYPTION_KEY=production-encryption-key-32-chars
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
HOST=empire-pro.com
`;

      writeFileSync(testEnvFile, testEnvContent);

      // Load environment variables from test file
      const envLines = testEnvContent.trim().split('\n');
      envLines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      // Test configuration loading
      const { config } = require('../src/config/index.js');
      
      // Test environment detection
      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      
      // Test ports
      expect(config.ports.webServer).toBe(8080);
      expect(config.ports.redis).toBe(6379);
      expect(config.ports.storageDashboard).toBe(3004);
      
      // Test services
      expect(config.services.maps.url).toBe('https://custom-maps.com');
      expect(config.services.captcha.url).toBe('https://custom-captcha.com');
      expect(config.services.api.url).toBe('https://api.custom.com');
      
      // Test database
      expect(config.database.redis.url).toBe('redis://custom-redis:6379');
      expect(config.database.postgres?.url).toBe('postgresql://custom-postgres:5432/duo_automation');
      
      // Test security
      expect(config.app.security.jwtSecret).toBe('production-jwt-secret-key');
      expect(config.app.security.encryptionKey).toBe('production-encryption-key-32-chars');
      
      // Test validation
      const validation = config.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle development configuration', () => {
      const testEnvContent = `
NODE_ENV=development
DEBUG=true
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
WEB_SERVER_PORT=3000
HOST=localhost
`;

      writeFileSync(testEnvFile, testEnvContent);

      // Load environment variables
      const envLines = testEnvContent.trim().split('\n');
      envLines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      const { config } = require('../src/config/index.js');
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.app.debug).toBe(true);
      expect(config.app.cors.enabled).toBe(true);
      expect(config.app.cors.origin).toBe('http://localhost:3000');
      expect(config.app.monitoring.logLevel).toBe('debug');
      
      const webUrl = config.getServiceUrl('api');
      expect(webUrl).toBe('http://localhost:3000');
    });
  });

  describe('Port Conflict Detection', () => {
    it('should detect port conflicts in configuration', () => {
      // Create configuration with conflicts
      process.env.WEB_SERVER_PORT = '3000';
      process.env.SYSTEM_DASHBOARD_PORT = '3000'; // Conflict
      process.env.REDIS_PORT = '3000';             // Another conflict

      const { getPortConflicts } = require('../src/config/ports.js');
      const { getPorts } = require('../src/config/ports.js');
      
      const ports = getPorts();
      const conflicts = getPortConflicts(ports);
      
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts).toContain('systemDashboard');
      expect(conflicts).toContain('redis');
    });

    it('should validate port ranges', () => {
      process.env.WEB_SERVER_PORT = '99999'; // Invalid port
      process.env.REDIS_PORT = '0';          // Invalid port

      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e: string) => e.includes('Invalid port number'))).toBe(true);
    });
  });

  describe('Service URL Generation', () => {
    it('should generate correct URLs for all services', () => {
      process.env.HOST = 'empire-pro.com';
      process.env.WEB_SERVER_PORT = '8080';
      process.env.STORAGE_DASHBOARD_PORT = '3004';
      process.env.ADMIN_DASHBOARD_PORT = '3006';

      const { config } = require('../src/config/index.js');
      
      const apiUrl = config.getServiceUrl('api', '/v1/users');
      const storageUrl = config.getServiceUrl('storage', '/files');
      const adminDashboardUrl = config.getDashboardUrl('admin', '/login');
      
      expect(apiUrl).toBe('http://empire-pro.com:8080/v1/users');
      expect(storageUrl).toBe('http://empire-pro.com:3004/files');
      expect(adminDashboardUrl).toBe('http://empire-pro.com:3006/login');
    });
  });

  describe('Dashboard Configuration Integration', () => {
    it('should configure all dashboards correctly', () => {
      const dashboardPorts = {
        SYSTEM_DASHBOARD_PORT: '3000',
        ANALYTICS_DASHBOARD_PORT: '3005',
        STORAGE_DASHBOARD_PORT: '3004',
        ADMIN_DASHBOARD_PORT: '3006',
        METRICS_DASHBOARD_PORT: '3001',
        CASHAPP_DASHBOARD_PORT: '3007',
        EMPIRE_COMMAND_DASHBOARD_PORT: '3008',
        TOKEN_MANAGEMENT_DASHBOARD_PORT: '3009',
        ENHANCED_DASHBOARD_PORT: '3004'
      };

      Object.entries(dashboardPorts).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const { config } = require('../src/config/index.js');
      const dashboards = config.dashboards;
      
      expect(dashboards.main.port).toBe(3000);
      expect(dashboards.analytics.port).toBe(3005);
      expect(dashboards.storage.port).toBe(3004);
      expect(dashboards.admin.port).toBe(3006);
      expect(dashboards.metrics.port).toBe(3001);
      expect(dashboards.cashapp?.port).toBe(3007);
      expect(dashboards.empireCommand?.port).toBe(3008);
      expect(dashboards.tokenManagement?.port).toBe(3009);
      expect(dashboards.enhanced?.port).toBe(3004);
      
      // All dashboards should be enabled by default
      Object.values(dashboards).forEach(dashboard => {
        if (dashboard && typeof dashboard === 'object' && 'enabled' in dashboard) {
          expect(dashboard.enabled).toBe(true);
        }
      });
    });
  });

  describe('Security Integration', () => {
    it('should enforce security requirements in production', () => {
      process.env.NODE_ENV = 'production';
      // Missing JWT_SECRET and ENCRYPTION_KEY

      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('JWT_SECRET must be set in production');
      expect(validation.errors).toContain('ENCRYPTION_KEY must be set in production');
    });

    it('should pass security validation with proper configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'strong-production-jwt-secret';
      process.env.ENCRYPTION_KEY = 'strong-production-encryption-key-32';
      process.env.WEB_SERVER_PORT = '8080';
      process.env.REDIS_PORT = '6379';

      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('External Service Integration', () => {
    it('should integrate all external services', () => {
      const serviceUrls = {
        MAPS_SERVICE_URL: 'https://custom-maps.googleapis.com',
        CAPTCHA_SERVICE_URL: 'https://custom.2captcha.com',
        ANTI_CAPTCHA_SERVICE_URL: 'https://custom.anti-captcha.com',
        DUOPLUS_ENDPOINT: 'https://custom.duoplus.com/analytics',
        APPLE_ID_URL: 'https://custom.appleid.apple.com'
      };

      Object.entries(serviceUrls).forEach(([key, value]) => {
        process.env[key] = value;
      });

      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      expect(services.maps.url).toBe('https://custom-maps.googleapis.com');
      expect(services.captcha.url).toBe('https://custom.2captcha.com');
      expect(services.captcha.antiCaptchaUrl).toBe('https://custom.anti-captcha.com');
      expect(services.duoPlus.endpoint).toBe('https://custom.duoplus.com/analytics');
      expect(services.appleId.url).toBe('https://custom.appleid.apple.com');
    });
  });

  describe('Monitoring Integration', () => {
    it('should integrate monitoring configuration', () => {
      process.env.ENABLE_METRICS = 'true';
      process.env.METRICS_PORT = '9090';
      process.env.HEALTH_CHECK_INTERVAL = '30000';
      process.env.LOG_LEVEL = 'warn';

      const { config } = require('../src/config/index.js');
      const monitoring = config.app.monitoring;
      
      expect(monitoring.enabled).toBe(true);
      expect(monitoring.port).toBe(9090);
      expect(monitoring.interval).toBe(30000);
      expect(monitoring.logLevel).toBe('warn');
    });
  });
});
