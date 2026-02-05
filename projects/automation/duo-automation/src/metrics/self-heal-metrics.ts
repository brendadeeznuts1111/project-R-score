// src/metrics/self-heal-metrics.ts
// Comprehensive metrics collection and pattern analysis for v2.01.05

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

export interface FileMetrics {
  path: string;
  size: number;
  age: number;
  hash: string;
  pattern: string;
  lastModified: Date;
  created: Date;
  accessCount: number;
  riskScore: number;
}

export interface OperationMetrics {
  timestamp: number;
  operation: 'scan' | 'validate' | 'hash' | 'backup' | 'delete' | 'cleanup';
  duration: number;
  filesProcessed: number;
  bytesProcessed: number;
  success: boolean;
  errors: string[];
  method: 'find' | 'readdir' | 'parallel';
}

export interface PatternMetrics {
  pattern: string;
  count: number;
  totalSize: number;
  avgSize: number;
  ageDistribution: {
    recent: number;    // < 1 hour
    medium: number;    // 1-24 hours
    old: number;       // > 24 hours
  };
  riskDistribution: {
    low: number;       // < 1MB, < 1 day old
    medium: number;    // 1-100MB, 1-7 days old
    high: number;      // > 100MB, > 7 days old
  };
  frequency: number;  // Files per day
}

export interface SystemMetrics {
  timestamp: number;
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  operations: OperationMetrics[];
  patterns: PatternMetrics[];
  performance: {
    filesPerSecond: number;
    bytesPerSecond: number;
    averageOperationTime: number;
    errorRate: number;
  };
}

export interface MetricsConfig {
  enableRealTimeCollection: boolean;
  enablePatternAnalysis: boolean;
  enablePerformanceTracking: boolean;
  enableRiskAssessment: boolean;
  retentionDays: number;
  exportFormat: 'json' | 'csv' | 'prometheus';
  aggregationInterval: number; // milliseconds
}

