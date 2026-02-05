/**
 * Configuration Manager Tests
 * Tests for the centralized configuration management system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigManager, config } from '../src/config/index.js';

describe('ConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    config.refresh();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(config).toBeInstanceOf(ConfigManager);
    });
  });

  describe('Port Configuration', () => {
    it('should load port configuration from environment', () => {
      process.env.WEB_SERVER_PORT = '9000';
      process.env.REDIS_PORT = '6380';
      config.refresh();
      
      const ports = config.ports;
      
      expect(ports.webServer).toBe(9000);
      expect(ports.redis).toBe(6380);
    });

    it('should use default ports when environment not set', () => {
      delete process.env.WEB_SERVER_PORT;
      config.refresh();
      
      const ports = config.ports;
      
      expect(ports.webServer).toBe(8080);
    });
  });

  describe('Database Configuration', () => {
    it('should configure Redis from environment', () => {
      process.env.REDIS_URL = 'redis://custom-host:6380';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_HOST = 'custom-host';
      config.refresh();
      
      const db = config.database;
      
      expect(db.redis.url).toBe('redis://custom-host:6380');
      expect(db.redis.port).toBe(6380);
      expect(db.redis.host).toBe('custom-host');
    });

    it('should build Redis URL from port and host', () => {
      process.env.REDIS_HOST = 'redis-server';
      process.env.REDIS_PORT = '6380';
      delete process.env.REDIS_URL;
      config.refresh();
      
      const db = config.database;
      
      expect(db.redis.url).toBe('redis://redis-server:6380');
      expect(db.redis.port).toBe(6380);
      expect(db.redis.host).toBe('redis-server');
    });

    it('should configure PostgreSQL when provided', () => {
      process.env.POSTGRES_URL = 'postgresql://postgres:5432/duo_automation';
      process.env.POSTGRES_PORT = '5432';
      config.refresh();
      
      const db = config.database;
      
      expect(db.postgres?.url).toBe('postgresql://postgres:5432/duo_automation');
      expect(db.postgres?.port).toBe(5432);
    });

    it('should not configure PostgreSQL when not provided', () => {
      delete process.env.POSTGRES_URL;
      
      const db = config.database;
      
      expect(db.postgres).toBeUndefined();
    });
  });

  describe('Service Configuration', () => {
    it('should configure API service from environment', () => {
      process.env.API_URL = 'https://api.empire-pro.com';
      process.env.WEB_SERVER_PORT = '80';
      config.refresh();
      
      const services = config.services;
      
      expect(services.api.url).toBe('https://api.empire-pro.com');
      expect(services.api.port).toBe(80);
    });

    it('should build API URL from host and port', () => {
      process.env.HOST = 'api.empire-pro.com';
      process.env.WEB_SERVER_PORT = '443';
      delete process.env.API_URL;
      config.refresh();
      
      const services = config.services;
      
      expect(services.api.url).toBe('http://api.empire-pro.com:443');
    });

    it('should configure external service URLs', () => {
      process.env.MAPS_SERVICE_URL = 'https://custom-maps.com';
      process.env.CAPTCHA_SERVICE_URL = 'https://custom-captcha.com';
      config.refresh();
      
      const services = config.services;
      
      expect(services.maps.url).toBe('https://custom-maps.com');
      expect(services.captcha.url).toBe('https://custom-captcha.com');
      expect(services.captcha.antiCaptchaUrl).toBe('https://api.anti-captcha.com');
    });
  });

  describe('Dashboard Configuration', () => {
    it('should configure all dashboards from environment', () => {
      process.env.SYSTEM_DASHBOARD_PORT = '3000';
      process.env.ANALYTICS_DASHBOARD_PORT = '3005';
      process.env.STORAGE_DASHBOARD_PORT = '3010';
      config.refresh();
      
      const dashboards = config.dashboards;
      
      expect(dashboards.main.port).toBe(3000);
      expect(dashboards.analytics.port).toBe(3005);
      expect(dashboards.storage.port).toBe(3010);
    });

    it('should enable dashboards by default', () => {
      const dashboards = config.dashboards;
      
      expect(dashboards.main.enabled).toBe(true);
      expect(dashboards.analytics.enabled).toBe(true);
      expect(dashboards.admin.enabled).toBe(true);
    });

    it('should disable dashboards when configured', () => {
      process.env.ENABLE_MAIN_DASHBOARD = 'false';
      process.env.ENABLE_ANALYTICS_DASHBOARD = 'false';
      config.refresh();
      
      const dashboards = config.dashboards;
      
      expect(dashboards.main.enabled).toBe(false);
      expect(dashboards.analytics.enabled).toBe(false);
    });
  });

  describe('Application Configuration', () => {
    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      config.refresh();
      
      const app = config.app;
      
      expect(app.env).toBe('production');
      expect(app.debug).toBe(false);
      expect(app.cors.enabled).toBe(false);
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      config.refresh();
      
      const app = config.app;
      
      expect(app.env).toBe('development');
      expect(app.debug).toBe(true);
      expect(app.cors.enabled).toBe(true);
      expect(app.cors.origin).toBe('http://localhost:3000');
    });

    it('should configure security settings', () => {
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars';
      config.refresh();
      
      const app = config.app;
      
      expect(app.security.jwtSecret).toBe('test-jwt-secret');
      expect(app.security.encryptionKey).toBe('test-encryption-key-32-chars');
    });

    it('should configure monitoring settings', () => {
      process.env.METRICS_PORT = '9090';
      process.env.ENABLE_METRICS = 'true';
      process.env.LOG_LEVEL = 'debug';
      
      const app = config.app;
      
      expect(app.monitoring.port).toBe(9090);
      expect(app.monitoring.enabled).toBe(true);
      expect(app.monitoring.logLevel).toBe('debug');
    });
  });

  describe('Utility Methods', () => {
    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      config.refresh();
      
      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      config.refresh();
      
      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(true);
    });

    it('should get service URLs', () => {
      process.env.STORAGE_URL = 'https://storage.empire-pro.com';
      config.refresh();
      
      const storageUrl = config.getServiceUrl('storage');
      const apiUrl = config.getServiceUrl('api', '/v1');
      
      expect(storageUrl).toBe('https://storage.empire-pro.com');
      expect(apiUrl).toContain('/v1');
    });

    it('should get dashboard URLs', () => {
      process.env.HOST = 'empire-pro.com';
      process.env.ADMIN_DASHBOARD_PORT = '3006';
      
      const adminUrl = config.getDashboardUrl('admin', '/login');
      
      expect(adminUrl).toBe('http://empire-pro.com:3006/login');
    });
  });

  describe('Validation', () => {
    it('should pass validation in development', () => {
      process.env.NODE_ENV = 'development';
      config.refresh();
      
      const validation = config.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation in production without security', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.ENCRYPTION_KEY;
      config.refresh();
      
      const validation = config.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('JWT_SECRET must be set in production');
    });

    it('should pass validation in production with security', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'production-jwt-secret';
      process.env.ENCRYPTION_KEY = 'production-encryption-key-32-chars';
      
      const validation = config.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid port ranges', () => {
      process.env.WEB_SERVER_PORT = '99999';
      config.refresh();
      
      const validation = config.validate();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid port number'))).toBe(true);
    });
  });

  describe('Print Configuration', () => {
    it('should print configuration without errors', () => {
      expect(() => {
        config.printConfig();
      }).not.toThrow();
    });
  });
});
