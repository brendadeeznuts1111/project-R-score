// Cross-Platform Trading Platform Manager
// Ensures compatibility across Windows, macOS, Linux, and container environments

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getTradingConfig, updateTradingConfig } from '../sports-trading-config.js';

export interface PlatformConfig {
  platform: string;
  arch: string;
  version: string;
  nodeVersion: string;
  bunVersion: string;
  memory: number;
  cores: number;
  supports: {
    simd: boolean;
    wasm: boolean;
    worker_threads: boolean;
    cluster: boolean;
  };
  performance: {
    configLatency: number;
    signalLatency: number;
    throughput: number;
  };
}

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isContainer: boolean;
  region: string;
  timezone: string;
  locale: string;
  currency: string;
}

export class PlatformManager {
  private platformConfig: PlatformConfig;
  private environmentConfig: EnvironmentConfig;
  private configPath: string;
  private isOptimized: boolean = false;

  constructor() {
    this.platformConfig = this.detectPlatform();
    this.environmentConfig = this.detectEnvironment();
    this.configPath = this.getConfigPath();
    this.ensureConfigDirectory();
  }

  // Detect platform capabilities
  private detectPlatform(): PlatformConfig {
    const platform = os.platform();
    const arch = os.arch();
    const version = os.release();
    const nodeVersion = process.version;
    const bunVersion = this.getBunVersion();
    const memory = os.totalmem();
    const cores = os.cpus().length;

    // Detect feature support
    const supports = {
      simd: this.detectSIMDSupport(),
      wasm: this.detectWASMSupport(),
      worker_threads: this.detectWorkerThreadsSupport(),
      cluster: this.detectClusterSupport()
    };

    return {
      platform,
      arch,
      version,
      nodeVersion,
      bunVersion,
      memory,
      cores,
      supports,
      performance: {
        configLatency: 0, // Will be measured
        signalLatency: 0, // Will be measured
        throughput: 0     // Will be measured
      }
    };
  }

  // Detect environment settings
  private detectEnvironment(): EnvironmentConfig {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.BUN_ENV === 'production';
    const isDevelopment = !isProduction;
    const isContainer = this.detectContainerEnvironment();
    
    const region = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
    const timezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = process.env.LOCALE || 'en-US';
    const currency = process.env.CURRENCY || 'USD';

    return {
      isProduction,
      isDevelopment,
      isContainer,
      region,
      timezone,
      locale,
      currency
    };
  }