export class SelfHealMetricsCollector {
  private config: MetricsConfig;
  private metricsHistory: SystemMetrics[] = [];
  private operationHistory: OperationMetrics[] = [];
  private patternCache: Map<string, PatternMetrics> = new Map();
  private startTime: number;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enableRealTimeCollection: true,
      enablePatternAnalysis: true,
      enablePerformanceTracking: true,
      enableRiskAssessment: true,
      retentionDays: 30,
      exportFormat: 'json',
      aggregationInterval: 60000, // 1 minute
      ...config
    };
    this.startTime = Date.now();
  }

  async startOperation(operation: OperationMetrics['operation'], method: OperationMetrics['method']): Promise<string> {
    const operationId = createHash('md5').update(`${operation}-${Date.now()}-${Math.random()}`).digest('hex').slice(0, 8);
    
    if (this.config.enableRealTimeCollection) {
      const metric: OperationMetrics = {
        timestamp: Date.now(),
        operation,
        duration: 0,
        filesProcessed: 0,
        bytesProcessed: 0,
        success: false,
        errors: [],
        method
      };
      
      this.operationHistory.push(metric);
    }
    
    return operationId;
  }

  async updateOperation(
    operationId: string,
    updates: Partial<OperationMetrics>
  ): Promise<void> {
    if (!this.config.enableRealTimeCollection) return;
    
    const lastOperation = this.operationHistory[this.operationHistory.length - 1];
    if (lastOperation) {
      Object.assign(lastOperation, updates);
    }
  }

  async completeOperation(
    operationId: string,
    success: boolean = true,
    errors: string[] = []
  ): Promise<void> {
    if (!this.config.enableRealTimeCollection) return;
    
    const lastOperation = this.operationHistory[this.operationHistory.length - 1];
    if (lastOperation) {
      lastOperation.duration = Date.now() - lastOperation.timestamp;
      lastOperation.success = success;
      lastOperation.errors = errors;
    }
  }

  async recordFileMetrics(fileMetrics: FileMetrics): Promise<void> {
    if (!this.config.enablePatternAnalysis) return;
    
    const pattern = fileMetrics.pattern;
    let patternMetrics = this.patternCache.get(pattern);
    
    if (!patternMetrics) {
      patternMetrics = {
        pattern,
        count: 0,
        totalSize: 0,
        avgSize: 0,
        ageDistribution: { recent: 0, medium: 0, old: 0 },
        riskDistribution: { low: 0, medium: 0, high: 0 },
        frequency: 0
      };
      this.patternCache.set(pattern, patternMetrics);
    }
    
    // Update pattern metrics
    patternMetrics.count++;
    patternMetrics.totalSize += fileMetrics.size;
    patternMetrics.avgSize = patternMetrics.totalSize / patternMetrics.count;
    
    // Update age distribution
    const ageHours = fileMetrics.age / (1000 * 60 * 60);
    if (ageHours < 1) {
      patternMetrics.ageDistribution.recent++;
    } else if (ageHours < 24) {
      patternMetrics.ageDistribution.medium++;
    } else {
      patternMetrics.ageDistribution.old++;
    }
    
    // Update risk distribution
    if (fileMetrics.riskScore < 30) {
      patternMetrics.riskDistribution.low++;
    } else if (fileMetrics.riskScore < 70) {
      patternMetrics.riskDistribution.medium++;
    } else {
      patternMetrics.riskDistribution.high++;
    }
    
    // Calculate frequency (files per day)
    const timeWindow = Date.now() - this.startTime;
    const days = timeWindow / (1000 * 60 * 60 * 24);
    patternMetrics.frequency = patternMetrics.count / Math.max(days, 1);
  }

  async calculateRiskScore(fileMetrics: Omit<FileMetrics, 'riskScore'>): Promise<number> {
    if (!this.config.enableRiskAssessment) return 0;
    
    let riskScore = 0;
    
    // Size risk (0-40 points)
    const sizeMB = fileMetrics.size / (1024 * 1024);
    if (sizeMB > 100) riskScore += 40;
    else if (sizeMB > 10) riskScore += 25;
    else if (sizeMB > 1) riskScore += 10;
    
    // Age risk (0-30 points)
    const ageDays = fileMetrics.age / (1000 * 60 * 60 * 24);
    if (ageDays > 30) riskScore += 30;
    else if (ageDays > 7) riskScore += 20;
    else if (ageDays > 1) riskScore += 10;
    
    // Pattern risk (0-20 points)
    const riskyPatterns = ['.*!.*', '.*temp.*', '.*backup.*', '.*cache.*'];
    if (riskyPatterns.some(pattern => new RegExp(pattern).test(fileMetrics.pattern))) {
      riskScore += 20;
    } else if (fileMetrics.pattern.includes('!')) {
      riskScore += 15;
    }
    
    // Access frequency risk (0-10 points)
    if (fileMetrics.accessCount === 0) riskScore += 10;
    else if (fileMetrics.accessCount < 5) riskScore += 5;
    
    return Math.min(riskScore, 100);
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    
    // Memory metrics
    const memUsage = process.memoryUsage();
    const memory = {
      used: memUsage.rss,
      free: 0, // Would need system call for accurate free memory
      total: memUsage.rss * 2, // Estimate
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    };
    
    // Disk metrics (simplified)
    const disk = {
      used: 0,
      free: 0,
      total: 0
    };
    
    // CPU metrics (simplified)
    const cpu = {
      usage: 0,
      loadAverage: [0, 0, 0]
    };
    
    // Calculate performance metrics
    const recentOperations = this.operationHistory.slice(-10);
    const totalFiles = recentOperations.reduce((sum, op) => sum + op.filesProcessed, 0);
    const totalBytes = recentOperations.reduce((sum, op) => sum + op.bytesProcessed, 0);
    const totalTime = recentOperations.reduce((sum, op) => sum + op.duration, 0);
    const errors = recentOperations.reduce((sum, op) => sum + op.errors.length, 0);
    
    const performance = {
      filesPerSecond: totalTime > 0 ? (totalFiles / (totalTime / 1000)) : 0,
      bytesPerSecond: totalTime > 0 ? (totalBytes / (totalTime / 1000)) : 0,
      averageOperationTime: recentOperations.length > 0 ? (totalTime / recentOperations.length) : 0,
      errorRate: totalFiles > 0 ? (errors / totalFiles) : 0
    };
    
    const systemMetrics: SystemMetrics = {
      timestamp,
      memory,
      disk,
      cpu,
      operations: recentOperations,
      patterns: Array.from(this.patternCache.values()),
      performance
    };
    
    this.metricsHistory.push(systemMetrics);
    
    // Cleanup old metrics based on retention
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime);
    
    return systemMetrics;
  }

  async analyzePatterns(): Promise<{
    summary: {
      totalPatterns: number;
      highRiskPatterns: number;
      mostActivePattern: string;
      largestPattern: string;
    };
    recommendations: string[];
    trends: {
      growing: string[];
      stable: string[];
      declining: string[];
    };
  }> {
    if (!this.config.enablePatternAnalysis) {
      return {
        summary: { totalPatterns: 0, highRiskPatterns: 0, mostActivePattern: '', largestPattern: '' },
        recommendations: [],
        trends: { growing: [], stable: [], declining: [] }
      };
    }
    
    const patterns = Array.from(this.patternCache.values());
    const highRiskPatterns = patterns.filter(p => 
      p.riskDistribution.high > p.riskDistribution.low + p.riskDistribution.medium
    );
    
    const mostActivePattern = patterns.reduce((max, p) => 
      p.frequency > max.frequency ? p : max, patterns[0] || { pattern: '', frequency: 0 }
    );
    
    const largestPattern = patterns.reduce((max, p) => 
      p.totalSize > max.totalSize ? p : max, patterns[0] || { pattern: '', totalSize: 0 }
    );
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on patterns
    if (highRiskPatterns.length > 0) {
      recommendations.push(`Consider immediate cleanup of ${highRiskPatterns.length} high-risk patterns`);
    }
    
    if (patterns.some(p => p.avgSize > 50 * 1024 * 1024)) { // 50MB average
      recommendations.push('Large average file size detected - consider compression or archiving');
    }
    
    if (patterns.some(p => p.ageDistribution.old > p.count * 0.7)) {
      recommendations.push('Many old files detected - consider automated archival');
    }
    
    // Analyze trends (simplified)
    const trends = {
      growing: patterns.filter(p => p.frequency > 10).map(p => p.pattern),
      stable: patterns.filter(p => p.frequency >= 1 && p.frequency <= 10).map(p => p.pattern),
      declining: patterns.filter(p => p.frequency < 1).map(p => p.pattern)
    };
    
    return {
      summary: {
        totalPatterns: patterns.length,
        highRiskPatterns: highRiskPatterns.length,
        mostActivePattern: mostActivePattern.pattern,
        largestPattern: largestPattern.pattern
      },
      recommendations,
      trends
    };
  }

  async exportMetrics(format: 'json' | 'csv' | 'prometheus' = 'json'): Promise<string> {
    const currentMetrics = await this.collectSystemMetrics();
    const patternAnalysis = await this.analyzePatterns();
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          timestamp: currentMetrics.timestamp,
          system: currentMetrics,
          patterns: patternAnalysis,
          configuration: this.config
        }, null, 2);
        
      case 'csv':
        return this.generateCSV(currentMetrics);
        
      case 'prometheus':
        return this.generatePrometheusMetrics(currentMetrics);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateCSV(metrics: SystemMetrics): string {
    const headers = [
      'timestamp', 'memory_used', 'memory_heap_used', 'files_per_second', 
      'bytes_per_second', 'avg_operation_time', 'error_rate', 'total_patterns'
    ];
    
    const row = [
      metrics.timestamp,
      metrics.memory.used,
      metrics.memory.heapUsed,
      metrics.performance.filesPerSecond,
      metrics.performance.bytesPerSecond,
      metrics.performance.averageOperationTime,
      metrics.performance.errorRate,
      metrics.patterns.length
    ];
    
    return [headers.join(','), row.join(',')].join('\n');
  }

  private generatePrometheusMetrics(metrics: SystemMetrics): string {
    const lines = [];
    const timestamp = metrics.timestamp;
    
    // Memory metrics
    lines.push(`# HELP duo_heal_memory_bytes Memory usage in bytes`);
    lines.push(`# TYPE duo_heal_memory_bytes gauge`);
    lines.push(`duo_heal_memory_bytes{type="rss"} ${metrics.memory.used} ${timestamp}`);
    lines.push(`duo_heal_memory_bytes{type="heap"} ${metrics.memory.heapUsed} ${timestamp}`);
    
    // Performance metrics
    lines.push(`# HELP duo_heal_performance_files_per_second Files processed per second`);
    lines.push(`# TYPE duo_heal_performance_files_per_second gauge`);
    lines.push(`duo_heal_performance_files_per_second ${metrics.performance.filesPerSecond} ${timestamp}`);
    
    lines.push(`# HELP duo_heal_performance_bytes_per_second Bytes processed per second`);
    lines.push(`# TYPE duo_heal_performance_bytes_per_second gauge`);
    lines.push(`duo_heal_performance_bytes_per_second ${metrics.performance.bytesPerSecond} ${timestamp}`);
    
    // Pattern metrics
    lines.push(`# HELP duo_heal_patterns_count Number of file patterns`);
    lines.push(`# TYPE duo_heal_patterns_count gauge`);
    lines.push(`duo_heal_patterns_count ${metrics.patterns.length} ${timestamp}`);
    
    // Error rate
    lines.push(`# HELP duo_heal_error_rate Error rate (0-1)`);
    lines.push(`# TYPE duo_heal_error_rate gauge`);
    lines.push(`duo_heal_error_rate ${metrics.performance.errorRate} ${timestamp}`);
    
    return lines.join('\n') + '\n';
  }

  async saveMetrics(filePath?: string): Promise<void> {
    const metricsPath = filePath || './data/current-metrics.json';
    const metrics = await this.exportMetrics('json');
    
    // Ensure directory exists
    const dir = metricsPath.substring(0, metricsPath.lastIndexOf('/'));
    if (dir) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(metricsPath, metrics);
  }

  async loadMetrics(filePath?: string): Promise<SystemMetrics | null> {
    const metricsPath = filePath || './data/current-metrics.json';
    
    try {
      const data = await readFile(metricsPath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.system || null;
    } catch (error) {
      return null;
    }
  }

  getMetrics(): {
    config: MetricsConfig;
    operationsCount: number;
    patternsCount: number;
    uptime: number;
  } {
    return {
      config: this.config,
      operationsCount: this.operationHistory.length,
      patternsCount: this.patternCache.size,
      uptime: Date.now() - this.startTime
    };
  }

  reset(): void {
    this.metricsHistory = [];
    this.operationHistory = [];
    this.patternCache.clear();
    this.startTime = Date.now();
  }
}

