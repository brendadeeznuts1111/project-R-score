// src/utils/toml-integrity.ts
// TOML configuration integrity and performance utilities using Bun v1.3.6 features

import { readFileSync, writeFileSync, existsSync } from "fs";
import hash from "bun:sqlite";
import { Database } from "bun:sqlite";

// Configuration integrity interface
interface ConfigIntegrity {
  path: string;
  hash: string;
  size: number;
  lastModified: Date;
  isValid: boolean;
  checksum?: string;
}

// Performance metrics interface
interface PerformanceMetrics {
  loadTime: number;
  parseTime: number;
  validationTime: number;
  totalTime: number;
  memoryUsage: number;
}

// Integrity check result
interface IntegrityCheckResult {
  file: string;
  expectedHash: string;
  actualHash: string;
  isValid: boolean;
  size: number;
  checkTime: number;
}

// Cache for performance optimization
const integrityCache = new Map<string, ConfigIntegrity>();
const performanceCache = new Map<string, PerformanceMetrics>();

/**
 * Fast CRC32 hash calculation using Bun v1.3.6 hardware acceleration
 */
export function calculateConfigHash(filePath: string): string {
  try {
    const data = readFileSync(filePath);
    const hash = Bun.hash.crc32(data);
    return hash.toString(16);
  } catch (error) {
    throw new Error(`Failed to calculate hash for ${filePath}: ${error}`);
  }
}

/**
 * Verify TOML configuration file integrity
 */
export function verifyConfigIntegrity(filePath: string, expectedHash: string): IntegrityCheckResult {
  const startTime = performance.now();
  
  try {
    if (!existsSync(filePath)) {
      return {
        file: filePath,
        expectedHash,
        actualHash: "",
        isValid: false,
        size: 0,
        checkTime: performance.now() - startTime
      };
    }
    
    const data = readFileSync(filePath);
    const actualHash = Bun.hash.crc32(data).toString(16);
    const isValid = actualHash === expectedHash;
    
    return {
      file: filePath,
      expectedHash,
      actualHash,
      isValid,
      size: data.length,
      checkTime: performance.now() - startTime
    };
  } catch (error) {
    return {
      file: filePath,
      expectedHash,
      actualHash: "",
      isValid: false,
      size: 0,
      checkTime: performance.now() - startTime
    };
  }
}

/**
 * Batch integrity check for multiple configuration files
 */
export async function batchVerifyIntegrity(
  configFiles: Array<{ path: string; expectedHash: string }>
): Promise<IntegrityCheckResult[]> {
  const startTime = performance.now();
  
  const results = await Promise.all(
    configFiles.map(({ path, expectedHash }) => 
      Promise.resolve(verifyConfigIntegrity(path, expectedHash))
    )
  );
  
  const totalTime = performance.now() - startTime;
  const validCount = results.filter(r => r.isValid).length;
  
  console.log(`Verified ${results.length} files in ${totalTime.toFixed(2)}ms`);
  console.log(`Valid: ${validCount}/${results.length}`);
  
  return results;
}

/**
 * Generate integrity manifest for configuration files
 */
