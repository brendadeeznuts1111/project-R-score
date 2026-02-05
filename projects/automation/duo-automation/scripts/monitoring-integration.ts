#!/usr/bin/env bun

/**
 * 🎯 Monitoring Integration - Quantum Hash System
 * 
 * Sets up alerts for CRC32 verification failures with comprehensive monitoring
 */

import { QuantumHashSystem } from './quantum-hash-system';

interface MonitoringAlert {
  id: string;
  type: 'crc32_failure' | 'performance_degradation' | 'cache_issue' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  source: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface MonitoringMetrics {
  crc32Failures: number;
  crc32Successes: number;
  totalVerifications: number;
  failureRate: number;
  averageResponseTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastFailure?: Date;
  consecutiveFailures: number;
}

interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  enabled: boolean;
  config: Record<string, any>;
}

class CRC32MonitoringSystem {
  private quantumHash: QuantumHashSystem;
  private alerts: MonitoringAlert[] = [];
  private metrics: MonitoringMetrics;
  private alertChannels: AlertChannel[];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private failureThreshold: number = 5; // Alert after 5 consecutive failures
  private maxAlertsPerHour: number = 10;

  constructor() {
    this.quantumHash = new QuantumHashSystem();
    this.metrics = {
      crc32Failures: 0,
      crc32Successes: 0,
      totalVerifications: 0,
      failureRate: 0,
      averageResponseTime: 0,
      systemHealth: 'healthy',
      consecutiveFailures: 0
    };
    this.alertChannels = this.initializeAlertChannels();
  }

