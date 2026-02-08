#!/usr/bin/env bun

/**
 * Doctor Script - Verify Bun.spawn Architecture Setup
 * Checks ripgrep installation, cache directories, and performance
 */

import { RipgrepSearcher } from '../lib/docs/ripgrep-spawn';
import { EnhancedDocsFetcher } from '../lib/docs/index-fetcher-enhanced';

// Extend the global Bun interface for proper TypeScript support
declare global {
  var Bun: {
    spawnSync: (args: string[], options?: { stdout?: string; stderr?: string }) => {
      success: boolean;
      stdout?: Uint8Array;
    };
  };
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

class Doctor {
  private checks: HealthCheck[] = [];

  private addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string, details?: any): void {
    this.checks.push({ name, status, message, details });
  }

  async checkRipgrepInstallation(): Promise<void> {
    try {
      // Use type assertion to bypass TypeScript limitations
      const proc = (globalThis as any).Bun.spawnSync(['rg', '--version'], {
        stdout: 'pipe'
      });
      
      if (proc.success && proc.stdout) {
        const version = new TextDecoder().decode(proc.stdout).trim();
        const versionLine = version.split('\n')[0];
        this.addCheck(
          'Ripgrep Installation',
          'pass',
          `Ripgrep is installed: ${versionLine}`,
          { version: versionLine }
        );
      } else {
        throw new Error('ripgrep command failed');
      }
    } catch (error) {
      this.addCheck(
        'Ripgrep Installation',
        'fail',
        'Ripgrep not found. Install with: brew install ripgrep',
        { error: error.message }
      );
    }
  }

  async checkCacheDirectory(): Promise<void> {
    const cacheDir = `${process.env.HOME}/.cache/bun-docs/requests`;
    const fs = require('fs');
    
    try {
      if (fs.existsSync(cacheDir)) {
        const stats = fs.statSync(cacheDir);
        const isWritable = fs.accessSync(cacheDir, fs.constants.W_OK) === undefined;
        
        this.addCheck(
          'Cache Directory',
          isWritable ? 'pass' : 'warn',
          `Cache directory exists: ${cacheDir}`,
          { 
            path: cacheDir, 
            writable: isWritable,
            created: stats.birthtime,
            modified: stats.mtime 
          }
        );
      } else {
        // Try to create it
        try {
          fs.mkdirSync(cacheDir, { recursive: true });
          this.addCheck(
            'Cache Directory',
            'pass',
            `Cache directory created: ${cacheDir}`,
            { path: cacheDir, created: true }
          );
        } catch (createError) {
          this.addCheck(
            'Cache Directory',
            'fail',
            `Cannot create cache directory: ${cacheDir}`,
            { error: createError.message }
          );
        }
      }
    } catch (error) {
      this.addCheck(
        'Cache Directory',
        'fail',
        `Cache directory check failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async checkBunSpawnPerformance(): Promise<void> {
    try {
      const searcher = new RipgrepSearcher();
      const startTime = performance.now();
      
      // Test search with a simple query
      const results = await searcher.search('Bun', { maxResults: 5 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration < 100) {
        this.addCheck(
          'Bun.spawn Performance',
          'pass',
          `Search completed in ${duration.toFixed(2)}ms - Excellent performance`,
          { duration, results: results.length }
        );
      } else if (duration < 500) {
        this.addCheck(
          'Bun.spawn Performance',
          'warn',
          `Search completed in ${duration.toFixed(2)}ms - Acceptable performance`,
          { duration, results: results.length }
        );
      } else {
        this.addCheck(
          'Bun.spawn Performance',
          'fail',
          `Search completed in ${duration.toFixed(2)}ms - Poor performance`,
          { duration, results: results.length }
        );
      }
    } catch (error) {
      this.addCheck(
        'Bun.spawn Performance',
        'fail',
        `Bun.spawn test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async checkParallelSearch(): Promise<void> {
    try {
      const fetcher = new EnhancedDocsFetcher();
      const startTime = performance.now();
      
      // Test parallel search
      const result = await fetcher.ghostSearch('Bun', {
        includeProjectCode: false,
        maxResults: 5
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const totalMatches = result.bunSh.length + result.bunCom.length + result.content.length;
      
      if (result.performance.parallelSpeedup > 1.5) {
        this.addCheck(
          'Parallel Search',
          'pass',
          `Parallel search working with ${result.performance.parallelSpeedup}x speedup`,
          { 
            duration, 
            speedup: result.performance.parallelSpeedup,
            totalMatches,
            shMatches: result.bunSh.length,
            comMatches: result.bunCom.length,
            contentMatches: result.content.length
          }
        );
      } else {
        this.addCheck(
          'Parallel Search',
          'warn',
          `Parallel search working but low speedup: ${result.performance.parallelSpeedup}x`,
          { 
            duration, 
            speedup: result.performance.parallelSpeedup,
            totalMatches
          }
        );
      }
    } catch (error) {
      this.addCheck(
        'Parallel Search',
        'fail',
        `Parallel search test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async checkMemoryUsage(): Promise<void> {
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    
    try {
      const searcher = new RipgrepSearcher();
      
      // Perform multiple searches to test memory growth
      await Promise.all([
        searcher.search('Bun', { maxResults: 5 }),
        searcher.search('fetch', { maxResults: 5 }),
        searcher.search('SQLite', { maxResults: 5 })
      ]);
      
      const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryGrowth = memoryAfter - memoryBefore;
      
      if (memoryGrowth < 10) {
        this.addCheck(
          'Memory Usage',
          'pass',
          `Memory growth: ${memoryGrowth.toFixed(2)}MB - Efficient`,
          { before: memoryBefore, after: memoryAfter, growth: memoryGrowth }
        );
      } else if (memoryGrowth < 50) {
        this.addCheck(
          'Memory Usage',
          'warn',
          `Memory growth: ${memoryGrowth.toFixed(2)}MB - Acceptable`,
          { before: memoryBefore, after: memoryAfter, growth: memoryGrowth }
        );
      } else {
        this.addCheck(
          'Memory Usage',
          'fail',
          `Memory growth: ${memoryGrowth.toFixed(2)}MB - High usage`,
          { before: memoryBefore, after: memoryAfter, growth: memoryGrowth }
        );
      }
    } catch (error) {
      this.addCheck(
        'Memory Usage',
        'fail',
        `Memory test failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  async checkEnvironmentVariables(): Promise<void> {
    const requiredVars = ['HOME'];
    const optionalVars = ['BUN_DOCS_CACHE_TTL', 'BUN_DOCS_OFFLINE_MODE'];
    
    const missingRequired = requiredVars.filter(varName => !process.env[varName]);
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    
    if (missingRequired.length === 0) {
      this.addCheck(
        'Environment Variables',
        'pass',
        'Required environment variables set',
        { 
          required: requiredVars.map(v => `${v}: ${process.env[v] ? '✅' : '❌'}`).join(', '),
          optional: optionalVars.map(v => `${v}: ${process.env[v] ? '✅' : '⚪'}`).join(', ')
        }
      );
    } else {
      this.addCheck(
        'Environment Variables',
        'fail',
        `Missing required variables: ${missingRequired.join(', ')}`,
        { missing: missingRequired }
      );
    }
  }

  printReport(): void {
    console.log('🩺 Bun.spawn Architecture Health Check');
    console.log('=====================================\n');
    
    const passed = this.checks.filter(c => c.status === 'pass').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;
    const warnings = this.checks.filter(c => c.status === 'warn').length;
    
    // Print individual checks
    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.message}`);
      
      if (check.details && (check.status === 'fail' || process.argv.includes('--verbose'))) {
        console.log(`   Details:`, check.details);
      }
      console.log('');
    });
    
    // Summary
    console.log('📊 Summary');
    console.log('=========');
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical checks passed! Your Bun.spawn architecture is ready.');
    } else {
      console.log('\n⚠️ Some checks failed. Please address the issues above.');
    }
    
    if (warnings > 0) {
      console.log('\n💡 Consider addressing the warnings for optimal performance.');
    }
  }

  async run(): Promise<void> {
    await this.checkRipgrepInstallation();
    await this.checkCacheDirectory();
    await this.checkEnvironmentVariables();
    await this.checkBunSpawnPerformance();
    await this.checkParallelSearch();
    await this.checkMemoryUsage();
    
    this.printReport();
  }
}

// Run doctor if this script is executed directly
if (import.meta.main) {
  const doctor = new Doctor();
  await doctor.run();
}

export { Doctor };