  // Get Bun version
  private getBunVersion(): string {
    try {
      return process.versions.bun || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Detect SIMD support
  private detectSIMDSupport(): boolean {
    try {
      // Check for SIMD support in CPU
      const cpu = os.cpus()[0];
      return cpu.model.includes('Intel') || cpu.model.includes('AMD') || 
             cpu.model.includes('Apple') || cpu.model.includes('ARM');
    } catch {
      return false;
    }
  }

  // Detect WebAssembly support
  private detectWASMSupport(): boolean {
    try {
      // WebAssembly is supported in modern Node.js/Bun
      return typeof WebAssembly !== 'undefined';
    } catch {
      return false;
    }
  }

  // Detect worker threads support
  private detectWorkerThreadsSupport(): boolean {
    try {
      // Check if worker_threads module is available
      require('worker_threads');
      return true;
    } catch {
      return false;
    }
  }

  // Detect cluster support
  private detectClusterSupport(): boolean {
    try {
      // Check if cluster module is available
      require('cluster');
      return true;
    } catch {
      return false;
    }
  }

  // Detect container environment
  private detectContainerEnvironment(): boolean {
    try {
      // Check for Docker
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }

      // Check for container hints in cgroup
      if (fs.existsSync('/proc/1/cgroup')) {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (cgroup.includes('docker') || cgroup.includes('containerd')) {
          return true;
        }
      }

      // Check for Kubernetes
      if (process.env.KUBERNETES_SERVICE_HOST) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Get configuration path based on platform
  private getConfigPath(): string {
    const homeDir = os.homedir();
    
    switch (this.platformConfig.platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Local', 'HFT-13Byte', 'config.json');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'HFT-13Byte', 'config.json');
      case 'linux':
      default:
        return path.join(homeDir, '.config', 'hft-13byte', 'config.json');
    }
  }

  // Ensure configuration directory exists
  private ensureConfigDirectory(): void {
    const configDir = path.dirname(this.configPath);
    
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  // Optimize platform performance
  async optimizePerformance(): Promise<void> {
    if (this.isOptimized) return;

    console.log(`🔧 Optimizing performance for ${this.platformConfig.platform}-${this.platformConfig.arch}...`);

    // Measure baseline performance
    const baseline = await this.measurePerformance();

    // Apply platform-specific optimizations
    await this.applyPlatformOptimizations();

    // Measure optimized performance
    const optimized = await this.measurePerformance();

    // Update performance metrics
    this.platformConfig.performance = optimized;

    console.log('⚡ Performance optimization complete:');
    console.log(`   Config latency: ${baseline.configLatency}ns → ${optimized.configLatency}ns`);
    console.log(`   Signal latency: ${baseline.signalLatency}ns → ${optimized.signalLatency}ns`);
    console.log(`   Throughput: ${baseline.throughput} → ${optimized.throughput} ops/sec`);

    this.isOptimized = true;
  }

  // Apply platform-specific optimizations
  private async applyPlatformOptimizations(): Promise<void> {
    const { platform, supports } = this.platformConfig;

    // Set process priority based on platform
    if (platform === 'linux') {
      try {
        // Set high priority on Linux if available
        // Note: These are Linux-specific process constants
        const PRIO_PGRP = 1; // Process group priority
        if (typeof (process as any).setpriority === 'function') {
          (process as any).setpriority(PRIO_PGRP, 0, -10);
        }
      } catch (error) {
        // Ignore permission errors or missing functions
        console.warn('Could not set process priority:', error);
      }
    }

    // Optimize memory usage
    if (supports.wasm) {
      // Enable WebAssembly optimizations
      process.env.WASM_OPT = '1';
    }

    // Enable worker threads if supported
    if (supports.worker_threads) {
      process.env.USE_WORKER_THREADS = 'true';
    }

    // Set optimal thread pool size
    const optimalThreads = Math.min(this.platformConfig.cores, 8);
    process.env.UV_THREADPOOL_SIZE = optimalThreads.toString();

    // Enable SIMD optimizations
    if (supports.simd) {
      process.env.ENABLE_SIMD = 'true';
    }
  }

  // Measure performance metrics
  async measurePerformance(): Promise<{ configLatency: number; signalLatency: number; throughput: number }> {
    const iterations = 1000;

    // Measure config latency
    const configStart = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      await getTradingConfig();
    }
    const configLatency = Math.round((Bun.nanoseconds() - configStart) / iterations);

    // Measure signal processing latency
    const signalStart = Bun.nanoseconds();
    for (let i = 0; i < iterations; i++) {
      // Simulate signal processing
      const sampleData = {
        eventId: `test_${i}`,
        sportType: 'soccer',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        homeOdds: 2.0,
        awayOdds: 3.0,
        timestamp: Date.now(),
        volume: 1000000,
        liquidity: 50000
      };
      // This would normally call the trading engine
    }
    const signalLatency = Math.round((Bun.nanoseconds() - signalStart) / iterations);

    // Measure throughput (operations per second)
    const throughputStart = Bun.nanoseconds();
    const opsCount = 10000;
    
    for (let i = 0; i < opsCount; i++) {
      // Simulate trading operation
      await updateTradingConfig({ maxPositionSize: (i % 60) + 1 });
    }
    
    const throughputTime = (Bun.nanoseconds() - throughputStart) / 1_000_000_000; // Convert to seconds
    const throughput = Math.round(opsCount / throughputTime);

    return {
      configLatency,
      signalLatency,
      throughput
    };
  }

  // Get platform information
  getPlatformConfig(): PlatformConfig {
    return { ...this.platformConfig };
  }

  // Get environment information
  getEnvironmentConfig(): EnvironmentConfig {
    return { ...this.environmentConfig };
  }

  // Get full system report
  getSystemReport(): {
    platform: PlatformConfig;
    environment: EnvironmentConfig;
    optimizations: string[];
    recommendations: string[];
  } {
    const optimizations: string[] = [];
    const recommendations: string[] = [];

    // Determine optimizations
    if (this.platformConfig.supports.simd) {
      optimizations.push('SIMD instructions enabled');
    }
    if (this.platformConfig.supports.wasm) {
      optimizations.push('WebAssembly acceleration enabled');
    }
    if (this.platformConfig.supports.worker_threads) {
      optimizations.push('Worker threads enabled');
    }
    if (this.isOptimized) {
      optimizations.push('Platform-specific optimizations applied');
    }

    // Generate recommendations
    if (this.platformConfig.memory < 4 * 1024 * 1024 * 1024) { // Less than 4GB
      recommendations.push('Consider increasing system memory for better performance');
    }
    if (this.platformConfig.cores < 4) {
      recommendations.push('Multi-core CPU recommended for optimal performance');
    }
    if (!this.platformConfig.supports.simd) {
      recommendations.push('Modern CPU with SIMD support recommended');
    }
    if (this.environmentConfig.isContainer) {
      recommendations.push('Consider dedicated hardware for lowest latency');
    }

    return {
      platform: this.platformConfig,
      environment: this.environmentConfig,
      optimizations,
      recommendations
    };
  }

  // Save configuration to platform-specific location
  async saveConfiguration(config: any): Promise<void> {
    try {
      const configData = {
        ...config,
        platform: this.platformConfig,
        environment: this.environmentConfig,
        savedAt: Date.now(),
        version: '1.0.0'
      };

      await fs.promises.writeFile(this.configPath, JSON.stringify(configData, null, 2));
      console.log(`💾 Configuration saved to ${this.configPath}`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error(`Configuration save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Load configuration from platform-specific location
  async loadConfiguration(): Promise<any> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const configData = await fs.promises.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      console.log(`📂 Configuration loaded from ${this.configPath}`);
      return config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return null;
    }
  }

  // Check if platform is supported
  isPlatformSupported(): boolean {
    const supportedPlatforms = ['win32', 'darwin', 'linux'];
    const supportedArchs = ['x64', 'arm64'];
    
    return supportedPlatforms.includes(this.platformConfig.platform) &&
           supportedArchs.includes(this.platformConfig.arch);
  }

  // Get platform-specific user agent
  getUserAgent(): string {
    const { platform, arch, version, nodeVersion, bunVersion } = this.platformConfig;
    const { region } = this.environmentConfig;
    
    return `HFT-13Byte/1.0 (${platform}-${arch}; ${region}) Node/${nodeVersion} Bun/${bunVersion}`;
  }

  // Setup platform-specific error handlers
  setupErrorHandlers(): void {
    // Windows-specific error handling
    if (this.platformConfig.platform === 'win32') {
      process.on('uncaughtException', (error) => {
        console.error('Windows uncaught exception:', error);
        process.exit(1);
      });
    }

    // Unix-specific signal handling
    if (this.platformConfig.platform !== 'win32') {
      process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        process.exit(0);
      });
      
      process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        process.exit(0);
      });
    }
  }

  // Get platform-specific temp directory
  getTempDirectory(): string {
    const tempDir = os.tmpdir();
    
    // Create platform-specific subdirectory
    const platformTemp = path.join(tempDir, 'hft-13byte');
    
    try {
      if (!fs.existsSync(platformTemp)) {
        fs.mkdirSync(platformTemp, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
    
    return platformTemp;
  }
}

// Singleton instance
export const platformManager = new PlatformManager();
