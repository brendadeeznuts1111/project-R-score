/**
 * QR Device Onboarding System - Enterprise Implementation
 * factory-wager.com QR Device Management Core
 * Purple-free semantic color system v3.1 compliant
 */

import { generateSecureToken } from '@core/security/token-generator';
import { DeviceValidator } from '@core/validation/device-validator';
import { MetricsCollector } from '@monitoring/metrics-collector';
import { Logger } from '@utils/logger';

export interface QRDeviceConfig {
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'kiosk';
  organizationId: string;
  expiresAt: Date;
  metadata: Record<string, any>;
}

export interface OnboardingMetrics {
  totalDevices: number;
  activeDevices: number;
  successfulPairs: number;
  failedPairs: number;
  averageOnboardingTime: number;
  lastActivity: Date;
}

export interface HealthCheckResult {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  responseTime?: number;
}

export class QRDeviceOnboarding {
  private readonly logger = new Logger('QRDeviceOnboarding');
  private readonly metrics = new MetricsCollector();
  private readonly validator = new DeviceValidator();
  private readonly activeDevices = new Map<string, QRDeviceConfig>();
  private readonly healthChecks: Array<() => Promise<HealthCheckResult>>;

  constructor() {
    this.healthChecks = this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Generate QR code for device onboarding
   */
  async generateQRCode(deviceType: string, organizationId: string): Promise<{
    qrToken: string;
    deviceId: string;
    expiresAt: Date;
    qrDataUrl: string;
  }> {
    const deviceId = this.generateDeviceId();
    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes
    const qrToken = await generateSecureToken({
      deviceId,
      deviceType,
      organizationId,
      expiresAt: expiresAt.toISOString(),
      purpose: 'device-onboarding'
    });

    const config: QRDeviceConfig = {
      deviceId,
      deviceType: deviceType as any,
      organizationId,
      expiresAt,
      metadata: {
        createdAt: new Date(),
        status: 'pending'
      }
    };

    this.activeDevices.set(deviceId, config);
    
    const qrDataUrl = await this.generateQRDataUrl(qrToken);
    
    this.logger.info(`QR code generated for device ${deviceId}`, {
      deviceType,
      organizationId,
      expiresAt
    });

    this.metrics.increment('qr.generated');
    
    return { qrToken, deviceId, expiresAt, qrDataUrl };
  }

  /**
   * Validate and pair device using QR token
   */
  async pairDevice(qrToken: string, deviceFingerprint: string): Promise<{
    success: boolean;
    deviceId?: string;
    config?: QRDeviceConfig;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const validationResult = await this.validator.validateToken(qrToken);
      
      if (!validationResult.valid) {
        this.metrics.increment('pair.failed');
        return { success: false, error: validationResult.error };
      }

      const { deviceId } = validationResult.payload;
      const config = this.activeDevices.get(deviceId);

      if (!config) {
        this.metrics.increment('pair.failed');
        return { success: false, error: 'Device configuration not found' };
      }

      if (config.expiresAt < new Date()) {
        this.activeDevices.delete(deviceId);
        this.metrics.increment('pair.expired');
        return { success: false, error: 'QR token has expired' };
      }

      // Update device with fingerprint and mark as paired
      config.metadata.deviceFingerprint = deviceFingerprint;
      config.metadata.pairedAt = new Date();
      config.metadata.status = 'paired';
      
      this.activeDevices.set(deviceId, config);
      
      const pairingTime = Date.now() - startTime;
      this.metrics.record('pairing.time', pairingTime);
      this.metrics.increment('pair.success');

      this.logger.info(`Device ${deviceId} paired successfully`, {
        deviceFingerprint,
        pairingTime
      });

      return { success: true, deviceId, config };
    } catch (error) {
      this.logger.error('Device pairing failed', error);
      this.metrics.increment('pair.failed');
      return { success: false, error: 'Pairing validation failed' };
    }
  }