export function generateIntegrityManifest(configDir: string): Record<string, string> {
  const manifest: Record<string, string> = {};
  
  try {
    const files = [
      "config.toml",
      "config.development.toml", 
      "config.production.toml",
      "config.testing.toml",
      "bunfig.toml"
    ];
    
    for (const file of files) {
      const filePath = `${configDir}/${file}`;
      if (existsSync(filePath)) {
        const hash = calculateConfigHash(filePath);
        manifest[file] = hash;
        console.log(`${file}: ${hash}`);
      }
    }
    
    // Save manifest
    const manifestPath = `${configDir}/integrity.json`;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Integrity manifest saved to ${manifestPath}`);
    
  } catch (error) {
    console.error(`Failed to generate integrity manifest: ${error}`);
  }
  
  return manifest;
}

/**
 * Load and validate TOML configuration with performance tracking
 */
export async function loadAndValidateConfig<T = any>(
  filePath: string,
  validator?: (config: T) => boolean
): Promise<{ config: T; metrics: PerformanceMetrics; integrity: ConfigIntegrity }> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  try {
    // Load phase
    const loadStart = performance.now();
    const { default: config } = await import(filePath, { with: { type: "toml" } });
    const loadTime = performance.now() - loadStart;
    
    // Parse phase (TOML is already parsed by import)
    const parseStart = performance.now();
    const parseTime = performance.now() - parseStart;
    
    // Validation phase
    const validationStart = performance.now();
    let isValid = true;
    
    if (validator) {
      isValid = validator(config);
    } else {
      // Basic validation
      isValid = config && typeof config === 'object' && config.app?.name;
    }
    
    const validationTime = performance.now() - validationStart;
    
    // Integrity check
    const integrity: ConfigIntegrity = {
      path: filePath,
      hash: calculateConfigHash(filePath),
      size: existsSync(filePath) ? readFileSync(filePath).length : 0,
      lastModified: new Date(),
      isValid
    };
    
    const endMemory = process.memoryUsage().heapUsed;
    const totalTime = performance.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      loadTime,
      parseTime,
      validationTime,
      totalTime,
      memoryUsage: endMemory - startMemory
    };
    
    // Cache results
    performanceCache.set(filePath, metrics);
    integrityCache.set(filePath, integrity);
    
    return { config, metrics, integrity };
    
  } catch (error) {
    const totalTime = performance.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      loadTime: 0,
      parseTime: 0,
      validationTime: 0,
      totalTime,
      memoryUsage: process.memoryUsage().heapUsed - startMemory
    };
    
    const integrity: ConfigIntegrity = {
      path: filePath,
      hash: "",
      size: 0,
      lastModified: new Date(),
      isValid: false
    };
    
    throw new Error(`Failed to load config ${filePath}: ${error}`);
  }
}

/**
 * Performance benchmark for configuration operations
 */
export async function benchmarkConfigOperations(
  filePath: string,
  iterations: number = 100
): Promise<{
  averageLoadTime: number;
  averageHashTime: number;
  totalOperations: number;
  totalTime: number;
  throughput: number;
}> {
  console.log(`Benchmarking ${iterations} operations on ${filePath}...`);
  
  const hashTimes: number[] = [];
  const loadTimes: number[] = [];
  
  // Benchmark hash calculation
  for (let i = 0; i < iterations; i++) {
    const hashStart = performance.now();
    calculateConfigHash(filePath);
    const hashTime = performance.now() - hashStart;
    hashTimes.push(hashTime);
  }
  
  // Benchmark config loading
  for (let i = 0; i < Math.min(iterations, 10); i++) {
    const loadStart = performance.now();
    await import(filePath, { with: { type: "toml" } });
    const loadTime = performance.now() - loadStart;
    loadTimes.push(loadTime);
  }
  
  const averageHashTime = hashTimes.reduce((a, b) => a + b, 0) / hashTimes.length;
  const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
  const totalTime = hashTimes.reduce((a, b) => a + b, 0) + loadTimes.reduce((a, b) => a + b, 0);
  const totalOperations = hashTimes.length + loadTimes.length;
  const throughput = totalOperations / (totalTime / 1000); // operations per second
  
  const results = {
    averageHashTime,
    averageLoadTime,
    totalOperations,
    totalTime,
    throughput
  };
  
  console.log(`Benchmark Results:`);
  console.log(`  Average hash time: ${averageHashTime.toFixed(3)}ms`);
  console.log(`  Average load time: ${averageLoadTime.toFixed(3)}ms`);
  console.log(`  Total operations: ${totalOperations}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${throughput.toFixed(2)} ops/sec`);
  
  return results;
}

/**
 * Monitor configuration file changes and auto-validate
 */
export class ConfigMonitor {
  private watchers = new Map<string, { hash: string; callback: (result: IntegrityCheckResult) => void }>();
  private interval: NodeJS.Timeout | null = null;
  
  constructor(private checkInterval: number = 5000) {}
  
  /**
   * Start monitoring a configuration file
   */
  watch(filePath: string, callback: (result: IntegrityCheckResult) => void): void {
    const initialHash = calculateConfigHash(filePath);
    this.watchers.set(filePath, { hash: initialHash, callback });
    
    console.log(`Started monitoring ${filePath} (hash: ${initialHash})`);
  }
  
  /**
   * Stop monitoring a configuration file
   */
  unwatch(filePath: string): void {
    this.watchers.delete(filePath);
    console.log(`Stopped monitoring ${filePath}`);
  }
  
  /**
   * Start the monitoring process
   */
  start(): void {
    if (this.interval) return;
    
    this.interval = setInterval(() => {
      this.checkAllFiles();
    }, this.checkInterval);
    
    console.log(`Config monitor started (interval: ${this.checkInterval}ms)`);
  }
  
  /**
   * Stop the monitoring process
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("Config monitor stopped");
    }
  }
  
  private async checkAllFiles(): Promise<void> {
    for (const [filePath, { hash: expectedHash, callback }] of this.watchers) {
      try {
        const result = verifyConfigIntegrity(filePath, expectedHash);
        
        if (!result.isValid) {
          console.warn(`Configuration file changed: ${filePath}`);
          console.warn(`Expected: ${expectedHash}, Actual: ${result.actualHash}`);
          callback(result);
          
          // Update the expected hash
          this.watchers.set(filePath, { hash: result.actualHash, callback });
        }
      } catch (error) {
        console.error(`Error checking ${filePath}: ${error}`);
      }
    }
  }
}

/**
 * Configuration cache manager with integrity checking
 */
export class ConfigCache<T = any> {
  private cache = new Map<string, { config: T; integrity: ConfigIntegrity; timestamp: number }>();
  private ttl: number;
  
  constructor(ttl: number = 300000) { // 5 minutes default TTL
    this.ttl = ttl;
  }
  
  /**
   * Get configuration from cache or load it
   */
  async get(filePath: string): Promise<T> {
    const cached = this.cache.get(filePath);
    const now = Date.now();
    
    // Check if cache is valid
    if (cached && (now - cached.timestamp) < this.ttl) {
      // Verify integrity
      const currentHash = calculateConfigHash(filePath);
      if (currentHash === cached.integrity.hash) {
        return cached.config;
      }
      
      // Cache is stale, remove it
      this.cache.delete(filePath);
    }
    
    // Load fresh configuration
    const { config, integrity } = await loadAndValidateConfig<T>(filePath);
    
    // Cache it
    this.cache.set(filePath, {
      config,
      integrity,
      timestamp: now
    });
    
    return config;
  }
  
  /**
   * Clear cache for specific file or all files
   */
  clear(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[]; memoryUsage: number } {
    const keys = Array.from(this.cache.keys());
    return {
      size: this.cache.size,
      keys,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

/**
 * Utility to create configuration integrity reports
 */
export function createIntegrityReport(results: IntegrityCheckResult[]): string {
  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const totalTime = results.reduce((sum, r) => sum + r.checkTime, 0);
  
  let report = `# Configuration Integrity Report\n\n`;
  report += `## Summary\n`;
  report += `- Total files: ${results.length}\n`;
  report += `- Valid files: ${validCount}\n`;
  report += `- Invalid files: ${invalidCount}\n`;
  report += `- Total size: ${(totalSize / 1024).toFixed(2)} KB\n`;
  report += `- Check time: ${totalTime.toFixed(2)}ms\n\n`;
  
  if (invalidCount > 0) {
    report += `## Invalid Files\n`;
    results.filter(r => !r.isValid).forEach(result => {
      report += `- **${result.file}**\n`;
      report += `  - Expected: ${result.expectedHash}\n`;
      report += `  - Actual: ${result.actualHash}\n`;
      report += `  - Size: ${result.size} bytes\n\n`;
    });
  }
  
  report += `## All Files\n`;
  results.forEach(result => {
    const status = result.isValid ? "✅" : "❌";
    report += `${status} ${result.file} (${result.size} bytes, ${result.checkTime.toFixed(2)}ms)\n`;
  });
  
  return report;
}

// Export singleton instances
export const configMonitor = new ConfigMonitor();
export const configCache = new ConfigCache();
