/**
 * Environment Variable Tests
 * Tests for environment variable loading and validation
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Environment Variables', () => {
  describe('Environment Templates', () => {
    it('should have valid .env.example template', () => {
      const envExamplePath = join(process.cwd(), 'config/environment/.env.example');
      const envContent = readFileSync(envExamplePath, 'utf8');
      
      // Check for required port variables
      expect(envContent).toContain('WEB_SERVER_PORT=8080');
      expect(envContent).toContain('REDIS_PORT=6379');
      expect(envContent).toContain('STORAGE_DASHBOARD_PORT=3004');
      expect(envContent).toContain('ANALYTICS_DASHBOARD_PORT=3005');
      expect(envContent).toContain('ADMIN_DASHBOARD_PORT=3006');
      expect(envContent).toContain('METRICS_DASHBOARD_PORT=3001');
      expect(envContent).toContain('SYSTEM_DASHBOARD_PORT=3000');
      expect(envContent).toContain('ENHANCED_DASHBOARD_PORT=3010');
      
      // Check for service URL variables
      expect(envContent).toContain('MAPS_SERVICE_URL=https://maps.googleapis.com');
      expect(envContent).toContain('CAPTCHA_SERVICE_URL=http://2captcha.com');
      expect(envContent).toContain('ANTI_CAPTCHA_SERVICE_URL=https://api.anti-captcha.com');
      expect(envContent).toContain('DUOPLUS_ENDPOINT=https://api.duoplus.app/analytics');
      expect(envContent).toContain('APPLE_ID_URL=https://appleid.apple.com');
      
      // Check for database URLs
      expect(envContent).toContain('REDIS_URL=redis://localhost:6379');
      expect(envContent).toContain('POSTGRES_URL=postgresql://localhost:5432/duo_automation');
      
      // Check for security variables
      expect(envContent).toContain('JWT_SECRET=');
      expect(envContent).toContain('ENCRYPTION_KEY=');
    });

    it('should have valid .env.development template', () => {
      const envDevPath = join(process.cwd(), 'config/environment/.env.development');
      const envContent = readFileSync(envDevPath, 'utf8');
      
      expect(envContent).toContain('NODE_ENV=development');
      expect(envContent).toContain('DEBUG=true');
      expect(envContent).toContain('ENABLE_CORS=true');
      expect(envContent).toContain('LOG_LEVEL=debug');
    });

    it('should have valid .env.production template', () => {
      const envProdPath = join(process.cwd(), 'config/environment/.env.production');
      const envContent = readFileSync(envProdPath, 'utf8');
      
      expect(envContent).toContain('DUOPLUS_API_KEY=sk_live_duoplus_2026_');
      expect(envContent).toContain('ALLOWED_ORIGIN=*');
      expect(envContent).toContain('RATE_LIMIT_MAX=100');
    });
  });

  describe('Port Configuration Functions', () => {
    it('should have all required port functions', () => {
      const { getPorts, getDefaultPorts, validatePorts, getPortConflicts } = require('../src/config/ports.js');
      
      expect(typeof getPorts).toBe('function');
      expect(typeof getDefaultPorts).toBe('function');
      expect(typeof validatePorts).toBe('function');
      expect(typeof getPortConflicts).toBe('function');
    });

    it('should return valid default ports', () => {
      const { getDefaultPorts } = require('../src/config/ports.js');
      const ports = getDefaultPorts();
      
      expect(ports.webServer).toBe(8080);
      expect(ports.redis).toBe(6379);
      expect(ports.storageDashboard).toBe(3004);
      expect(ports.analyticsDashboard).toBe(3005);
      expect(ports.adminDashboard).toBe(3006);
      expect(ports.metricsDashboard).toBe(3001);
      expect(ports.systemDashboard).toBe(3000);
      expect(ports.enhancedDashboard).toBe(3010);
    });

    it('should validate port configuration', () => {
      const { getDefaultPorts, validatePorts } = require('../src/config/ports.js');
      const ports = getDefaultPorts();
      
      expect(validatePorts(ports)).toBe(true);
    });

    it('should detect no conflicts in default configuration', () => {
      const { getDefaultPorts, getPortConflicts } = require('../src/config/ports.js');
      const ports = getDefaultPorts();
      const conflicts = getPortConflicts(ports);
      
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Configuration Manager Structure', () => {
    it('should export required configuration modules', () => {
      const configExports = require('../src/config/index.js');
      
      expect(configExports).toHaveProperty('ConfigManager');
      expect(configExports).toHaveProperty('config');
      expect(configExports.config).toBeInstanceOf(configExports.ConfigManager);
    });

    it('should have all configuration sections', () => {
      const { config } = require('../src/config/index.js');
      
      expect(config).toHaveProperty('ports');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('dashboards');
      expect(config).toHaveProperty('app');
    });

    it('should have all required ports in configuration', () => {
      const { config } = require('../src/config/index.js');
      const ports = config.ports;
      
      const requiredPorts = [
        'webServer', 'redis', 'storageDashboard', 'analyticsDashboard',
        'adminDashboard', 'metricsDashboard', 'systemDashboard',
        'cashappDashboard', 'empireCommandDashboard', 'tokenManagementDashboard',
        'enhancedDashboard', 'postgres', 'imapSsl', 'smtp', 'smtpSsl',
        'otlp', 'deviceEndpoint'
      ];
      
      requiredPorts.forEach(port => {
        expect(ports).toHaveProperty(port);
        expect(typeof ports[port]).toBe('number');
        expect(ports[port]).toBeGreaterThan(0);
        expect(ports[port]).toBeLessThan(65536);
      });
    });

    it('should have valid service configuration', () => {
      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      expect(services.api.url).toContain('http');
      expect(services.maps.url).toContain('https');
      expect(services.captcha.url).toContain('http');
      expect(services.duoPlus.endpoint).toContain('https');
      expect(services.appleId.url).toContain('https');
    });

    it('should have valid database configuration', () => {
      const { config } = require('../src/config/index.js');
      const database = config.database;
      
      expect(database.redis.url).toContain('redis');
      expect(database.redis.port).toBe(6379);
      expect(database.redis.host).toBe('localhost');
    });

    it('should have valid dashboard configuration', () => {
      const { config } = require('../src/config/index.js');
      const dashboards = config.dashboards;
      
      Object.values(dashboards).forEach(dashboard => {
        if (dashboard && typeof dashboard === 'object') {
          expect(dashboard).toHaveProperty('port');
          expect(dashboard).toHaveProperty('enabled');
          expect(typeof dashboard.port).toBe('number');
          expect(typeof dashboard.enabled).toBe('boolean');
        }
      });
    });
  });

  describe('Security Configuration', () => {
    it('should have security configuration structure', () => {
      const { config } = require('../src/config/index.js');
      const security = config.app.security;
      
      expect(security).toHaveProperty('jwtSecret');
      expect(security).toHaveProperty('encryptionKey');
      expect(typeof security.jwtSecret).toBe('string');
      expect(typeof security.encryptionKey).toBe('string');
    });

    it('should validate configuration', () => {
      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Environment File Coverage', () => {
    it('should contain all port variables in template', () => {
      const envExamplePath = join(process.cwd(), 'config/environment/.env.example');
      const envContent = readFileSync(envExamplePath, 'utf8');
      
      const portVariables = [
        'WEB_SERVER_PORT', 'REDIS_PORT', 'STORAGE_DASHBOARD_PORT',
        'ANALYTICS_DASHBOARD_PORT', 'ADMIN_DASHBOARD_PORT',
        'METRICS_DASHBOARD_PORT', 'SYSTEM_DASHBOARD_PORT',
        'CASHAPP_DASHBOARD_PORT', 'EMPIRE_COMMAND_DASHBOARD_PORT',
        'TOKEN_MANAGEMENT_DASHBOARD_PORT', 'ENHANCED_DASHBOARD_PORT',
        'POSTGRES_PORT', 'IMAP_SSL_PORT', 'SMTP_PORT', 'SMTP_SSL_PORT',
        'OTLP_PORT', 'DEVICE_ENDPOINT_PORT'
      ];

      portVariables.forEach(variable => {
        expect(envContent).toContain(variable);
      });
    });

    it('should contain all service URL variables in template', () => {
      const envExamplePath = join(process.cwd(), 'config/environment/.env.example');
      const envContent = readFileSync(envExamplePath, 'utf8');
      
      const urlVariables = [
        'MAPS_SERVICE_URL', 'CAPTCHA_SERVICE_URL', 'ANTI_CAPTCHA_SERVICE_URL',
        'DUOPLUS_ENDPOINT', 'APPLE_ID_URL', 'API_URL', 'STORAGE_URL',
        'REDIS_URL', 'POSTGRES_URL'
      ];

      urlVariables.forEach(variable => {
        expect(envContent).toContain(variable);
      });
    });
  });
});
