// monitoring/secrets-health-export.ts - Exportable secrets health monitoring interface

import { detectPlatformCapabilities } from '../utils/platform-detector';

export interface HealthMetrics {
  latency: number;
  storageAvailable: boolean;
  scopingValid: boolean;
  encryptionStrength: string;
  platformCapabilities: any;
  timestamp: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: HealthMetrics;
  alerts: string[];
  recommendations: string[];
  summary: {
    overall: number; // 0-100 score
    performance: number;
    security: number;
    reliability: number;
  };
}

/**
 * Measure secrets operation latency
 */
async function measureSecretsLatency(): Promise<number> {
  const startTime = Date.now();
  
  try {
    // @ts-ignore - Bun.secrets is experimental
    const { secrets } = Bun;
    const testService = 'health-check-latency';
    const testKey = `latency-test-${Date.now()}`;
    const testValue = 'health-check-value';
    
    // Measure set operation
    const setStart = Date.now();
    await secrets.set({
      service: testService,
      name: testKey,
      value: testValue,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    const setDuration = Date.now() - setStart;
    
    // Measure get operation
    const getStart = Date.now();
    await secrets.get({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    const getDuration = Date.now() - getStart;
    
    // Cleanup
    await secrets.delete({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const totalDuration = Date.now() - startTime;
    return Math.max(setDuration, getDuration, totalDuration / 3);
    
  } catch (error) {
    console.error('Latency measurement failed:', error);
    return -1; // Indicates failure
  }
}

/**
 * Verify storage accessibility
 */
async function verifyStorageAccess(): Promise<boolean> {
  try {
    // @ts-ignore - Bun.secrets is experimental
    const { secrets } = Bun;
    const testService = 'health-check-storage';
    const testKey = `storage-test-${Date.now()}`;
    const testValue = 'storage-verification';
    
    // Test write capability
    await secrets.set({
      service: testService,
      name: testKey,
      value: testValue,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Test read capability
    const retrieved = await secrets.get({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Test delete capability
    await secrets.delete({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    return retrieved === testValue;
    
  } catch (error) {
    console.error('Storage access verification failed:', error);
    return false;
  }
}

/**
 * Validate scoping integrity
 */
async function validateScopingIntegrity(): Promise<boolean> {
  try {
    const capabilities = detectPlatformCapabilities();
    const expectedScope = capabilities.hasCredentialManager ? 'ENTERPRISE' : 'USER';
    
    // @ts-ignore - Bun.secrets is experimental
    const { secrets } = Bun;
    const testService = `windsurf-r2-empire-${expectedScope}-health`;
    const testKey = 'scoping-test';
    const testValue = 'scoping-verification';
    
    // Test scoped service naming and access
    await secrets.set({
      service: testService,
      name: testKey,
      value: testValue,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    const retrieved = await secrets.get({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    // Cleanup
    await secrets.delete({
      service: testService,
      name: testKey,
      persist: 'CRED_PERSIST_ENTERPRISE' as const
    } as any);
    
    return retrieved === testValue;
    
  } catch (error) {
    console.error('Scoping integrity validation failed:', error);
    return false;
  }
}

/**
 * Generate comprehensive health report
 */
function generateHealthReport(metrics: HealthMetrics): HealthReport {
  const alerts: string[] = [];
  const recommendations: string[] = [];
  
  // Performance alerts
  if (metrics.latency > 100) {
    alerts.push(`High latency detected: ${metrics.latency}ms (threshold: 100ms)`);
    recommendations.push('Investigate platform-specific storage performance');
  } else if (metrics.latency > 50) {
    alerts.push(`Elevated latency: ${metrics.latency}ms (threshold: 50ms)`);
  }
  
  if (metrics.latency === -1) {
    alerts.push('Critical: Secrets operations are failing');
    recommendations.push('Check platform compatibility and permissions');
  }
  
  // Storage alerts
  if (!metrics.storageAvailable) {
    alerts.push('Critical: Secrets storage is inaccessible');
    recommendations.push('Verify OS keychain/credential manager permissions');
  }
  
  // Security alerts
  if (!metrics.scopingValid) {
    alerts.push('Critical: Per-user scoping is not working');
    recommendations.push('Validate CRED_PERSIST_ENTERPRISE implementation');
  }
  
  // Encryption strength validation
  const strongEncryption = ['AES-256', 'AES-512', 'DPAPI'].includes(metrics.encryptionStrength);
  if (!strongEncryption) {
    alerts.push(`Weak encryption detected: ${metrics.encryptionStrength}`);
    recommendations.push('Upgrade to stronger encryption or use platform-specific secure storage');
  }
  
  // Calculate scores
  const performanceScore = Math.max(0, 100 - (metrics.latency > 0 ? metrics.latency : 200));
  const securityScore = (metrics.storageAvailable ? 40 : 0) + 
                       (metrics.scopingValid ? 40 : 0) + 
                       (strongEncryption ? 20 : 0);
  const reliabilityScore = metrics.storageAvailable && metrics.scopingValid ? 100 : 0;
  
  const overallScore = Math.round((performanceScore + securityScore + reliabilityScore) / 3);
  
  // Determine status
  let status: 'healthy' | 'degraded' | 'critical';
  if (overallScore >= 80 && alerts.length === 0) {
    status = 'healthy';
  } else if (overallScore >= 60) {
    status = 'degraded';
  } else {
    status = 'critical';
  }
  
  return {
    status,
    metrics,
    alerts,
    recommendations,
    summary: {
      overall: overallScore,
      performance: performanceScore,
      security: securityScore,
      reliability: reliabilityScore
    }
  };
}

/**
 * Exportable health check function
 */
export async function checkSecretsHealth(): Promise<HealthReport> {
  const platformCapabilities = detectPlatformCapabilities();
  
  const metrics: HealthMetrics = {
    latency: await measureSecretsLatency(),
    storageAvailable: await verifyStorageAccess(),
    scopingValid: await validateScopingIntegrity(),
    encryptionStrength: platformCapabilities.hasCredentialManager ? 'DPAPI' :
                       platformCapabilities.hasKeychain ? 'AES-256' :
                       platformCapabilities.hasSecretService ? 'AES-256' : 'None',
    platformCapabilities,
    timestamp: new Date().toISOString()
  };
  
  return generateHealthReport(metrics);
}

/**
 * Quick health check for monitoring systems
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  errors: string[];
}> {
  try {
    const health = await checkSecretsHealth();
    return {
      healthy: health.status === 'healthy',
      latency: health.metrics.latency,
      errors: health.alerts
    };
  } catch (error) {
    return {
      healthy: false,
      latency: -1,
      errors: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Get platform-specific health recommendations
 */
export function getPlatformRecommendations(): string[] {
  const capabilities = detectPlatformCapabilities();
  const recommendations: string[] = [];
  
  if (capabilities.platform === 'win32' && !capabilities.hasCredentialManager) {
    recommendations.push('Update Bun for Windows Credential Manager support');
  }
  
  if (capabilities.platform === 'darwin' && !capabilities.hasKeychain) {
    recommendations.push('Check macOS Keychain Access permissions');
  }
  
  if (capabilities.platform === 'linux' && !capabilities.hasSecretService) {
    recommendations.push('Install libsecret-dev: apt-get install libsecret-1-dev');
  }
  
  if (!capabilities.hasBun) {
    recommendations.push('Install Bun runtime for secrets management');
  }
  
  return recommendations;
}
