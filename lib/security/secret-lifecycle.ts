/**
 * ⏰ FactoryWager Secret Lifecycle Manager v5.1
 * 
 * Automated rotation, expiration monitoring, and lifecycle policies
 * 
 * @version 5.1
 */

import { styled, log } from '../theme/colors.ts';
import { Utils } from '../utils/index.ts';
import type { LifecycleRule } from './versioned-secrets.ts';

export interface ExpirationReport {
  generated: string;
  count: number;
  critical: number;
  warnings: number;
  secrets: Array<{
    key: string;
    expiresAt: Date;
    daysLeft: number;
    severity: 'CRITICAL' | 'WARNING';
    action: string;
  }>;
  factorywager: string;
}

export class SecretLifecycleManager {
  private scheduler = new Map<string, LifecycleRule>();
  private secretRegistry = new Map<string, any>(); // Would be populated from actual secrets
  private r2Bucket: any;
  
  constructor(r2Bucket?: any) {
    this.r2Bucket = r2Bucket;
  }
  
  async scheduleRotation(key: string, rule: LifecycleRule) {
    const ruleId = `rotation-${key}-${Date.now()}`;
    
    rule.ruleId = ruleId;
    rule.nextRotation = this.calculateNextRotation(rule.schedule);
    
    this.scheduler.set(ruleId, rule);
    
    // Store rule in R2 for persistence
    if (this.r2Bucket) {
      await this.r2Bucket.put(
        `lifecycle/rules/${ruleId}.json`,
        JSON.stringify(rule, null, 2),
        {
          customMetadata: {
            'lifecycle:type': 'rotation-rule',
            'lifecycle:key': key,
            'lifecycle:schedule': rule.schedule.type,
            'lifecycle:next': rule.nextRotation.toISOString(),
            'visual:color': '#f59e0b',
            'factorywager:version': '5.1'
          }
        }
      );
    }
    
    // Setup scheduling
    if (rule.schedule.type === 'cron') {
      this.setupCron(ruleId, rule.schedule.cron!);
    } else if (rule.schedule.type === 'interval') {
      this.setupInterval(ruleId, rule.schedule.intervalMs!);
    }
    
    log.info(`Scheduled rotation for ${key}`);
    log.metric('Next rotation', rule.nextRotation.toISOString(), 'muted');
    
    return { ruleId, nextRotation: rule.nextRotation };
  }
  
  async rotateNow(key: string, reason = 'Manual rotation') {
    try {
      const current = await Bun.secrets.get(key);
      
      // Generate new value (implement based on secret type)
      const newValue = this.generateNewValue(key, current);
      
      // Set new version (would use VersionedSecretManager in real implementation)
      await Bun.secrets.set(key, newValue, {
        description: `Auto-rotation: ${reason}`,
        tags: {
          'factorywager:auto-rotated': 'true',
          'factorywager:rotation-reason': reason,
          'factorywager:rotation-timestamp': new Date().toISOString()
        }
      });
      
      log.success(`Rotated ${key}`);
      
      // In real implementation, would notify services and update dependencies
      await this.notifyRotation(key, 'v' + Date.now(), reason);
      
      return { success: true, newValue };
    } catch (error) {
      log.error(`Failed to rotate ${key}: ${error}`);
      return { success: false, error };
    }
  }
  
  async checkExpirations(): Promise<any[]> {
    const now = new Date();
    const expiring: Array<{ key: string; expiresAt: Date; daysLeft: number }> = [];
    
    // Scan all secrets with expiration metadata
    for (const [key, metadata] of this.secretRegistry) {
      if (metadata.expiresAt) {
        const expiresAt = new Date(metadata.expiresAt);
        const daysLeft = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysLeft <= 0) {
          log.error(`EXPIRED: ${key}`);
          await this.handleExpired(key);
        } else if (daysLeft <= 7) {
          expiring.push({ key, expiresAt, daysLeft });
          log.warning(`Expiring soon: ${key} (${daysLeft} days)`);
        }
      }
    }
    
    // Generate expiration report
    if (expiring.length > 0) {
      await this.generateExpirationReport(expiring);
    }
    
