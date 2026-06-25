#!/usr/bin/env bun

/**
 * Fire22 Dashboard Performance Monitor
 *
 * This script monitors performance metrics using Bun's native file I/O
 * and provides real-time performance analytics for the dashboard.
 */

interface PerformanceMetrics {
  fileOperations: {
    packageJson: number;
    configFiles: number;
    totalFiles: number;
    averageTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    load: number;
    uptime: number;
  };
  bun: {
    version: string;
    platform: string;
    arch: string;
  };
}

interface FileOperationResult {
  file: string;
  size: number;
  readTime: number;
  parseTime: number;
  totalTime: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private fileResults: FileOperationResult[] = [];

  constructor() {
    this.metrics = {
      fileOperations: { packageJson: 0, configFiles: 0, totalFiles: 0, averageTime: 0 },
      memory: { used: 0, total: 0, percentage: 0 },
      cpu: { load: 0, uptime: 0 },
      bun: { version: '', platform: '', arch: '' },
    };
  }

  /**
   * Monitor file I/O performance using Bun.file()
   */
  async monitorFileOperations(): Promise<FileOperationResult[]> {
    console.info('📊 Monitoring File I/O Performance...\n');

    const filesToTest = ['package.json', 'bun.config.ts', '.env.example', 'tsconfig.json'];

    for (const file of filesToTest) {
      const result = await this.testFileOperation(file);
      this.fileResults.push(result);

      // Display result immediately
      this.displayFileResult(result);
    }

    // Calculate aggregate metrics
    this.calculateFileMetrics();

    return this.fileResults;
  }

  /**
   * Test a single file operation
   */
  private async testFileOperation(filePath: string): Promise<FileOperationResult> {
    const startTime = performance.now();
    let readTime = 0;
    let parseTime = 0;
    let success = false;
    let error: string | undefined;
    let size = 0;

    try {
      // Test file existence first
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        throw new Error('File not found');
      }

      // Test reading
      const readStart = performance.now();
      let content: string | object;

      if (filePath.endsWith('.json')) {
        content = await file.json();
        parseTime = performance.now() - readStart;
      } else {
        content = await file.text();
        parseTime = 0; // No parsing for text files
      }

      readTime = performance.now() - readStart;
      size = typeof content === 'string' ? content.length : JSON.stringify(content).length;
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      success = false;
    }

    const totalTime = performance.now() - startTime;

