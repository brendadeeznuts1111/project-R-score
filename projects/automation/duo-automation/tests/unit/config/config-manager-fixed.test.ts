/**
 * Configuration Manager Tests
 * Tests for the centralized configuration management system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('ConfigManager', () => {
  // Note: ConfigManager is a singleton, so we need to be careful with tests
  // that modify environment variables. Tests should be designed to work
  // with the singleton pattern or reset the singleton between tests.

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const { ConfigManager } = require('../src/config/index.js');
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      const { config } = require('../src/config/index.js');
      expect(config).toBeInstanceOf(require('../src/config/index.js').ConfigManager);
    });
  });

  describe('Default Configuration', () => {
    it('should load default port configuration', () => {
      const { config } = require('../src/config/index.js');
      const ports = config.ports;
      
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
    });

    it('should load default database configuration', () => {
      const { config } = require('../src/config/index.js');
      const db = config.database;
      
      expect(db.redis.url).toBe('redis://localhost:6379');
      expect(db.redis.port).toBe(6379);
      expect(db.redis.host).toBe('localhost');
      expect(db.postgres).toBeUndefined();
    });

    it('should load default service configuration', () => {
      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      expect(services.api.url).toBe('http://localhost:8080');
      expect(services.api.port).toBe(8080);
      expect(services.maps.url).toBe('https://maps.googleapis.com');
      expect(services.captcha.url).toBe('http://2captcha.com');
      expect(services.captcha.antiCaptchaUrl).toBe('https://api.anti-captcha.com');
    });

    it('should load default dashboard configuration', () => {
      const { config } = require('../src/config/index.js');
      const dashboards = config.dashboards;
      
      expect(dashboards.main.port).toBe(3000);
      expect(dashboards.analytics.port).toBe(3005);
      expect(dashboards.storage.port).toBe(3004);
      expect(dashboards.admin.port).toBe(3006);
      expect(dashboards.metrics.port).toBe(3001);
      
      // All dashboards should be enabled by default
      expect(dashboards.main.enabled).toBe(true);
      expect(dashboards.analytics.enabled).toBe(true);
      expect(dashboards.admin.enabled).toBe(true);
    });

    it('should load default application configuration', () => {
      const { config } = require('../src/config/index.js');
      const app = config.app;
      
      expect(app.env).toBe('test'); // Default test environment
      expect(app.debug).toBe(false);
      expect(app.cors.enabled).toBe(false);
      expect(app.security.jwtSecret).toBe('default-secret-change-in-production');
      expect(app.monitoring.enabled).toBe(true);
      expect(app.monitoring.port).toBe(9090);
    });
  });

  describe('Utility Methods', () => {
    it('should generate service URLs correctly', () => {
      const { config } = require('../src/config/index.js');
      
      const webUrl = config.getServiceUrl('api');
      const storageUrl = config.getServiceUrl('storage');
      const apiUrl = config.getServiceUrl('api', '/v1');
      
      expect(webUrl).toBe('http://localhost:8080');
      expect(storageUrl).toBe('http://localhost:3004');
      expect(apiUrl).toBe('http://localhost:8080/v1');
    });

    it('should generate dashboard URLs correctly', () => {
      const { config } = require('../src/config/index.js');
      
      const adminUrl = config.getDashboardUrl('admin');
      const mainUrl = config.getDashboardUrl('main', '/login');
      
      expect(adminUrl).toBe('http://localhost:3006');
      expect(mainUrl).toBe('http://localhost:3000/login');
    });

    it('should validate configuration', () => {
      const { config } = require('../src/config/index.js');
      const validation = config.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Configuration Methods', () => {
    it('should have configuration methods available', () => {
      const { config } = require('../src/config/index.js');
      
      expect(typeof config.printConfig).toBe('function');
      expect(typeof config.validate).toBe('function');
      expect(typeof config.getServiceUrl).toBe('function');
      expect(typeof config.getDashboardUrl).toBe('function');
      expect(typeof config.isProduction).toBe('function');
      expect(typeof config.isDevelopment).toBe('function');
    });

    it('should print configuration without errors', () => {
      const { config } = require('../src/config/index.js');
      
      expect(() => {
        config.printConfig();
      }).not.toThrow();
    });
  });

  describe('Configuration Structure', () => {
    it('should have all required configuration sections', () => {
      const { config } = require('../src/config/index.js');
      
      expect(config).toHaveProperty('ports');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('dashboards');
      expect(config).toHaveProperty('app');
    });

    it('should have port configuration with all required ports', () => {
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
      });
    });

    it('should have service configuration with all required services', () => {
      const { config } = require('../src/config/index.js');
      const services = config.services;
      
      expect(services).toHaveProperty('api');
      expect(services).toHaveProperty('storage');
      expect(services).toHaveProperty('maps');
      expect(services).toHaveProperty('captcha');
      expect(services).toHaveProperty('duoPlus');
      expect(services).toHaveProperty('appleId');
      
      expect(services.api).toHaveProperty('url');
      expect(services.api).toHaveProperty('port');
      expect(services.maps).toHaveProperty('url');
    });

    it('should have database configuration', () => {
      const { config } = require('../src/config/index.js');
      const database = config.database;
      
      expect(database).toHaveProperty('redis');
      expect(database.redis).toHaveProperty('url');
      expect(database.redis).toHaveProperty('port');
      expect(database.redis).toHaveProperty('host');
    });

    it('should have dashboard configuration', () => {
      const { config } = require('../src/config/index.js');
      const dashboards = config.dashboards;
      
      expect(dashboards).toHaveProperty('main');
      expect(dashboards).toHaveProperty('analytics');
      expect(dashboards).toHaveProperty('storage');
      expect(dashboards).toHaveProperty('admin');
      expect(dashboards).toHaveProperty('metrics');
      
      Object.values(dashboards).forEach(dashboard => {
        if (dashboard && typeof dashboard === 'object') {
          expect(dashboard).toHaveProperty('port');
          expect(dashboard).toHaveProperty('enabled');
        }
      });
    });

    it('should have application configuration', () => {
      const { config } = require('../src/config/index.js');
      const app = config.app;
      
      expect(app).toHaveProperty('env');
      expect(app).toHaveProperty('debug');
      expect(app).toHaveProperty('cors');
      expect(app).toHaveProperty('security');
      expect(app).toHaveProperty('monitoring');
      
      expect(app.cors).toHaveProperty('enabled');
      expect(app.cors).toHaveProperty('origin');
      expect(app.security).toHaveProperty('jwtSecret');
      expect(app.security).toHaveProperty('encryptionKey');
    });
  });
});
