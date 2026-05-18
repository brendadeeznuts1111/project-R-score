/**
 * Environment Variable Tests
 * Tests for environment variable loading and validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

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

  describe('Port Environment Variables', () => {
    it('should handle all port environment variables', () => {
      const portVars = [
        'WEB_SERVER_PORT',
        'REDIS_PORT',
        'STORAGE_DASHBOARD_PORT',
        'ANALYTICS_DASHBOARD_PORT',
        'ADMIN_DASHBOARD_PORT',
        'METRICS_DASHBOARD_PORT',
        'SYSTEM_DASHBOARD_PORT',
        'CASHAPP_DASHBOARD_PORT',
        'EMPIRE_COMMAND_DASHBOARD_PORT',
        'TOKEN_MANAGEMENT_DASHBOARD_PORT',
        'ENHANCED_DASHBOARD_PORT',
        'POSTGRES_PORT',
        'IMAP_SSL_PORT',
        'SMTP_PORT',
        'SMTP_SSL_PORT',
        'OTLP_PORT',
        'DEVICE_ENDPOINT_PORT'
      ];

      portVars.forEach(varName => {
        process.env[varName] = '9999';
        expect(process.env[varName]).toBe('9999');
      });
    });

    it('should use default values when port variables not set', () => {
      // Clear all port environment variables
      const portVars = [
        'WEB_SERVER_PORT',
        'REDIS_PORT',
        'STORAGE_DASHBOARD_PORT',
        'ANALYTICS_DASHBOARD_PORT',
        'ADMIN_DASHBOARD_PORT',
        'METRICS_DASHBOARD_PORT',
        'SYSTEM_DASHBOARD_PORT'
      ];

      portVars.forEach(varName => {
        delete process.env[varName];
      });

      // Import and test defaults
      const { getPorts } = require('../src/config/ports.js');
      const ports = getPorts();

      expect(ports.webServer).toBe(8080);
      expect(ports.redis).toBe(6379);
      expect(ports.storageDashboard).toBe(3004);
      expect(ports.analyticsDashboard).toBe(3005);
      expect(ports.adminDashboard).toBe(3006);
      expect(ports.metricsDashboard).toBe(3001);
      expect(ports.systemDashboard).toBe(3000);
    });
  });

  describe('Service URL Environment Variables', () => {
    it('should handle all service URL variables', () => {
      const urlVars = [
        'MAPS_SERVICE_URL',
        'CAPTCHA_SERVICE_URL',
        'ANTI_CAPTCHA_SERVICE_URL',
        'DUOPLUS_ENDPOINT',
        'APPLE_ID_URL',
        'API_URL',
        'STORAGE_URL',
        'REDIS_URL',
        'POSTGRES_URL'
      ];

      urlVars.forEach(varName => {
        process.env[varName] = 'https://example.com';
        expect(process.env[varName]).toBe('https://example.com');
      });
    });

    it('should use default service URLs when not set', () => {
      delete process.env.MAPS_SERVICE_URL;
      delete process.env.CAPTCHA_SERVICE_URL;
      delete process.env.ANTI_CAPTCHA_SERVICE_URL;

      // Test through config manager
      const { config } = require('../src/config/index.js');
      
      expect(config.services.maps.url).toBe('https://maps.googleapis.com');
      expect(config.services.captcha.url).toBe('http://2captcha.com');
      expect(config.services.captcha.antiCaptchaUrl).toBe('https://api.anti-captcha.com');
    });
  });

  describe('Security Environment Variables', () => {
    it('should handle security variables', () => {
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars';
      process.env.NODE_ENV = 'production';

      const { config } = require('../src/config/index.js');
      
      expect(config.app.security.jwtSecret).toBe('test-jwt-secret');
      expect(config.app.security.encryptionKey).toBe('test-encryption-key-32-chars');
      expect(config.isProduction()).toBe(true);
    });

    it('should validate production security requirements', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.ENCRYPTION_KEY;

      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Type Detection', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      
      const { config } = require('../src/config/index.js');
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.app.debug).toBe(true);
      expect(config.app.cors.enabled).toBe(true);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      
      const { config } = require('../src/config/index.js');
      
      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(true);
      expect(config.app.debug).toBe(false);
      expect(config.app.cors.enabled).toBe(false);
    });

    it('should default to development when NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      
      const { config } = require('../src/config/index.js');
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
    });
  });

  describe('Host Configuration', () => {
    it('should use custom host when set', () => {
      process.env.HOST = 'custom-host.com';
      
      const { config } = require('../src/config/index.js');
      
      const webUrl = config.getServiceUrl('api');
      expect(webUrl).toContain('custom-host.com');
    });

    it('should use localhost when host not set', () => {
      delete process.env.HOST;
      
      const { config } = require('../src/config/index.js');
      
      const webUrl = config.getServiceUrl('api');
      expect(webUrl).toContain('localhost');
    });
  });

  describe('Monitoring Environment Variables', () => {
    it('should configure monitoring from environment', () => {
      process.env.ENABLE_METRICS = 'true';
      process.env.METRICS_PORT = '9090';
      process.env.LOG_LEVEL = 'warn';
      process.env.HEALTH_CHECK_INTERVAL = '60000';

      const { config } = require('../src/config/index.js');
      
      expect(config.app.monitoring.enabled).toBe(true);
      expect(config.app.monitoring.port).toBe(9090);
      expect(config.app.monitoring.logLevel).toBe('warn');
      expect(config.app.monitoring.interval).toBe(60000);
    });
  });

  describe('CORS Environment Variables', () => {
    it('should configure CORS from environment', () => {
      process.env.ENABLE_CORS = 'true';
      process.env.CORS_ORIGIN = 'https://example.com';

      const { config } = require('../src/config/index.js');
      
      expect(config.app.cors.enabled).toBe(true);
      expect(config.app.cors.origin).toBe('https://example.com');
    });

    it('should use default CORS origin in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ORIGIN;

      const { config } = require('../src/config/index.js');
      
      expect(config.app.cors.origin).toBe('https://empire-pro.com');
    });
  });
});
