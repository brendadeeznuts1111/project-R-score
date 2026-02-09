# 📚 Secure Development Implementation Guide

**Date:** February 5, 2026  
**Version:** 1.0  
**Audience:** Development Team  

---

## 🎯 **Overview**

This guide provides practical implementation examples and best practices for secure development using the fixed security modules. All code examples are production-ready and follow security best practices.

---

## 🔧 **Setup & Configuration**

### **Environment Configuration**

Create a `.env` file in your project root (NEVER commit to version control):

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id  
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
FACTORYWAGER_VERSION=5.0

# Optional: Custom settings
CACHE_TTL=300000
MAX_RETRY_ATTEMPTS=3
AUDIT_LOG_RETENTION_DAYS=90
```

### **TypeScript Configuration**

Update your `tsconfig.json` for strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

---

## 🔐 **Secure Secret Management**

### **Basic Secret Operations**

```typescript
import { secretManager } from './lib/security/secrets';

// Store a secret securely
async function storeApiToken() {
  try {
    const result = await secretManager.setSecret('api', 'github_token', 'ghp_xxxxxxxxxxxx');
    console.log('✅ Secret stored:', result.message);
  } catch (error) {
    console.error('❌ Failed to store secret:', error.message);
  }
}

// Retrieve a secret with caching
async function getApiToken() {
  try {
    const token = await secretManager.getSecret('api', 'github_token');
    if (token) {
      console.log('✅ Secret retrieved successfully');
      return token;
    } else {
      console.log('⚠️ Secret not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to retrieve secret:', error.message);
    throw error;
  }
}

// Delete a secret securely
async function deleteApiToken() {
  try {
    const result = await secretManager.deleteSecret('api', 'github_token');
    console.log('✅ Secret deleted:', result.message);
  } catch (error) {
    console.error('❌ Failed to delete secret:', error.message);
  }
}
```

### **Advanced Secret Operations**

```typescript
// R2 credentials management
async function setupR2Credentials() {
  try {
    // Store R2 credentials securely
    await secretManager.setR2Credentials({
      accountId: 'your-account-id',
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key',
      bucketName: 'your-bucket'
    });
    
    // Retrieve credentials when needed
    const creds = await secretManager.getR2Credentials();
    console.log('✅ R2 credentials configured');
    
    return creds;
  } catch (error) {
    console.error('❌ R2 setup failed:', error.message);
    throw error;
  }
}

// Cache management
async function manageCache() {
  // Get cache statistics
  const stats = secretManager.getCacheStats();
  console.log('📊 Cache stats:', stats);
  
  // Clear cache if needed
  if (stats.size > 100) {
    secretManager.clearCache();
    console.log('🧹 Cache cleared');
  }
}
```

---

## 📈 **Version Graph Management**

### **Creating Version History**

```typescript
import { versionGraph } from './lib/security/version-graph';

// Track secret changes with version history
async function trackSecretChange(key: string, action: string, value: string, description?: string) {
  try {
    const result = await versionGraph.update(key, {
      version: `v${Date.now()}`,
      action: action as 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'DELETE',
      timestamp: new Date().toISOString(),
      author: process.env.USER || 'system',
      description: description || `${action} operation`,
      value: value
    });
    
    console.log('✅ Version tracked:', {
      versions: result.graph.length,
      visualization: result.visualization.nodeCount
    });
    
    return result;
  } catch (error) {
    console.error('❌ Version tracking failed:', error.message);
    throw error;
  }
}

// Get secret history
async function getSecretHistory(key: string, limit: number = 10) {
  try {
    const history = await versionGraph.getHistory(key, limit);
    
    console.log(`📜 History for ${key}:`);
    history.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.version} - ${entry.action} by ${entry.author}`);
      if (entry.description) {
        console.log(`     ${entry.description}`);
      }
    });
    
    return history;
  } catch (error) {
    console.error('❌ Failed to get history:', error.message);
    throw error;
  }
}

// Generate visualizations
async function generateSecretVisualization(key: string) {
  try {
    const graph = await versionGraph.getGraph(key);
    if (graph.length === 0) {
      console.log('⚠️ No history found for visualization');
      return;
    }
    
    const viz = await versionGraph.generateVisualization(key, graph);
    
    console.log('📊 Visualization generated:');
    console.log(`  Mermaid: ${viz.mermaidUrl}`);
    console.log(`  D3.js: ${viz.d3Url}`);
    console.log(`  Latest: ${viz.latestVersion}`);
    
    return viz;
  } catch (error) {
    console.error('❌ Visualization failed:', error.message);
    throw error;
  }
}
```

### **Advanced Version Operations**

```typescript
// Rollback to previous version
async function rollbackSecret(key: string, targetVersion: string, reason?: string) {
  try {
    // Get version history
    const history = await versionGraph.getHistory(key, 50);
    const targetEntry = history.find(h => h.version === targetVersion);
    
    if (!targetEntry) {
      throw new Error(`Version ${targetVersion} not found`);
    }
    
    // Restore the value
    const [service, name] = key.includes(':') ? key.split(':') : ['default', key];
    await secretManager.setSecret(service, name, targetEntry.value || '');
    
    // Track the rollback
    await versionGraph.update(key, {
      version: `v${Date.now()}`,
      action: 'ROLLBACK',
      timestamp: new Date().toISOString(),
      author: process.env.USER || 'system',
      description: `Rollback to ${targetVersion}: ${reason || 'No reason provided'}`,
      value: targetEntry.value
    });
    
    console.log(`✅ Rolled back ${key} to ${targetVersion}`);
    return targetEntry.value;
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Get version statistics
async function getVersionStats(key: string) {
  try {
    const stats = await versionGraph.getStats(key);
    
    console.log(`📊 Statistics for ${key}:`);
    console.log(`  Total versions: ${stats.totalVersions}`);
    console.log(`  Latest version: ${stats.latestVersion}`);
    console.log(`  Last modified: ${stats.lastModified}`);
    console.log(`  Action counts:`, stats.actionCounts);
    
    return stats;
  } catch (error) {
    console.error('❌ Failed to get stats:', error.message);
    throw error;
  }
}
```

---

## ⏰ **Secret Lifecycle Management**

### **Automated Rotation Setup**

```typescript
import { secretLifecycleManager } from './lib/security/secret-lifecycle';

// Schedule automatic rotation
async function setupAutomaticRotation() {
  try {
    // Weekly rotation using cron
    const weeklyRule = await secretLifecycleManager.scheduleRotation('api:github_token', {
      key: 'api:github_token',
      schedule: {
        type: 'cron',
        cron: '0 2 * * 0' // Every Sunday at 2 AM
      },
      action: 'rotate',
      enabled: true,
      metadata: {
        description: 'Weekly GitHub token rotation',
        severity: 'HIGH',
        notifyEmails: ['admin@company.com'],
        dependentServices: ['github-api', 'ci-cd']
      }
    });
    
    console.log('✅ Weekly rotation scheduled:', {
      ruleId: weeklyRule.ruleId,
      nextRotation: weeklyRule.nextRotation
    });
    
    // Interval-based rotation (every 30 days)
    const monthlyRule = await secretLifecycleManager.scheduleRotation('db:password', {
      key: 'db:password',
      schedule: {
        type: 'interval',
        intervalMs: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      action: 'rotate',
      enabled: true,
      metadata: {
        description: 'Monthly database password rotation',
        severity: 'CRITICAL'
      }
    });
    
    console.log('✅ Monthly rotation scheduled:', monthlyRule.ruleId);
    
    return { weeklyRule, monthlyRule };
  } catch (error) {
    console.error('❌ Rotation setup failed:', error.message);
    throw error;
  }
}

// Manual rotation
async function rotateSecretNow(key: string, reason?: string) {
  try {
    const result = await secretLifecycleManager.rotateNow(key, reason || 'Manual rotation');
    
    console.log('✅ Secret rotated:', {
      version: result.version,
      preview: result.newValue,
      rotatedAt: result.rotatedAt
    });
    
    return result;
  } catch (error) {
    console.error('❌ Rotation failed:', error.message);
    throw error;
  }
}
```

### **Expiration Monitoring**

```typescript
// Check for expiring secrets
async function monitorExpirations() {
  try {
    const expiring = await secretLifecycleManager.checkExpirations();
    
    if (expiring.length === 0) {
      console.log('✅ No expiring secrets');
      return [];
    }
    
    console.log(`⚠️ ${expiring.length} expiring secrets found:`);
    
    expiring.forEach(secret => {
      const urgency = secret.daysLeft <= 3 ? '🚨 CRITICAL' : '⏠️ WARNING';
      console.log(`  ${urgency} ${secret.key} - ${secret.daysLeft} days left`);
    });
    
    return expiring;
  } catch (error) {
    console.error('❌ Expiration check failed:', error.message);
    throw error;
  }
}

// Add secret with expiration
async function addSecretWithExpiration(key: string, value: string, daysUntilExpiration: number) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysUntilExpiration);
    
    await secretLifecycleManager.addSecret(key, expiresAt, 'MEDIUM');
    await secretManager.setSecret('default', key, value);
    
    console.log(`✅ Secret ${key} added, expires ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error('❌ Failed to add secret:', error.message);
    throw error;
  }
}
```

### **Lifecycle Management**

```typescript
// Get rotation schedule
async function getRotationSchedule(key: string) {
  try {
    const schedule = await secretLifecycleManager.getRotationSchedule(key);
    
    if (schedule) {
      console.log(`📅 Rotation schedule for ${key}:`);
      console.log(`  Type: ${schedule.schedule.type}`);
      console.log(`  Enabled: ${schedule.enabled}`);
      console.log(`  Next rotation: ${schedule.nextRotation}`);
      
      if (schedule.schedule.type === 'cron') {
        console.log(`  Cron: ${schedule.schedule.cron}`);
      } else {
        console.log(`  Interval: ${schedule.schedule.intervalMs}ms`);
      }
    } else {
      console.log(`⚠️ No rotation schedule found for ${key}`);
    }
    
    return schedule;
  } catch (error) {
    console.error('❌ Failed to get schedule:', error.message);
    throw error;
  }
}