// Singleton instance for global use
export const metricsCollector = new SelfHealMetricsCollector();

// Utility functions
export async function createFileMetrics(filePath: string, stats: any): Promise<FileMetrics> {
  const now = Date.now();
  const age = now - stats.mtime.getTime();
  const pattern = filePath.split('/').pop() || '';
  
  const baseMetrics: Omit<FileMetrics, 'riskScore'> = {
    path: filePath,
    size: stats.size,
    age,
    hash: '', // Will be calculated separately
    pattern,
    lastModified: stats.mtime,
    created: stats.birthtime || stats.mtime,
    accessCount: 0 // Would need filesystem monitoring for accurate count
  };
  
  const riskScore = await metricsCollector.calculateRiskScore(baseMetrics);
  
  return {
    ...baseMetrics,
    riskScore
  };
}

export function detectFilePattern(fileName: string): string {
  // Common file patterns
  const patterns = [
    { name: 'swap-temp', regex: /^.*!.*$/ },
    { name: 'backup', regex: /^.*backup.*$/ },
    { name: 'temp', regex: /^.*temp.*$/ },
    { name: 'cache', regex: /^.*cache.*$/ },
    { name: 'log', regex: /^.*\.log$/ },
    { name: 'hidden', regex: /^\./ },
    { name: 'lock', regex: /^.*\.lock$/ },
    { name: 'pid', regex: /^.*\.pid$/ }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(fileName)) {
      return pattern.name;
    }
  }
  
  return 'unknown';
}