    return {
      file: filePath,
      size,
      readTime,
      parseTime,
      totalTime,
      success,
      error,
    };
  }

  /**
   * Display individual file operation result
   */
  private displayFileResult(result: FileOperationResult): void {
    const status = result.success ? '✅' : '❌';
    const sizeKB = (result.size / 1024).toFixed(2);

    console.info(`${status} ${result.file}`);
    console.info(`   Size: ${sizeKB} KB`);
    console.info(`   Read Time: ${result.readTime.toFixed(2)}ms`);
    if (result.parseTime > 0) {
      console.info(`   Parse Time: ${result.parseTime.toFixed(2)}ms`);
    }
    console.info(`   Total Time: ${result.totalTime.toFixed(2)}ms`);

    if (result.error) {
      console.info(`   Error: ${result.error}`);
    }
    console.info('');
  }

  /**
   * Calculate aggregate file operation metrics
   */
  private calculateFileMetrics(): void {
    const successfulResults = this.fileResults.filter(r => r.success);

    if (successfulResults.length > 0) {
      this.metrics.fileOperations.totalFiles = successfulResults.length;
      this.metrics.fileOperations.packageJson = successfulResults.filter(
        r => r.file === 'package.json'
      ).length;
      this.metrics.fileOperations.configFiles = successfulResults.filter(
        r => r.file !== 'package.json'
      ).length;
      this.metrics.fileOperations.averageTime =
        successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length;
    }
  }

  /**
   * Monitor system performance metrics
   */
  async monitorSystemPerformance(): Promise<void> {
    console.info('🖥️  Monitoring System Performance...\n');

    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memory.used = Math.round(memUsage.heapUsed / 1024 / 1024);
    this.metrics.memory.total = Math.round(memUsage.heapTotal / 1024 / 1024);
    this.metrics.memory.percentage = Math.round(
      (this.metrics.memory.used / this.metrics.memory.total) * 100
    );

    // CPU and uptime
    this.metrics.cpu.uptime = process.uptime();
    this.metrics.cpu.load = process.cpuUsage().user / 1000000; // Convert to seconds

    // Bun information
    this.metrics.bun.version = Bun.version;
    this.metrics.bun.platform = process.platform;
    this.metrics.bun.arch = process.arch;

    // Display system metrics
    console.info('💾 Memory Usage:');
    console.info(`   Used: ${this.metrics.memory.used} MB`);
    console.info(`   Total: ${this.metrics.memory.total} MB`);
    console.info(`   Usage: ${this.metrics.memory.percentage}%`);
    console.info('');

    console.info('⚡ CPU & System:');
    console.info(`   Uptime: ${this.metrics.cpu.uptime.toFixed(1)}s`);
    console.info(`   CPU Load: ${this.metrics.cpu.load.toFixed(2)}s`);
    console.info('');

    console.info('🚀 Bun Runtime:');
    console.info(`   Version: ${this.metrics.bun.version}`);
    console.info(`   Platform: ${this.metrics.bun.platform}`);
    console.info(`   Architecture: ${this.metrics.bun.arch}`);
    console.info('');
  }

  /**
   * Run comprehensive performance test
   */
  async runComprehensiveTest(): Promise<void> {
    console.info('🎯 Fire22 Dashboard Performance Monitor');
    console.info('!==!==!==!==!==!==!====\n');

    // Monitor file operations
    await this.monitorFileOperations();

    // Monitor system performance
    await this.monitorSystemPerformance();

    // Display summary
    this.displaySummary();
  }

  /**
   * Display performance summary
   */
  private displaySummary(): void {
    console.info('📊 Performance Summary');
    console.info('!==!==!==!===\n');

    console.info('📁 File Operations:');
    console.info(`   Total Files Tested: ${this.metrics.fileOperations.totalFiles}`);
    console.info(`   Package Files: ${this.metrics.fileOperations.packageJson}`);
    console.info(`   Config Files: ${this.metrics.fileOperations.configFiles}`);
    console.info(`   Average Read Time: ${this.metrics.fileOperations.averageTime.toFixed(2)}ms`);
    console.info('');

    console.info('🎯 Recommendations:');
    if (this.metrics.fileOperations.averageTime > 10) {
      console.info('   ⚠️  File read times are high - consider caching');
    } else {
      console.info('   ✅ File read performance is excellent');
    }

    if (this.metrics.memory.percentage > 80) {
      console.info('   ⚠️  High memory usage - consider optimization');
    } else {
      console.info('   ✅ Memory usage is healthy');
    }

    if (this.metrics.cpu.load > 100) {
      console.info('   ⚠️  High CPU load detected');
    } else {
      console.info('   ✅ CPU load is normal');
    }
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(): Promise<void> {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      fileResults: this.fileResults,
      summary: {
        totalFiles: this.metrics.fileOperations.totalFiles,
        averageReadTime: this.metrics.fileOperations.averageTime,
        memoryUsage: this.metrics.memory.percentage,
        cpuLoad: this.metrics.cpu.load,
      },
    };

    // Export to JSON file
    const exportPath = 'performance-report.json';
    await Bun.write(exportPath, JSON.stringify(exportData, null, 2));

    console.info(`📤 Performance data exported to: ${exportPath}`);
  }
}

// CLI interface
if (import.meta.main) {
  const monitor = new PerformanceMonitor();

  try {
    await monitor.runComprehensiveTest();
    await monitor.exportPerformanceData();
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  }
}

export { PerformanceMonitor, PerformanceMetrics, FileOperationResult };
