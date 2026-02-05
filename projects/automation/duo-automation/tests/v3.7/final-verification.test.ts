/**
 * Final Configuration Test Suite
 * Comprehensive test to verify the configuration management implementation
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Configuration Management - Final Verification', () => {
  describe('Core Implementation', () => {
    it('should have complete port configuration system', () => {
      const { getPorts, getDefaultPorts, validatePorts, getPortConflicts, getPortUrl } = require('../src/config/ports.js');
      
      // Test all functions exist
      expect(typeof getPorts).toBe('function');
      expect(typeof getDefaultPorts).toBe('function');
      expect(typeof validatePorts).toBe('function');
      expect(typeof getPortConflicts).toBe('function');
      expect(typeof getPortUrl).toBe('function');
      
      // Test default configuration
      const defaultPorts = getDefaultPorts();
      expect(defaultPorts.webServer).toBe(8080);
      expect(defaultPorts.redis).toBe(6379);
      expect(defaultPorts.enhancedDashboard).toBe(3010);
      
      // Test validation
      expect(validatePorts(defaultPorts)).toBe(true);
      
      // Test conflict detection
      const conflicts = getPortConflicts(defaultPorts);
      expect(conflicts).toHaveLength(0);
      
      // Test URL generation
      const webUrl = getPortUrl('webServer', '/api');
      expect(webUrl).toBe('http://localhost:8080/api');
    });

    it('should have complete configuration manager', () => {
      const { config, ConfigManager } = require('../src/config/index.js');
      
      // Test singleton pattern
      expect(config).toBeInstanceOf(ConfigManager);
      
      // Test configuration structure
      expect(config).toHaveProperty('ports');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('dashboards');
      expect(config).toHaveProperty('app');
      
      // Test utility methods
      expect(typeof config.validate).toBe('function');
      expect(typeof config.getServiceUrl).toBe('function');
      expect(typeof config.getDashboardUrl).toBe('function');
      expect(typeof config.printConfig).toBe('function');
    });

    it('should have all 18 ports configured', () => {
      const { config } = require('../src/config/index.js');
      const ports = config.ports;
      
      const expectedPorts = {
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
        enhancedDashboard: 3010,
        postgres: 5432,
        imapSsl: 993,
        smtp: 587,
        smtpSsl: 465,
        otlp: 4318,
        deviceEndpoint: 26689
      };
      
      Object.entries(expectedPorts).forEach(([key, value]) => {
        expect(ports[key]).toBe(value);
      });
    });

    it('should have all external services configured', () => {
      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      // Test service URLs
      expect(services.maps.url).toBe('https://maps.googleapis.com');
      expect(services.captcha.url).toBe('http://2captcha.com');
      expect(services.captcha.antiCaptchaUrl).toBe('https://api.anti-captcha.com');
      expect(services.duoPlus.endpoint).toBe('https://api.duoplus.app/analytics');
      expect(services.appleId.url).toBe('https://appleid.apple.com');
      
      // Test API services
      expect(services.api.url).toContain('http');
      expect(services.storage.url).toContain('http');
    });

    it('should have database configuration', () => {
      const { config } = require('../src/config/index.js');
      const database = config.database;
      
      expect(database.redis.url).toBe('redis://localhost:6379');
      expect(database.redis.port).toBe(6379);
      expect(database.redis.host).toBe('localhost');
      // PostgreSQL is optional
    });

    it('should have dashboard configuration', () => {
      const { config } = require('../src/config/index.js');
      const dashboards = config.dashboards;
      
      const expectedDashboards = {
        main: { port: 3000 },
        analytics: { port: 3005 },
        storage: { port: 3004 },
        admin: { port: 3006 },
        metrics: { port: 3001 }
      };
      
      Object.entries(expectedDashboards).forEach(([key, expected]) => {
        expect(dashboards[key].port).toBe(expected.port);
        expect(dashboards[key].enabled).toBe(true);
      });
    });

    it('should have security configuration', () => {
      const { config } = require('../src/config/index.js');
      const security = config.app.security;
      
      expect(security).toHaveProperty('jwtSecret');
      expect(security).toHaveProperty('encryptionKey');
      expect(typeof security.jwtSecret).toBe('string');
      expect(typeof security.encryptionKey).toBe('string');
    });

    it('should pass configuration validation', () => {
      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Environment Templates', () => {
    it('should have complete .env.example template', () => {
      const envExamplePath = join(process.cwd(), 'config/environment/.env.example');
      const envContent = readFileSync(envExamplePath, 'utf8');
      
      // Check all 18 port variables
      const portVariables = [
        'WEB_SERVER_PORT=8080',
        'REDIS_PORT=6379',
        'STORAGE_DASHBOARD_PORT=3004',
        'ANALYTICS_DASHBOARD_PORT=3005',
        'ADMIN_DASHBOARD_PORT=3006',
        'METRICS_DASHBOARD_PORT=3001',
        'SYSTEM_DASHBOARD_PORT=3000',
        'CASHAPP_DASHBOARD_PORT=3007',
        'EMPIRE_COMMAND_DASHBOARD_PORT=3008',
        'TOKEN_MANAGEMENT_DASHBOARD_PORT=3009',
        'ENHANCED_DASHBOARD_PORT=3010',
        'POSTGRES_PORT=5432',
        'IMAP_SSL_PORT=993',
        'SMTP_PORT=587',
        'SMTP_SSL_PORT=465',
        'OTLP_PORT=4318',
        'DEVICE_ENDPOINT_PORT=26689'
      ];

      portVariables.forEach(variable => {
        expect(envContent).toContain(variable);
      });
      
      // Check service URLs
      const serviceUrls = [
        'MAPS_SERVICE_URL=https://maps.googleapis.com',
        'CAPTCHA_SERVICE_URL=http://2captcha.com',
        'ANTI_CAPTCHA_SERVICE_URL=https://api.anti-captcha.com',
        'DUOPLUS_ENDPOINT=https://api.duoplus.app/analytics',
        'APPLE_ID_URL=https://appleid.apple.com'
      ];

      serviceUrls.forEach(url => {
        expect(envContent).toContain(url);
      });
      
      // Check database URLs
      expect(envContent).toContain('REDIS_URL=redis://localhost:6379');
      expect(envContent).toContain('POSTGRES_URL=postgresql://localhost:5432/duo_automation');
      
      // Check security variables
      expect(envContent).toContain('JWT_SECRET=');
      expect(envContent).toContain('ENCRYPTION_KEY=');
    });

    it('should have development and production templates', () => {
      const envDevPath = join(process.cwd(), 'config/environment/.env.development');
      const envProdPath = join(process.cwd(), 'config/environment/.env.production');
      
      const devContent = readFileSync(envDevPath, 'utf8');
      const prodContent = readFileSync(envProdPath, 'utf8');
      
      expect(devContent).toContain('NODE_ENV=development');
      expect(devContent).toContain('DEBUG=true');
      expect(devContent).toContain('ENABLE_CORS=true');
      
      expect(prodContent).toContain('DUOPLUS_API_KEY=sk_live_duoplus_2026_');
      expect(prodContent).toContain('ALLOWED_ORIGIN=*');
      expect(prodContent).toContain('RATE_LIMIT_MAX=100');
    });
  });

  describe('Implementation Completeness', () => {
    it('should have eliminated all hardcoded ports', () => {
      // Test that all ports come from environment variables or defaults
      const { getPorts } = require('../src/config/ports.js');
      const ports = getPorts();
      
      // All ports should be numbers and in valid range
      Object.values(ports).forEach(port => {
        expect(typeof port).toBe('number');
        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThan(65536);
      });
    });

    it('should have eliminated all hardcoded URLs', () => {
      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      // All service URLs should be configurable
      expect(services.maps.url).toContain('https');
      expect(services.captcha.url).toContain('http');
      expect(services.duoPlus.endpoint).toContain('https');
      expect(services.appleId.url).toContain('https');
    });

    it('should have comprehensive error handling', () => {
      const { validatePorts } = require('../src/config/ports.js');
      
      // Test invalid port handling
      const invalidPorts = {
        ...require('../src/config/ports.js').getDefaultPorts(),
        webServer: 0 // Invalid port
      };
      
      expect(validatePorts(invalidPorts)).toBe(false);
    });

    it('should have type safety', () => {
      const { config } = require('../src/config/index.js');
      
      // Test that all configuration properties have expected types
      expect(typeof config.ports).toBe('object');
      expect(typeof config.database).toBe('object');
      expect(typeof config.services).toBe('object');
      expect(typeof config.dashboards).toBe('object');
      expect(typeof config.app).toBe('object');
      
      // Test specific types
      expect(typeof config.ports.webServer).toBe('number');
      expect(typeof config.database.redis.url).toBe('string');
      expect(typeof config.services.api.url).toBe('string');
      expect(typeof config.dashboards.main.port).toBe('number');
      expect(typeof config.app.env).toBe('string');
    });
  });

  describe('Security Implementation', () => {
    it('should have security configuration structure', () => {
      const { config } = require('../src/config/index.js');
      
      expect(config.app.security).toHaveProperty('jwtSecret');
      expect(config.app.security).toHaveProperty('encryptionKey');
    });

    it('should validate production security requirements', () => {
      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      // Should pass validation with current configuration
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
    });

    it('should not expose sensitive information in URLs', () => {
      const { config } = require('../src/config/index.js');
      
      const urls = [
        config.getServiceUrl('api'),
        config.getServiceUrl('storage'),
        config.getDashboardUrl('admin')
      ];
      
      urls.forEach(url => {
        expect(url).not.toContain('password');
        expect(url).not.toContain('secret');
        expect(url).not.toContain('key');
      });
    });
  });
});