// Cancel rotation
async function cancelRotation(ruleId: string) {
  try {
    const success = await secretLifecycleManager.cancelRotation(ruleId);
    
    if (success) {
      console.log(`✅ Rotation cancelled for rule: ${ruleId}`);
    } else {
      console.log(`⚠️ Rule not found: ${ruleId}`);
    }
    
    return success;
  } catch (error) {
    console.error('❌ Failed to cancel rotation:', error.message);
    throw error;
  }
}

// Get lifecycle statistics
async function getLifecycleStatistics() {
  try {
    const stats = await secretLifecycleManager.getLifecycleStats();
    
    console.log('📊 Lifecycle Statistics:');
    console.log(`  Total rules: ${stats.totalRules}`);
    console.log(`  Active rules: ${stats.activeRules}`);
    console.log(`  Total secrets: ${stats.totalSecrets}`);
    console.log(`  Expiring soon: ${stats.expiringSoon}`);
    console.log(`  Expired: ${stats.expired}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
    throw error;
  }
}
```

---

## 🛠️ **Complete Usage Example**

```typescript
// complete-example.ts - Production-ready secret management
import { secretManager } from './lib/security/secrets';
import { versionGraph } from './lib/security/version-graph';
import { secretLifecycleManager } from './lib/security/secret-lifecycle';

class SecureSecretManager {
  private isInitialized = false;
  
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Secure Secret Manager...');
      
      // Test R2 connection
      await secretManager.getR2Credentials();
      
      // Load existing rules
      await secretLifecycleManager.getLifecycleStats();
      
      this.isInitialized = true;
      console.log('✅ Secure Secret Manager initialized');
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }
  
  async createSecureSecret(key: string, value: string, options: {
    description?: string;
    expiresInDays?: number;
    autoRotate?: boolean;
    rotationInterval?: 'weekly' | 'monthly';
  } = {}): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized');
    }
    
    try {
      const [service, name] = key.includes(':') ? key.split(':') : ['default', key];
      
      // Store the secret
      await secretManager.setSecret(service, name, value);
      
      // Track version
      await versionGraph.update(key, {
        version: `v${Date.now()}`,
        action: 'CREATE',
        timestamp: new Date().toISOString(),
        author: process.env.USER || 'system',
        description: options.description || 'Secret created',
        value: value
      });
      
      // Add to lifecycle if expiration specified
      if (options.expiresInDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + options.expiresInDays);
        
        await secretLifecycleManager.addSecret(key, expiresAt, 'MEDIUM');
      }
      
      // Setup automatic rotation if requested
      if (options.autoRotate) {
        const schedule = options.rotationInterval === 'weekly' ? {
          type: 'cron' as const,
          cron: '0 2 * * 0' // Weekly on Sunday at 2 AM
        } : {
          type: 'interval' as const,
          intervalMs: 30 * 24 * 60 * 60 * 1000 // Monthly
        };
        
        await secretLifecycleManager.scheduleRotation(key, {
          key,
          schedule,
          action: 'rotate',
          enabled: true,
          metadata: {
            description: `Automatic ${options.rotationInterval} rotation`,
            severity: 'MEDIUM'
          }
        });
      }
      
      console.log(`✅ Secret ${key} created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create secret ${key}:`, error.message);
      throw error;
    }
  }
  
  async getSecureSecret(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized');
    }
    
    try {
      const [service, name] = key.includes(':') ? key.split(':') : ['default', key];
      const secret = await secretManager.getSecret(service, name);
      
      if (secret) {
        // Track access
        await versionGraph.update(key, {
          version: `v${Date.now()}`,
          action: 'VIEW',
          timestamp: new Date().toISOString(),
          author: process.env.USER || 'system',
          description: 'Secret accessed'
        });
      }
      
      return secret;
    } catch (error) {
      console.error(`❌ Failed to get secret ${key}:`, error.message);
      throw error;
    }
  }
  
  async rotateSecret(key: string, reason?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized');
    }
    
    try {
      await secretLifecycleManager.rotateNow(key, reason);
      console.log(`✅ Secret ${key} rotated successfully`);
    } catch (error) {
      console.error(`❌ Failed to rotate secret ${key}:`, error.message);
      throw error;
    }
  }
  
  async getSecretHistory(key: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Manager not initialized');
    }
    
    try {
      return await versionGraph.getHistory(key, 10);
    } catch (error) {
      console.error(`❌ Failed to get history for ${key}:`, error.message);
      throw error;
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.isInitialized) {
      await secretLifecycleManager.shutdown();
      this.isInitialized = false;
      console.log('✅ Secure Secret Manager shut down');
    }
  }
}

// Usage example
async function main() {
  const manager = new SecureSecretManager();
  
  try {
    // Initialize
    await manager.initialize();
    
    // Create a new secret
    await manager.createSecureSecret('api:github_token', 'ghp_xxxxxxxxxxxx', {
      description: 'GitHub API token for CI/CD',
      expiresInDays: 90,
      autoRotate: true,
      rotationInterval: 'monthly'
    });
    
    // Retrieve the secret
    const token = await manager.getSecureSecret('api:github_token');
    console.log('Token retrieved:', token ? '✅ Success' : '❌ Not found');
    
    // Get history
    const history = await manager.getSecretHistory('api:github_token');
    console.log(`History entries: ${history.length}`);
    
    // Check expirations
    await secretLifecycleManager.checkExpirations();
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
  } finally {
    // Clean shutdown
    await manager.shutdown();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🔄 Shutting down...');
  process.exit(0);
});

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
```

---

## 🔍 **Testing & Validation**

### **Unit Tests Example**

```typescript
// tests/security.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { secretManager } from '../lib/security/secrets';

describe('SecretManager Security', () => {
  beforeEach(() => {
    // Set test environment variables
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
  });
  
  afterEach(() => {
    // Clean up
    secretManager.clearCache();
  });
  
  it('should reject missing credentials', () => {
    delete process.env.R2_ACCOUNT_ID;
    
    expect(() => {
      const manager = new SecretManager();
    }).toThrow('Missing required R2 credentials');
  });
  
  it('should handle concurrent access safely', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      secretManager.setSecret('test', `key${i}`, `value${i}`)
    );
    
    await expect(Promise.all(promises)).resolves.not.toThrow();
  });
  
  it('should validate input parameters', async () => {
    await expect(secretManager.setSecret('', 'name', 'value'))
      .rejects.toThrow('Invalid parameters');
      
    await expect(secretManager.setSecret('service', '', 'value'))
      .rejects.toThrow('Invalid parameters');
  });
});
```

### **Integration Tests Example**

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { secretManager, versionGraph, secretLifecycleManager } from '../lib/security';

describe('Security Integration', () => {
  const testKey = 'test:integration-secret';
  
  beforeAll(async () => {
    // Setup test environment
    process.env.R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'test-account';
    process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'test-secret';
  });
  
  afterAll(async () => {
    // Cleanup
    await secretLifecycleManager.shutdown();
  });
  
  it('should handle complete secret lifecycle', async () => {
    // Create secret
    await secretManager.setSecret('test', 'integration-secret', 'initial-value');
    
    // Track version
    await versionGraph.update(testKey, {
      version: 'v1.0.0',
      action: 'CREATE',
      timestamp: new Date().toISOString(),
      author: 'test-suite',
      value: 'initial-value'
    });
    
    // Update secret
    await secretManager.setSecret('test', 'integration-secret', 'updated-value');
    
    // Track update
    await versionGraph.update(testKey, {
      version: 'v1.1.0',
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
      author: 'test-suite',
      value: 'updated-value'
    });
    
    // Verify history
    const history = await versionGraph.getHistory(testKey, 5);
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe('UPDATE');
    expect(history[1].action).toBe('CREATE');
    
    // Cleanup
    await secretManager.deleteSecret('test', 'integration-secret');
  });
});
```

---

## 📊 **Monitoring & Observability**

### **Health Check Implementation**

```typescript
// monitoring/health-check.ts
export class SecurityHealthCheck {
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks = {
      r2Connection: await this.checkR2Connection(),
      cacheOperations: await this.checkCacheOperations(),
      versionGraph: await this.checkVersionGraph(),
      lifecycleManager: await this.checkLifecycleManager()
    };
    
    const allHealthy = Object.values(checks).every(Boolean);
    const someHealthy = Object.values(checks).some(Boolean);
    
    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    };
  }
  
  private async checkR2Connection(): Promise<boolean> {
    try {
      await secretManager.getR2Credentials();
      return true;
    } catch {
      return false;
    }
  }
  
  private async checkCacheOperations(): Promise<boolean> {
    try {
      secretManager.clearCache();
      const stats = secretManager.getCacheStats();
      return stats.size === 0;
    } catch {
      return false;
    }
  }
  
  private async checkVersionGraph(): Promise<boolean> {
    try {
      const graphs = await versionGraph.listAllGraphs();
      return Array.isArray(graphs);
    } catch {
      return false;
    }
  }
  
  private async checkLifecycleManager(): Promise<boolean> {
    try {
      const stats = await secretLifecycleManager.getLifecycleStats();
      return typeof stats.totalRules === 'number';
    } catch {
      return false;
    }
  }
}
```

---

## 🎯 **Best Practices Summary**

### **Security:**
- ✅ Always use environment variables for credentials
- ✅ Implement proper authentication (AWS Signature V4)
- ✅ Use thread-safe operations for shared resources
- ✅ Validate all input parameters
- ✅ Implement proper error handling and logging

### **Performance:**
- ✅ Use caching for frequently accessed secrets
- ✅ Implement proper cleanup to prevent memory leaks
- ✅ Use connection pooling for external services
- ✅ Monitor resource usage and performance metrics

### **Reliability:**
- ✅ Implement graceful shutdown procedures
- ✅ Use retry mechanisms for transient failures
- ✅ Add comprehensive logging and monitoring
- ✅ Test all failure scenarios

### **Maintainability:**
- ✅ Follow TypeScript strict mode guidelines
- ✅ Write comprehensive tests
- ✅ Document all security procedures
- ✅ Regular security audits and updates

---

**This implementation guide provides production-ready code examples for secure secret management, version tracking, and lifecycle operations.**
