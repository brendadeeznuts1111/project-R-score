/**
 * 🔧 Enhanced Runtime Information System
 * Provides comprehensive runtime details for Bun v1.01.04-alpha features
 *
 * Features:
 * - Runtime configuration display
 * - Process arguments parsing
 * - User agent detection
 * - Performance metrics
 * - Standalone vs development mode detection
 */

import { userAgentManager } from './enhanced-user-agent-manager';

// Runtime configuration interface
export interface RuntimeConfiguration {
  // Basic info
  version: string;
  bunVersion: string;
  nodeVersion?: string;
  platform: string;
  arch: string;

  // Process info
  execArgv: string[];
  pid: number;
  ppid: number;
  uptime: number;

  // Bun-specific flags
  userAgent?: string;
  isSmol: boolean;
  isInspect: boolean;
  inspectHost?: string;
  inspectPort?: number;

  // Mode detection
  isStandalone: boolean;
  isDevelopment: boolean;
  isHMREnabled: boolean;

  // Memory info
  memory: NodeJS.MemoryUsage;

  // Build info
  buildDate?: string;
  buildTarget?: string;

  // Environment
  nodeEnv: string;
  environment: 'development' | 'production' | 'test' | 'staging';
}

// Performance metrics
export interface RuntimePerformanceMetrics {
  // Process metrics
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  loadAverage?: number[];

  // Runtime metrics
  eventLoopDelay?: number;
  v8HeapStats?: any;

  // Custom metrics
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;

  // Timestamps
  lastUpdated: Date;
  startTime: Date;
}

// Capabilities interface
export interface RuntimeCapabilities {
  features: string[];
  apis: string[];
  flags: string[];
  environment: Record<string, any>;
}

/**
 * Enhanced Runtime Information Manager
 */