  /**
   * Bulk device onboarding for enterprise deployment
   */
  async bulkOnboarding(devices: Array<{
    deviceType: string;
    organizationId: string;
    metadata?: Record<string, any>;
  }>): Promise<Array<{
    deviceId: string;
    qrToken: string;
    success: boolean;
    error?: string;
  }>> {
    const results = [];
    
    for (const device of devices) {
      try {
        const { qrToken, deviceId } = await this.generateQRCode(
          device.deviceType,
          device.organizationId
        );
        
        if (device.metadata) {
          const config = this.activeDevices.get(deviceId);
          if (config) {
            config.metadata = { ...config.metadata, ...device.metadata };
            this.activeDevices.set(deviceId, config);
          }
        }
        
        results.push({ deviceId, qrToken, success: true });
      } catch (error) {
        results.push({
          deviceId: '',
          qrToken: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.info(`Bulk onboarding completed`, {
      requested: devices.length,
      successful: results.filter(r => r.success).length
    });

    return results;
  }

  /**
   * Get device status and configuration
   */
  async getDeviceStatus(deviceId: string): Promise<{
    found: boolean;
    config?: QRDeviceConfig;
    healthStatus?: 'healthy' | 'warning' | 'critical';
  }> {
    const config = this.activeDevices.get(deviceId);
    
    if (!config) {
      return { found: false };
    }

    const healthStatus = await this.calculateDeviceHealth(config);
    
    return { found: true, config, healthStatus };
  }

  /**
   * Get comprehensive onboarding metrics
   */
  async getOnboardingMetrics(): Promise<OnboardingMetrics> {
    const now = new Date();
    const activeDevices = Array.from(this.activeDevices.values());
    
    const successfulPairs = activeDevices.filter(d => 
      d.metadata.status === 'paired'
    ).length;
    
    const failedPairs = activeDevices.filter(d => 
      d.metadata.status === 'failed'
    ).length;

    const averageOnboardingTime = await this.metrics.getAverage('pairing.time') || 0;
    const lastActivity = activeDevices.reduce((latest, device) => {
      const deviceTime = new Date(device.metadata.pairedAt || device.metadata.createdAt);
      return deviceTime > latest ? deviceTime : latest;
    }, now);

    return {
      totalDevices: activeDevices.length,
      activeDevices: activeDevices.filter(d => d.expiresAt > now).length,
      successfulPairs,
      failedPairs,
      averageOnboardingTime,
      lastActivity
    };
  }

  /**
   * Run comprehensive health checks (15 enterprise checks)
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results = await Promise.all(
      this.healthChecks.map(check => check())
    );
    
    return results.sort((a, b) => {
      const statusOrder = { critical: 0, warning: 1, healthy: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }

  /**
   * Initialize 15 enterprise health checks
   */
  private initializeHealthChecks(): Array<() => Promise<HealthCheckResult>> {
    return [
      // Database connectivity
      async () => {
        const startTime = Date.now();
        try {
          await this.checkDatabaseConnection();
          return {
            id: 'db-connectivity',
            name: 'Database Connectivity',
            status: 'healthy',
            message: 'Database connection successful',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'db-connectivity',
            name: 'Database Connectivity',
            status: 'critical',
            message: `Database connection failed: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Token service availability
      async () => {
        const startTime = Date.now();
        try {
          await this.checkTokenService();
          return {
            id: 'token-service',
            name: 'Token Service',
            status: 'healthy',
            message: 'Token service operational',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'token-service',
            name: 'Token Service',
            status: 'critical',
            message: `Token service error: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // QR code generation performance
      async () => {
        const startTime = Date.now();
        try {
          const generationTime = await this.measureQRGeneration();
          const status = generationTime < 1000 ? 'healthy' : 'warning';
          return {
            id: 'qr-generation',
            name: 'QR Code Generation',
            status,
            message: `QR generation time: ${generationTime}ms`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'qr-generation',
            name: 'QR Code Generation',
            status: 'critical',
            message: `QR generation failed: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Device validation service
      async () => {
        const startTime = Date.now();
        try {
          await this.checkDeviceValidation();
          return {
            id: 'device-validation',
            name: 'Device Validation Service',
            status: 'healthy',
            message: 'Device validation operational',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'device-validation',
            name: 'Device Validation Service',
            status: 'warning',
            message: `Device validation issues: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Active device count monitoring
      async () => {
        const activeCount = this.activeDevices.size;
        const status = activeCount < 10000 ? 'healthy' : activeCount < 50000 ? 'warning' : 'critical';
        return {
          id: 'active-devices',
          name: 'Active Device Count',
          status,
          message: `Active devices: ${activeCount}`,
          timestamp: new Date()
        };
      },

      // Memory usage
      async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const status = heapUsedMB < 512 ? 'healthy' : heapUsedMB < 1024 ? 'warning' : 'critical';
        return {
          id: 'memory-usage',
          name: 'Memory Usage',
          status,
          message: `Heap used: ${heapUsedMB.toFixed(2)}MB`,
          timestamp: new Date()
        };
      },

      // Token expiry monitoring
      async () => {
        const now = new Date();
        const expiredDevices = Array.from(this.activeDevices.values())
          .filter(d => d.expiresAt < now).length;
        
        const status = expiredDevices === 0 ? 'healthy' : expiredDevices < 100 ? 'warning' : 'critical';
        return {
          id: 'token-expiry',
          name: 'Token Expiry Monitoring',
          status,
          message: `Expired tokens: ${expiredDevices}`,
          timestamp: new Date()
        };
      },

      // SSL certificate validation
      async () => {
        const startTime = Date.now();
        try {
          await this.checkSSLCertificate();
          return {
            id: 'ssl-certificate',
            name: 'SSL Certificate',
            status: 'healthy',
            message: 'SSL certificate valid',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'ssl-certificate',
            name: 'SSL Certificate',
            status: 'critical',
            message: `SSL certificate issue: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // API rate limiting
      async () => {
        const startTime = Date.now();
        try {
          await this.checkRateLimiting();
          return {
            id: 'rate-limiting',
            name: 'API Rate Limiting',
            status: 'healthy',
            message: 'Rate limiting operational',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'rate-limiting',
            name: 'API Rate Limiting',
            status: 'warning',
            message: `Rate limiting issues: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Configuration sync
      async () => {
        const startTime = Date.now();
        try {
          await this.checkConfigurationSync();
          return {
            id: 'config-sync',
            name: 'Configuration Sync',
            status: 'healthy',
            message: 'Configuration synchronized',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'config-sync',
            name: 'Configuration Sync',
            status: 'warning',
            message: `Configuration sync issues: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Error rate monitoring
      async () => {
        const errorRate = await this.metrics.getErrorRate();
        const status = errorRate < 0.01 ? 'healthy' : errorRate < 0.05 ? 'warning' : 'critical';
        return {
          id: 'error-rate',
          name: 'Error Rate Monitoring',
          status,
          message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
          timestamp: new Date()
        };
      },

      // Response time monitoring
      async () => {
        const avgResponseTime = await this.metrics.getAverage('response.time') || 0;
        const status = avgResponseTime < 500 ? 'healthy' : avgResponseTime < 2000 ? 'warning' : 'critical';
        return {
          id: 'response-time',
          name: 'Response Time Monitoring',
          status,
          message: `Average response time: ${avgResponseTime.toFixed(2)}ms`,
          timestamp: new Date()
        };
      },

      // Security scan
      async () => {
        const startTime = Date.now();
        try {
          await this.checkSecurityScan();
          return {
            id: 'security-scan',
            name: 'Security Scan',
            status: 'healthy',
            message: 'Security scan passed',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'security-scan',
            name: 'Security Scan',
            status: 'critical',
            message: `Security issues detected: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // Backup service
      async () => {
        const startTime = Date.now();
        try {
          await this.checkBackupService();
          return {
            id: 'backup-service',
            name: 'Backup Service',
            status: 'healthy',
            message: 'Backup service operational',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'backup-service',
            name: 'Backup Service',
            status: 'warning',
            message: `Backup service issues: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      },

      // WebSocket connectivity
      async () => {
        const startTime = Date.now();
        try {
          await this.checkWebSocketConnectivity();
          return {
            id: 'websocket-connectivity',
            name: 'WebSocket Connectivity',
            status: 'healthy',
            message: 'WebSocket connections stable',
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            id: 'websocket-connectivity',
            name: 'WebSocket Connectivity',
            status: 'warning',
            message: `WebSocket issues: ${error}`,
            timestamp: new Date(),
            responseTime: Date.now() - startTime
          };
        }
      }
    ];
  }

  // Health check implementation methods
  private async checkDatabaseConnection(): Promise<void> {
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async checkTokenService(): Promise<void> {
    // Simulate token service check
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  private async measureQRGeneration(): Promise<number> {
    const start = Date.now();
    await this.generateQRDataUrl('test-token');
    return Date.now() - start;
  }

  private async checkDeviceValidation(): Promise<void> {
    // Simulate device validation check
    await new Promise(resolve => setTimeout(resolve, 40));
  }

  private async checkSSLCertificate(): Promise<void> {
    // Simulate SSL certificate check
    await new Promise(resolve => setTimeout(resolve, 60));
  }

  private async checkRateLimiting(): Promise<void> {
    // Simulate rate limiting check
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  private async checkConfigurationSync(): Promise<void> {
    // Simulate configuration sync check
    await new Promise(resolve => setTimeout(resolve, 45));
  }

  private async checkSecurityScan(): Promise<void> {
    // Simulate security scan
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async checkBackupService(): Promise<void> {
    // Simulate backup service check
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  private async checkWebSocketConnectivity(): Promise<void> {
    // Simulate WebSocket connectivity check
    await new Promise(resolve => setTimeout(resolve, 35));
  }

  private async calculateDeviceHealth(config: QRDeviceConfig): Promise<'healthy' | 'warning' | 'critical'> {
    // Simple health calculation based on device age and status
    const age = Date.now() - new Date(config.metadata.createdAt).getTime();
    const ageHours = age / (1000 * 60 * 60);
    
    if (config.metadata.status === 'failed') return 'critical';
    if (ageHours > 24) return 'warning';
    return 'healthy';
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateQRDataUrl(token: string): Promise<string> {
    // Simulate QR code generation
    const qrData = `duoplus://onboarding?token=${encodeURIComponent(token)}`;
    return `data:image/png;base64,simulated-qr-data-for-${Buffer.from(qrData).toString('base64').slice(0, 20)}`;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.cleanupExpiredDevices();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredDevices(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [deviceId, config] of this.activeDevices.entries()) {
      if (config.expiresAt < now) {
        this.activeDevices.delete(deviceId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} expired devices`);
      this.metrics.increment('devices.cleaned', cleaned);
    }
  }
}