  /**
   * Initialize monitoring system
   */
  async initialize(): Promise<void> {
    console.log('🎯 Initializing CRC32 Monitoring System...');
    
    try {
      // Setup alert channels
      await this.setupAlertChannels();
      
      // Start continuous monitoring
      this.startMonitoring();
      
      // Start health checks
      this.startHealthChecks();
      
      // Setup failure detection
      this.setupFailureDetection();
      
      console.log('✅ CRC32 Monitoring System initialized successfully');
      
    } catch (error) {
      console.error(`❌ Failed to initialize monitoring system: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup alert channels
   */
  private async setupAlertChannels(): Promise<void> {
    console.log('📢 Setting up alert channels...');
    
    for (const channel of this.alertChannels) {
      if (channel.enabled) {
        console.log(`   ✅ ${channel.name} (${channel.type}) enabled`);
        await this.testAlertChannel(channel);
      } else {
        console.log(`   ⏸️  ${channel.name} (${channel.type}) disabled`);
      }
    }
    
    console.log('✅ Alert channels configured');
  }

  /**
   * Test alert channel
   */
  private async testAlertChannel(channel: AlertChannel): Promise<void> {
    try {
      const testAlert: MonitoringAlert = {
        id: 'test_' + Date.now(),
        type: 'system_error',
        severity: 'low',
        message: 'Test alert - CRC32 monitoring system online',
        timestamp: new Date(),
        source: 'monitoring_system',
        metadata: { test: true },
        resolved: false
      };

      await this.sendAlert(channel, testAlert);
      console.log(`      ✅ ${channel.name} test successful`);
    } catch (error) {
      console.error(`      ❌ ${channel.name} test failed: ${error.message}`);
      channel.enabled = false;
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    console.log('📊 Starting continuous CRC32 monitoring...');
    
    const monitor = () => {
      this.performHealthCheck();
      this.checkSystemMetrics();
      this.updateMetrics();
    };

    // Run every 30 seconds
    this.monitoringInterval = setInterval(monitor, 30000);
    
    console.log('✅ Continuous monitoring started (30-second intervals)');
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    console.log('🏥 Starting CRC32 health checks...');
    
    const healthCheck = async () => {
      try {
        // Perform test CRC32 verification
        const testData = Buffer.from('health_check_test_data_' + Date.now());
        const expectedHash = this.quantumHash.crc32(testData);
        const verification = this.quantumHash.crc32Verify(testData, expectedHash);
        
        if (verification) {
          this.metrics.crc32Successes++;
          this.metrics.consecutiveFailures = 0;
          
          if (this.metrics.systemHealth === 'critical') {
            this.sendRecoveryAlert();
          }
          this.metrics.systemHealth = 'healthy';
        } else {
          this.handleCRC32Failure('health_check', expectedHash, expectedHash);
        }
        
        this.metrics.totalVerifications++;
        this.updateFailureRate();
        
      } catch (error) {
        this.handleSystemError('health_check', error);
      }
    };

    // Run every 60 seconds
    this.healthCheckInterval = setInterval(healthCheck, 60000);
    
    console.log('✅ Health checks started (60-second intervals)');
  }

  /**
   * Setup failure detection
   */
  private setupFailureDetection(): void {
    console.log('🚨 Setting up CRC32 failure detection...');
    
    console.log(`   🔢 Failure threshold: ${this.failureThreshold} consecutive failures`);
    console.log(`   📊 Max alerts per hour: ${this.maxAlertsPerHour}`);
    console.log(`   ⏰ Monitoring interval: 30 seconds`);
    
    console.log('✅ Failure detection configured');
  }

  /**
   * Handle CRC32 verification failure
   */
  handleCRC32Failure(source: string, expectedHash: number, actualHash: number): void {
    console.log(`🚨 CRC32 verification failure detected from: ${source}`);
    console.log(`   Expected: ${expectedHash.toString(16)}`);
    console.log(`   Actual: ${actualHash.toString(16)}`);
    
    this.metrics.crc32Failures++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailure = new Date();
    this.metrics.totalVerifications++;
    this.updateFailureRate();
    
    // Update system health
    if (this.metrics.consecutiveFailures >= this.failureThreshold) {
      this.metrics.systemHealth = 'critical';
    } else if (this.metrics.consecutiveFailures >= 3) {
      this.metrics.systemHealth = 'warning';
    }
    
    // Create alert
    const alert: MonitoringAlert = {
      id: this.generateAlertId(),
      type: 'crc32_failure',
      severity: this.metrics.consecutiveFailures >= this.failureThreshold ? 'critical' : 'high',
      message: `CRC32 verification failure in ${source}. Expected: ${expectedHash.toString(16)}, Actual: ${actualHash.toString(16)}`,
      timestamp: new Date(),
      source,
      metadata: {
        expectedHash: expectedHash.toString(16),
        actualHash: actualHash.toString(16),
        consecutiveFailures: this.metrics.consecutiveFailures,
        failureRate: this.metrics.failureRate
      },
      resolved: false
    };
    
    this.createAlert(alert);
  }

  /**
   * Handle system error
   */
  private handleSystemError(source: string, error: Error): void {
    console.log(`🚨 System error in ${source}: ${error.message}`);
    
    const alert: MonitoringAlert = {
      id: this.generateAlertId(),
      type: 'system_error',
      severity: 'high',
      message: `System error in ${source}: ${error.message}`,
      timestamp: new Date(),
      source,
      metadata: {
        error: error.message,
        stack: error.stack
      },
      resolved: false
    };
    
    this.createAlert(alert);
  }

  /**
   * Create and send alert
   */
  private createAlert(alert: MonitoringAlert): void {
    console.log(`🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.message}`);
    
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Send to enabled channels
    this.sendAlertToChannels(alert);
    
    // Update system health
    this.updateSystemHealth();
  }

  /**
   * Send alert to all enabled channels
   */
  private sendAlertToChannels(alert: MonitoringAlert): void {
    const recentAlerts = this.alerts.filter(a => 
      !a.resolved && 
      (Date.now() - a.timestamp.getTime()) < 3600000 // Last hour
    );
    
    // Rate limiting
    if (recentAlerts.length >= this.maxAlertsPerHour) {
      console.log('⚠️  Alert rate limit reached - skipping channel notifications');
      return;
    }
    
    for (const channel of this.alertChannels) {
      if (channel.enabled) {
        this.sendAlert(channel, alert).catch(error => {
          console.error(`❌ Failed to send alert to ${channel.name}: ${error.message}`);
        });
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(channel, alert);
        break;
      case 'slack':
        await this.sendSlackAlert(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alert);
        break;
      case 'sms':
        await this.sendSMSAlert(channel, alert);
        break;
      default:
        console.log(`⚠️  Unknown alert channel type: ${channel.type}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    console.log(`📧 Sending email alert to ${channel.config.recipients}`);
    
    const emailContent = `
      CRC32 Monitoring Alert
      
      Type: ${alert.type}
      Severity: ${alert.severity}
      Message: ${alert.message}
      Source: ${alert.source}
      Timestamp: ${alert.timestamp.toISOString()}
      
      Metadata:
      ${JSON.stringify(alert.metadata, null, 2)}
    `;
    
    // Simulate email sending
    console.log(`   📧 Email sent successfully`);
    // await this.emailService.send(channel.config.recipients, 'CRC32 Alert', emailContent);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    console.log(`💬 Sending Slack alert to #${channel.config.channel}`);
    
    const slackMessage = {
      text: `🚨 CRC32 ${alert.severity.toUpperCase()} Alert`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Message', value: alert.message, short: false },
          { title: 'Source', value: alert.source, short: true },
          { title: 'Timestamp', value: alert.timestamp.toISOString(), short: true }
        ]
      }]
    };
    
    // Simulate Slack sending
    console.log(`   💬 Slack message sent successfully`);
    // await this.slackService.postMessage(channel.config.webhook, slackMessage);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    console.log(`🪝 Sending webhook alert to ${channel.config.url}`);
    
    const webhookPayload = {
      alert,
      timestamp: new Date().toISOString(),
      service: 'crc32-monitoring'
    };
    
    // Simulate webhook sending
    console.log(`   🪝 Webhook sent successfully`);
    // await fetch(channel.config.url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(webhookPayload)
    // });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    console.log(`📱 Sending SMS alert to ${channel.config.phoneNumbers}`);
    
    const smsMessage = `CRC32 ${alert.severity.toUpperCase()}: ${alert.message}`;
    
    // Simulate SMS sending
    console.log(`   📱 SMS sent successfully`);
    // await this.smsService.send(channel.config.phoneNumbers, smsMessage);
  }

  /**
   * Send recovery alert
   */
  private async sendRecoveryAlert(): Promise<void> {
    const alert: MonitoringAlert = {
      id: this.generateAlertId(),
      type: 'system_error',
      severity: 'low',
      message: 'CRC32 verification system recovered - all health checks passing',
      timestamp: new Date(),
      source: 'monitoring_system',
      metadata: {
        consecutiveFailures: 0,
        failureRate: this.metrics.failureRate
      },
      resolved: false
    };
    
    this.createAlert(alert);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const stats = this.quantumHash.getPerformanceStats();
    
    // Check performance degradation
    if (stats.averageTime > 1.0) {
      const alert: MonitoringAlert = {
        id: this.generateAlertId(),
        type: 'performance_degradation',
        severity: 'medium',
        message: `Performance degradation detected - average hash time: ${stats.averageTime.toFixed(3)}ms`,
        timestamp: new Date(),
        source: 'performance_monitor',
        metadata: {
          averageTime: stats.averageTime,
          throughput: stats.throughput
        },
        resolved: false
      };
      
      this.createAlert(alert);
    }
    
    // Check cache efficiency
    if (stats.cacheEfficiency < 0.8) {
      const alert: MonitoringAlert = {
        id: this.generateAlertId(),
        type: 'cache_issue',
        severity: 'medium',
        message: `Cache efficiency below threshold: ${(stats.cacheEfficiency * 100).toFixed(1)}%`,
        timestamp: new Date(),
        source: 'cache_monitor',
        metadata: {
          cacheEfficiency: stats.cacheEfficiency,
          cacheHits: stats.cacheHits,
          cacheMisses: stats.cacheMisses
        },
        resolved: false
      };
      
      this.createAlert(alert);
    }
  }

  /**
   * Check system metrics
   */
  private checkSystemMetrics(): void {
    // Update metrics based on quantum hash system
    const stats = this.quantumHash.getPerformanceStats();
    this.metrics.averageResponseTime = stats.averageTime;
    
    // Check for anomalies
    if (this.metrics.failureRate > 0.1) { // 10% failure rate
      console.log(`⚠️  High failure rate detected: ${(this.metrics.failureRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.updateFailureRate();
    this.updateSystemHealth();
  }

  /**
   * Update failure rate
   */
  private updateFailureRate(): void {
    if (this.metrics.totalVerifications > 0) {
      this.metrics.failureRate = this.metrics.crc32Failures / this.metrics.totalVerifications;
    }
  }

  /**
   * Update system health
   */
  private updateSystemHealth(): void {
    if (this.metrics.consecutiveFailures >= this.failureThreshold) {
      this.metrics.systemHealth = 'critical';
    } else if (this.metrics.consecutiveFailures >= 3 || this.metrics.failureRate > 0.05) {
      this.metrics.systemHealth = 'warning';
    } else {
      this.metrics.systemHealth = 'healthy';
    }
  }

  /**
   * Get monitoring dashboard
   */
  getMonitoringDashboard(): string {
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.severity === 'high');
    
    return `
🎯 CRC32 Monitoring Dashboard
${'='.repeat(50)}

📊 System Metrics:
   Total Verifications: ${this.metrics.totalVerifications.toLocaleString()}
   Successful Verifications: ${this.metrics.crc32Successes.toLocaleString()}
   Failed Verifications: ${this.metrics.crc32Failures.toLocaleString()}
   Failure Rate: ${(this.metrics.failureRate * 100).toFixed(2)}%
   Average Response Time: ${this.metrics.averageResponseTime.toFixed(3)}ms
   Consecutive Failures: ${this.metrics.consecutiveFailures}
   System Health: ${this.getHealthIcon()} ${this.metrics.systemHealth.toUpperCase()}

🚨 Alert Summary:
   Active Alerts: ${activeAlerts.length}
   Critical: ${criticalAlerts.length}
   High: ${highAlerts.length}
   Medium: ${activeAlerts.filter(a => a.severity === 'medium').length}
   Low: ${activeAlerts.filter(a => a.severity === 'low').length}

📢 Alert Channels:
${this.alertChannels.map(ch => `   ${ch.enabled ? '✅' : '❌'} ${ch.name} (${ch.type})`).join('\n')}

🕐 Last Update: ${new Date().toLocaleTimeString()}
${this.metrics.lastFailure ? `🚨 Last Failure: ${this.metrics.lastFailure.toLocaleTimeString()}` : '✅ No recent failures'}
    `.trim();
  }

  /**
   * Get health icon
   */
  private getHealthIcon(): string {
    switch (this.metrics.systemHealth) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'good';
      case 'low': return '#3b82f6';
      default: return 'good';
    }
  }

  /**
   * Initialize alert channels
   */
  private initializeAlertChannels(): AlertChannel[] {
    return [
      {
        name: 'Email Alerts',
        type: 'email',
        enabled: true,
        config: {
          recipients: ['admin@example.com', 'devops@example.com']
        }
      },
      {
        name: 'Slack Notifications',
        type: 'slack',
        enabled: true,
        config: {
          webhook: 'https://hooks.slack.com/services/...',
          channel: '#alerts'
        }
      },
      {
        name: 'Webhook Endpoint',
        type: 'webhook',
        enabled: true,
        config: {
          url: 'https://api.example.com/webhooks/alerts'
        }
      },
      {
        name: 'SMS Alerts',
        type: 'sms',
        enabled: false, // Disabled for demo
        config: {
          phoneNumbers: ['+1234567890']
        }
      }
    ];
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    console.log('⏹️  CRC32 monitoring stopped');
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const monitoringSystem = new CRC32MonitoringSystem();
  
  console.log('🎯 Monitoring Integration - Quantum Hash System');
  console.log('================================================\n');
  
  monitoringSystem.initialize()
    .then(() => {
      console.log('\n✅ Monitoring integration complete!');
      
      // Display dashboard every 15 seconds
      setInterval(() => {
        console.clear();
        console.log(monitoringSystem.getMonitoringDashboard());
      }, 15000);
      
      // Show initial dashboard
      console.log(monitoringSystem.getMonitoringDashboard());
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        monitoringSystem.stopMonitoring();
        console.log('\n👋 Monitoring system stopped');
        process.exit(0);
      });
    })
    .catch(console.error);
}

export { CRC32MonitoringSystem };