export class EnhancedRuntimeInfo {
  private startTime: Date;
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Get comprehensive runtime configuration
   */
  getConfiguration(): RuntimeConfiguration {
    const execArgv = process.execArgv || [];

    // Parse exec arguments
    const userAgentArg = execArgv.find(arg => arg.startsWith('--user-agent='));
    const inspectArg = execArgv.find(arg => arg.startsWith('--inspect'));

    let inspectHost: string | undefined;
    let inspectPort: number | undefined;

    if (inspectArg) {
      if (inspectArg.includes('=')) {
        const inspectValue = inspectArg.split('=')[1];
        if (inspectValue.includes(':')) {
          const parts = inspectValue.split(':');
          inspectHost = parts[0];
          inspectPort = parseInt(parts[1], 10);
        } else {
          inspectPort = parseInt(inspectValue, 10);
        }
      }
    }

    // Detect mode
    const isStandalone = this.isStandaloneMode();
    const isDevelopment = process.env.NODE_ENV === 'development' || !isStandalone;
    const isHMREnabled = isDevelopment && this.checkHMRAvailability();

    return {
      // Basic info
      version: process.env.npm_package_version || '2.1.0',
      bunVersion: Bun.version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,

      // Process info
      execArgv,
      pid: process.pid,
      ppid: process.ppid || 0,
      uptime: process.uptime(),

      // Bun-specific flags
      userAgent: userAgentArg?.split('=')[1],
      isSmol: execArgv.includes('--smol'),
      isInspect: !!inspectArg,
      inspectHost,
      inspectPort,

      // Mode detection
      isStandalone,
      isDevelopment,
      isHMREnabled,

      // Memory info
      memory: process.memoryUsage(),

      // Environment
      nodeEnv: process.env.NODE_ENV || 'development',
      environment: this.detectEnvironment(),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): RuntimePerformanceMetrics {
    const uptime = process.uptime();
    const requestsPerSecond = this.requestCount / uptime;
    const averageResponseTime =
      this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0;

    return {
      // Process metrics
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime,
      loadAverage: this.getLoadAverage(),

      // Custom metrics
      requestsPerSecond,
      averageResponseTime,
      errorRate,
      cacheHitRate,

      // Timestamps
      lastUpdated: new Date(),
      startTime: this.startTime,
    };
  }

  /**
   * Get load average safely across platforms
   */
  private getLoadAverage(): number[] | undefined {
    try {
      // Check if loadavg method exists and is callable
      if (typeof (process as any).loadavg === 'function') {
        return (process as any).loadavg();
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check HMR availability safely
   */
  private checkHMRAvailability(): boolean {
    try {
      // Check if import.meta is available and has hot property
      return (
        typeof (globalThis as any).import !== 'undefined' &&
        (globalThis as any).import?.meta?.hot !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Get runtime capabilities and features
   */
  getCapabilities(): RuntimeCapabilities {
    const config = this.getConfiguration();

    const features: string[] = [];
    const apis: string[] = [];

    // Detect Bun features
    if (typeof Bun !== 'undefined') {
      features.push('Bun Runtime');

      // Add available Bun APIs
      apis.push('Bun.file()');
      apis.push('Bun.$ (shell)');
      apis.push('Bun.serve()');
      apis.push('Bun.build()');

      // Add optional Bun APIs if they exist
      if ((Bun as any).nanoseconds) apis.push('Bun.nanoseconds()');
      if ((Bun as any).stripANSI) apis.push('Bun.stripANSI()');
      if ((Bun as any).spawn) apis.push('Bun.spawn()');
    }

    // Detect HMR
    if (config.isHMREnabled) {
      features.push('Hot Module Replacement');
      apis.push('import.meta.hot');
    }

    // Detect WebSocket
    if (typeof WebSocket !== 'undefined') {
      features.push('WebSocket Support');
      apis.push('WebSocket API');
    }

    // Detect database APIs - check for Bun's SQLite
    if (
      typeof (globalThis as any).Database !== 'undefined' ||
      typeof (globalThis as any).sqlite !== 'undefined'
    ) {
      features.push('SQLite Integration');
      apis.push('bun:sqlite');
    }

    // User agent features
    if (config.userAgent) {
      features.push('Custom User Agent');
    }

    return {
      features,
      apis,
      flags: config.execArgv,
      environment: {
        bun: Bun.version,
        platform: config.platform,
        arch: config.arch,
        standalone: config.isStandalone,
        development: config.isDevelopment,
      },
    };
  }

  /**
   * Generate comprehensive runtime report
   */
  generateReport(): {
    configuration: RuntimeConfiguration;
    performance: RuntimePerformanceMetrics;
    capabilities: RuntimeCapabilities;
    userAgent: ReturnType<typeof userAgentManager.generateReport>;
    diagnostics: {
      health: 'healthy' | 'warning' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  } {
    const configuration = this.getConfiguration();
    const performance = this.getPerformanceMetrics();
    const capabilities = this.getCapabilities();
    const userAgent = userAgentManager.generateReport();

    // Health diagnostics
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Memory check
    const memoryUsageMB = performance.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 512) {
      issues.push('High memory usage detected');
      recommendations.push('Consider implementing memory optimization');
    }

    // Error rate check
    if (performance.errorRate > 0.05) {
      issues.push('High error rate detected');
      recommendations.push('Review error logs and implement fixes');
    }

    // Cache performance check
    if (performance.cacheHitRate < 0.8 && this.cacheHits + this.cacheMisses > 100) {
      issues.push('Low cache hit rate');
      recommendations.push('Optimize caching strategy');
    }

    // Development mode in production check
    if (configuration.environment === 'production' && configuration.isDevelopment) {
      issues.push('Development mode detected in production');
      recommendations.push('Build standalone executable for production');
    }

    const health = issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'critical';

    return {
      configuration,
      performance,
      capabilities,
      userAgent,
      diagnostics: {
        health,
        issues,
        recommendations,
      },
    };
  }

  /**
   * Track request metrics
   */
  trackRequest(responseTime: number, isError = false): void {
    this.requestCount++;
    this.totalResponseTime += responseTime;

    if (isError) {
      this.errorCount++;
    }
  }

  /**
   * Track cache metrics
   */
  trackCache(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.startTime = new Date();
  }

  /**
   * Detect if running as standalone executable
   */
  private isStandaloneMode(): boolean {
    // Check if running from compiled executable
    const isExecutable =
      process.argv[0].endsWith('.exe') || process.argv[0].includes('water-dashboard');

    // Check if package.json is accessible (not available in standalone)
    try {
      require.resolve('./package.json');
      return false;
    } catch {
      return isExecutable;
    }
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): 'development' | 'production' | 'test' | 'staging' {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();

    if (nodeEnv === 'test') return 'test';
    if (nodeEnv === 'staging') return 'staging';
    if (nodeEnv === 'production') return 'production';

    // Default to development if not specified or if HMR is available
    return 'development';
  }

  /**
   * Format runtime info for display
   */
  formatForDisplay(): {
    summary: string;
    details: Array<{ label: string; value: string; status?: 'success' | 'warning' | 'error' }>;
  } {
    const config = this.getConfiguration();
    const performance = this.getPerformanceMetrics();
    const capabilities = this.getCapabilities();

    const summary = `${config.isStandalone ? 'Standalone' : 'Development'} mode on ${config.platform} with Bun ${config.bunVersion}`;

    const details: Array<{
      label: string;
      value: string;
      status?: 'success' | 'warning' | 'error';
    }> = [
      { label: 'Version', value: config.version },
      { label: 'Bun Version', value: config.bunVersion },
      { label: 'Platform', value: `${config.platform}/${config.arch}` },
      { label: 'Mode', value: config.isStandalone ? 'Standalone' : 'Development' },
      { label: 'PID', value: config.pid.toString() },
      { label: 'Uptime', value: `${Math.floor(performance.uptime)}s` },
      {
        label: 'Memory',
        value: `${Math.round(performance.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        status: performance.memoryUsage.heapUsed > 512 * 1024 * 1024 ? 'warning' : 'success',
      },
      { label: 'User Agent', value: config.userAgent || 'Default' },
      { label: 'Features', value: capabilities.features.length.toString() },
      {
        label: 'Error Rate',
        value: `${(performance.errorRate * 100).toFixed(2)}%`,
        status: performance.errorRate > 0.05 ? 'error' : 'success',
      },
    ];

    return { summary, details };
  }
}

// Global instance
export const runtimeInfo = new EnhancedRuntimeInfo();

// Helper functions
export function getRuntimeConfiguration() {
  return runtimeInfo.getConfiguration();
}

export function getPerformanceMetrics() {
  return runtimeInfo.getPerformanceMetrics();
}

export function generateRuntimeReport() {
  return runtimeInfo.generateReport();
}

export default runtimeInfo;