export function analyzeFileTrends(metrics: FileMetrics[]): {
  sizeTrend: 'increasing' | 'decreasing' | 'stable';
  ageTrend: 'increasing' | 'decreasing' | 'stable';
  frequencyTrend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
} {
  if (metrics.length < 2) {
    return {
      sizeTrend: 'stable',
      ageTrend: 'stable', 
      frequencyTrend: 'stable',
      recommendations: ['Insufficient data for trend analysis']
    };
  }
  
  // Sort by creation time
  const sorted = [...metrics].sort((a, b) => a.created.getTime() - b.created.getTime());
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  
  // Calculate averages
  const firstHalfAvgSize = firstHalf.reduce((sum, m) => sum + m.size, 0) / firstHalf.length;
  const secondHalfAvgSize = secondHalf.reduce((sum, m) => sum + m.size, 0) / secondHalf.length;
  
  const firstHalfAvgAge = firstHalf.reduce((sum, m) => sum + m.age, 0) / firstHalf.length;
  const secondHalfAvgAge = secondHalf.reduce((sum, m) => sum + m.age, 0) / secondHalf.length;
  
  // Determine trends
  const sizeTrend = secondHalfAvgSize > firstHalfAvgSize * 1.1 ? 'increasing' :
                   secondHalfAvgSize < firstHalfAvgSize * 0.9 ? 'decreasing' : 'stable';
  
  const ageTrend = secondHalfAvgAge > firstHalfAvgAge * 1.1 ? 'increasing' :
                   secondHalfAvgAge < firstHalfAvgAge * 0.9 ? 'decreasing' : 'stable';
  
  const frequencyTrend = secondHalf.length > firstHalf.length * 1.1 ? 'increasing' :
                         secondHalf.length < firstHalf.length * 0.9 ? 'decreasing' : 'stable';
  
  const recommendations: string[] = [];
  
  if (sizeTrend === 'increasing') {
    recommendations.push('File sizes are increasing - consider cleanup policies');
  }
  
  if (ageTrend === 'increasing') {
    recommendations.push('Files are getting older - implement archival strategy');
  }
  
  if (frequencyTrend === 'increasing') {
    recommendations.push('File creation frequency is increasing - monitor disk space');
  }
  
  return {
    sizeTrend,
    ageTrend,
    frequencyTrend,
    recommendations
  };
}