    return expiring;
  }
  
  private async generateExpirationReport(expiring: Array<{ key: string; daysLeft: number }>) {
    const report: ExpirationReport = {
      generated: new Date().toISOString(),
      count: expiring.length,
      critical: expiring.filter(e => e.daysLeft <= 3).length,
      warnings: expiring.filter(e => e.daysLeft > 3 && e.daysLeft <= 7).length,
      secrets: expiring.map(e => ({
        key: e.key,
        expiresAt: e.expiresAt,
        daysLeft: e.daysLeft,
        severity: e.daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
        action: e.daysLeft <= 1 ? 'ROTATE_NOW' : 'SCHEDULE_ROTATION'
      })),
      factorywager: '5.1'
    };
    
    // Store in R2
    if (this.r2Bucket) {
      await this.r2Bucket.put(
        `reports/expirations/${new Date().toISOString().split('T')[0]}.json`,
        JSON.stringify(report, null, 2),
        {
          customMetadata: {
            'report:type': 'secret-expirations',
            'report:date': new Date().toISOString(),
            'report:critical-count': report.critical.toString(),
            'visual:theme': 'factorywager-expiration-report',
            'factorywager:version': '5.1'
          }
        }
      );
      
      // Generate signed URL
      const signedUrl = await this.r2Bucket.createSignedUrl(
        `reports/expirations/${new Date().toISOString().split('T')[0]}.json`,
        { expiresInSeconds: 86400 }
      );
      
      log.metric('Expiration report', signedUrl, 'accent');
    }
    
    return { report, signedUrl: this.r2Bucket ? await this.r2Bucket.createSignedUrl(
      `reports/expirations/${new Date().toISOString().split('T')[0]}.json`,
      { expiresInSeconds: 86400 }
    ) : undefined };
  }
  
  private calculateNextRotation(schedule: LifecycleRule['schedule']): Date {
    const now = new Date();
    
    if (schedule.type === 'interval' && schedule.intervalMs) {
      return new Date(now.getTime() + schedule.intervalMs);
    }
    
    if (schedule.type === 'cron' && schedule.cron) {
      // Simple cron parsing (would use a proper cron library in production)
      // For demo, assume daily at midnight
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    // Default to 30 days from now
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return thirtyDays;
  }
  
  private setupCron(ruleId: string, cronExpression: string) {
    // In production, would use a proper cron scheduler
    log.info(`Setup cron for ${ruleId}: ${cronExpression}`);
  }
  
  private setupInterval(ruleId: string, intervalMs: number) {
    // In production, would use setInterval with proper cleanup
    log.info(`Setup interval for ${ruleId}: ${intervalMs}ms`);
  }
  
  private generateNewValue(key: string, currentValue: string): string {
    // In production, would implement proper value generation based on secret type
    if (key.includes('JWT') || key.includes('SECRET')) {
      // Generate random JWT secret
      return Bun.random.bytes(32).toString('hex');
    }
    
    if (key.includes('KEY') || key.includes('TOKEN')) {
      // Generate random API key
      return 'sk_' + Bun.random.bytes(24).toString('hex');
    }
    
    if (key.includes('PASSWORD')) {
      // Generate random password
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 16; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      return password;
    }
    
    // Default: hash current value with timestamp
    return Bun.hash.sha256(currentValue + Date.now()).toString('hex');
  }
  
  private async notifyRotation(key: string, version: string, reason: string) {
    // In production, would send notifications to configured channels
    log.info(`Notified services about ${key} rotation to ${version}`);
  }
  
  private async handleExpired(key: string) {
    // In production, would handle expired secrets (disable services, alert admins, etc.)
    log.error(`Handling expired secret: ${key}`);
    
    // Try emergency rotation
    await this.rotateNow(key, 'Emergency rotation - expired');
  }
  
  async registerSecret(key: string, metadata: any) {
    this.secretRegistry.set(key, metadata);
  }
  
  async getActiveRules(): LifecycleRule[] {
    return Array.from(this.scheduler.values());
  }
  
  async cancelRotation(ruleId: string) {
    this.scheduler.delete(ruleId);
    
    if (this.r2Bucket) {
      await this.r2Bucket.delete(`lifecycle/rules/${ruleId}.json`);
    }
    
    log.info(`Cancelled rotation rule: ${ruleId}`);
  }
}

export default SecretLifecycleManager;
