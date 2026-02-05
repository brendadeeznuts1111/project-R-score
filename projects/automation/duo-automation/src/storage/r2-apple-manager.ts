#!/usr/bin/env bun
// src/storage/r2-apple-manager.ts - STRICT R2 VERSION (Bun 1.3.5 Optimized)
import { join } from 'path';
import { S3Client, write, type S3Options } from 'bun';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PerfMetric, enhanceMetric, PerfMetricClass } from '../../types/perf-metric';
import { feature } from "bun:bundle";
import { getActiveTimezoneConfig } from '../../bootstrap-timezone.ts';
import { UnicodeTableFormatter } from '../../terminal/unicode-formatter.ts';

interface EnhancedPerfMetric extends PerfMetric {
  timestamp: string;
  timezone: string;
  scope?: string;
  featureFlags?: string[];
  location?: string;
  duration?: number;
}

interface PerfTrackerConfig {
  enableTimezoneTracking: boolean;
  enableFeatureFlagTracking: boolean;
  enableLocationTracking: boolean;
  maxMetrics: number;
  enableUnicodeFormatting: boolean;
}

export class MasterPerfTracker {
  private metrics: EnhancedPerfMetric[] = [];
  private config: PerfTrackerConfig;
  private operationCounts: Map<string, number> = new Map();
  private operationTotals: Map<string, number> = new Map();
  private currentScope: string;
  private scopeMetricCounts: Map<string, number> = new Map();
  private maxMetricsPerScope: number = 100;
  
  constructor(config: Partial<PerfTrackerConfig> = {}) {
    this.config = {
      enableTimezoneTracking: feature("V37_DETERMINISTIC_TZ") ? true : false,
      enableFeatureFlagTracking: true,
      enableLocationTracking: feature("MULTI_TENANT") ? true : false,
      maxMetrics: feature("PREMIUM_ANALYTICS") ? 1000 : 500,
      enableUnicodeFormatting: feature("DEBUG_UNICODE") ? true : false,
      ...config
    };
    
    // Enforce scope isolation
    this.currentScope = process.env.DASHBOARD_SCOPE || 'UNKNOWN';
    this.validateScopeEnvironment();
  }
  
  private validateMetricScope(metric: PerfMetric): void {
    const currentScope = process.env.DASHBOARD_SCOPE || 'UNKNOWN';
    
    // Rate limiting per scope
    const currentCount = this.scopeMetricCounts.get(currentScope) || 0;
    if (currentCount >= this.maxMetricsPerScope) {
      throw new Error("Rate limit exceeded");
    }

    // Category validation by scope
    if (currentScope === 'ENTERPRISE' && metric.category === 'DEBUG') {
      throw new Error("Category DEBUG not allowed in scope ENTERPRISE");
    }

    // Agent ID required for ENTERPRISE scope
    if (currentScope === 'ENTERPRISE' && !metric.agentId) {
      throw new Error("Agent ID required for scope ENTERPRISE");
    }

    // Reject metrics claiming wrong scope
    if (metric.properties?.scope && metric.properties.scope !== currentScope) {
      throw new Error(`Metric scope mismatch: ${metric.properties.scope} != ${currentScope}`);
    }
    
    // Auto-inject scope if missing
    if (!metric.properties) metric.properties = {};
    metric.properties.scope = currentScope;

    // Increment scope metric count
    this.scopeMetricCounts.set(currentScope, currentCount + 1);
  }
  
  private sanitizeProperties(props: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(props)) {
      const cleanKey = key.replace(/[^\w.-]/g, '_');
      const cleanValue = String(value)
        .replace(/<script.*?>.*?<\/script>/gi, '')
        .replace(/<.*?>/g, '')
        .replace(/\.\.\//g, '')
        .replace(/[\r\n\t\u0000-\u001f]/g, ' ');
      const truncatedValue = cleanValue.length > 200 ? cleanValue.substring(0, 200) + '...' : cleanValue;
      sanitized[cleanKey] = truncatedValue;
    }
    return sanitized;
  }
  
  private validateScopeEnvironment(): void {
    const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX', 'UNKNOWN'];
    if (!validScopes.includes(this.currentScope)) {
      throw new Error(`Invalid scope: ${this.currentScope}. Must be one of: ${validScopes.join(', ')}`);
    }
  }
  
  async addPerformanceMetric(metric: PerfMetric): Promise<string> {
    // 🔒 Security validations
    this.validateMetricScope(metric);
    
    if (metric.properties) {
      metric.properties = this.sanitizeProperties(metric.properties);
    }
    
    const id = metric.id || `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enhancedMetric: EnhancedPerfMetric = {
      ...metric,
      id,
      timestamp: new Date().toISOString(),
      timezone: this.getTimezoneInfo(),
      featureFlags: this.getEnabledFeatureFlags(),
      location: this.getLocationInfo(),
      duration: this.calculateDuration(metric),
      scope: this.currentScope
    };
    
    if (this.metrics.length >= this.config.maxMetrics) {
      this.metrics.shift();
    }
    
    this.metrics.push(enhancedMetric);
    this.updateOperationStats(metric);
    
    if (this.config.enableFeatureFlagTracking) {
      this.trackFeatureFlagImpact(metric);
    }

    return id;
  }

  addMetric(metric: PerfMetric): void {
    this.addPerformanceMetric(metric).catch(err => {
      console.error("Failed to add metric:", err.message);
    });
  }

  clearMetrics(): void {
    this.metrics = [];
    this.scopeMetricCounts.clear();
    this.operationCounts.clear();
    this.operationTotals.clear();
  }
  
  printMasterPerfMatrix(): void {
    const metrics = this.getMetrics();
    
    const tableData = metrics.map(m => ({
      category: m.category,
      type: m.type,
      topic: m.topic,
      value: m.value,
      scope: m.properties?.scope || 'global',
      latency: m.properties?.durationMs ? `${m.properties.durationMs}ms` : 'N/A',
      impact: m.impact,
      timestamp: m.timestamp.split('T')[1].split('.')[0]
    }));
    
    console.log('\n📊 MASTER_PERF Matrix (v3.7 Enhanced)');
    console.log('='.repeat(80));
    
    if (this.config.enableUnicodeFormatting) {
      const formattedTable = UnicodeTableFormatter.generateTable(tableData, {
        sortBy: [
          { column: 'timestamp', direction: 'desc' },
          { column: 'impact', direction: 'desc' }
        ],
        maxRows: 50,
        compact: true
      });
      console.log(formattedTable);
    } else {
      console.table(tableData);
    }
    
    console.log(`🔒 Scope: ${this.currentScope} | Total Metrics: ${metrics.length} | Timezone: ${this.getTimezoneInfo()}`);
  }
  
  async exportMetricsToS3(scope?: string): Promise<string> {
    const targetScope = scope || this.currentScope;
    const metrics = this.getMetricsByScope(targetScope);
    const json = JSON.stringify(metrics, null, 2);
    
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const filename = `perf-metrics-${targetScope}-${date}-${time}.json`;
    const s3Key = `perf-metrics/${targetScope}/${filename}`;
    
    try {
      await Bun.write(s3Key, json, {
        // @ts-ignore
        contentDisposition: `attachment; filename="${filename}"`,
        contentType: "application/json; charset=utf-8"
      });
      return s3Key;
    } catch (error) {
      console.error(`❌ Failed to export metrics to S3:`, error);
      throw error;
    }
  }
  
  getMetricsByScope(scope: string): EnhancedPerfMetric[] {
    if (scope !== this.currentScope && !feature("ENTERPRISE_SECURITY")) {
      throw new Error(`Access denied: Cannot access metrics from scope ${scope}`);
    }
    return this.metrics.filter(m => m.scope === scope || m.scope === 'global');
  }
  
  getCurrentScope(): string {
    return this.currentScope;
  }
  
  getMetrics(): EnhancedPerfMetric[] {
    return [...this.metrics];
  }
  
  getMatrixString(): string {
    const tableData = this.metrics.map(m => ({
      category: m.category,
      type: m.type,
      topic: m.topic,
      id: m.id,
      value: m.value,
      impact: m.impact,
      timestamp: m.timestamp.split('T')[1].split('.')[0],
      timezone: m.timezone,
      duration: m.duration ? `${m.duration}ms` : 'N/A'
    }));
    
    return UnicodeTableFormatter.generateTable(tableData, {
      sortBy: [{ column: 'timestamp', direction: 'desc' }],
      maxRows: 50,
      compact: false
    });
  }
  
  getOperationStats(): { operation: string; count: number; total: number; average: number }[] {
    const stats: { operation: string; count: number; total: number; average: number }[] = [];
    this.operationCounts.forEach((count, operation) => {
      const total = this.operationTotals.get(operation) || 0;
      stats.push({ operation, count, total, average: count > 0 ? total / count : 0 });
    });
    return stats.sort((a, b) => b.total - a.total);
  }
  
  private getTimezoneInfo(): string {
    try {
      const tzConfig = getActiveTimezoneConfig();
      return `${tzConfig.scopeTimezone} (${tzConfig.standardOffset})`;
    } catch {
      return process.env.TZ || 'UTC';
    }
  }
  
  private getEnabledFeatureFlags(): string[] {
    const flags: string[] = [];
    if (feature("ENTERPRISE_SECURITY")) flags.push("ENTERPRISE_SECURITY");
    if (feature("DEVELOPMENT_TOOLS")) flags.push("DEVELOPMENT_TOOLS");
    if (feature("DEBUG_UNICODE")) flags.push("DEBUG_UNICODE");
    if (feature("PREMIUM_ANALYTICS")) flags.push("PREMIUM_ANALYTICS");
    if (feature("ADVANCED_DASHBOARD")) flags.push("ADVANCED_DASHBOARD");
    if (feature("AUDIT_EXPORT")) flags.push("AUDIT_EXPORT");
    if (feature("REAL_TIME_UPDATES")) flags.push("REAL_TIME_UPDATES");
    if (feature("MULTI_TENANT")) flags.push("MULTI_TENANT");
    if (feature("V37_DETERMINISTIC_TZ")) flags.push("V37_DETERMINISTIC_TZ");
    if (feature("V37_NATIVE_R2")) flags.push("V37_NATIVE_R2");
    return flags;
  }
  
  private getLocationInfo(): string {
    return Bun.env.LOCATION || Bun.env.REGION || Bun.env.DEPLOYMENT_ENV || 'local';
  }
  
  private calculateDuration(metric: PerfMetric): number | undefined {
    if (metric.properties?.duration) {
      return typeof metric.properties.duration === 'number' 
        ? metric.properties.duration 
        : parseInt(metric.properties.duration);
    }
    return undefined;
  }
  
  private updateOperationStats(metric: PerfMetric): void {
    const operation = `${metric.category}.${metric.type}`;
    this.operationCounts.set(operation, (this.operationCounts.get(operation) || 0) + 1);
    const value = typeof metric.value === 'number' ? metric.value : 0;
    this.operationTotals.set(operation, (this.operationTotals.get(operation) || 0) + value);
  }
  
  private trackFeatureFlagImpact(metric: PerfMetric): void {
    const enabledFlags = this.getEnabledFeatureFlags();
    if (enabledFlags.includes('PREMIUM_ANALYTICS')) {
      metric.properties = {
        ...metric.properties,
        featureFlags: enabledFlags,
        timezone: this.getTimezoneInfo(),
        location: this.getLocationInfo()
      };
    }
  }
}

export const R2_DIRS = {
  APPLE: 'accounts/apple-id/',
  REPORTS: 'reports/',
  TEST: 'test/',
  SCREENSHOTS: 'screenshots/'
} as const;

export class BunR2AppleManager {
  private presignedUrls: Record<string, string> = {};
  private bucket: string;
  private scope: string;
  protected s3: S3Client | null = null;
  private perfTracker: MasterPerfTracker;
  private operationMetrics: Map<string, number> = new Map();

  constructor(presignedUrls?: Record<string, string>, bucket?: string, scope?: string) {
    this.presignedUrls = presignedUrls || {};
    this.bucket = bucket || Bun.env.S3_BUCKET || 'factory-wager-packages';
    this.scope = scope || process.env.DASHBOARD_SCOPE || 'global';
    this.perfTracker = new MasterPerfTracker();
    
    // Initialize performance metrics
    this.recordPerformanceMetric('Security', 'configuration', 'Path Hardening', 'Initialization', 'getScopedKey', 'ENABLED', 'security_pattern', 'r2-apple-manager.ts', 'Zero traversal protection', { scope: this.scope });
    
    try {
      const s3Config: any = {
        bucket: this.bucket,
        timeout: 30000
      };

      if (Bun.env.S3_ENDPOINT) s3Config.endpoint = Bun.env.S3_ENDPOINT;
      if (Bun.env.S3_REGION) s3Config.region = Bun.env.S3_REGION;
      if (Bun.env.S3_ACCESS_KEY_ID) s3Config.accessKeyId = Bun.env.S3_ACCESS_KEY_ID;
      if (Bun.env.S3_SECRET_ACCESS_KEY) s3Config.secretAccessKey = Bun.env.S3_SECRET_ACCESS_KEY;

      this.s3 = new S3Client(s3Config);
      this.recordPerformanceMetric('R2', 'configuration', 'S3 Client', 'Initialization', 's3Client', 'READY', 'connection_pattern', 'r2-apple-manager.ts', 'Storage backend ready', { bucket: this.bucket });
    } catch (e) {
      console.error(`❌ S3Client Initialization failed:`, e);
    }
  }

  private recordPerformanceMetric(
    category: PerfMetric['category'],
    type: PerfMetric['type'],
    topic: string,
    subCat: string,
    id: string,
    value: string,
    pattern: string,
    locations: string,
    impact: 'low' | 'medium' | 'high',
    properties?: Record<string, any>
  ) {
    this.perfTracker.addMetric({
      category,
      type,
      topic,
      subCat,
      id,
      value,
      pattern,
      locations,
      impact,
      properties,
      agentId: process.env.AGENT_ID // Crucial fix: Inject Agent ID from env if available
    });
  }

  private trackOperation(operation: string, durationMs: number) {
    this.operationMetrics.set(operation, durationMs);
    this.recordPerformanceMetric(
      'R2',
      'performance',
      operation,
      'Latency',
      `${durationMs.toFixed(2)}ms`,
      'time_measurement',
      'r2-apple-manager.ts',
      'Operation performance',
      'low',
      { scope: this.scope, durationMs }
    );
  }

  private getScopedKey(key: string): string {
    if (this.scope === 'global' || this.scope === 'UNKNOWN') return key;
    const cleanKey = key.replace(/^\/+/, '');
    if (cleanKey.includes('..')) {
      throw new Error(`CRITICAL: Directory traversal attempt detected: ${key}`);
    }
    if (cleanKey.startsWith(this.scope + '/')) return cleanKey;
    return `${this.scope}/${cleanKey}`;
  }

  public getLocalPath(key: string): string {
    const scopedKey = this.getScopedKey(key);
    return join(process.cwd(), 'data', scopedKey);
  }

  async uploadStream(key: string, data: Uint8Array | string, contentType = 'application/json'): Promise<any> {
    const start = Bun.nanoseconds();
    const scopedKey = this.getScopedKey(key);
    try {
      const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const compressed = Bun.zstdCompressSync(dataBuffer);
      
      if (this.s3) {
        await this.s3.file(scopedKey).write(compressed as any, { type: contentType });
        const duration = (Bun.nanoseconds() - start) / 1e6;
        this.trackOperation('upload_direct', duration);
        return { success: true, key: scopedKey, provider: 's3' };
      }
      return { success: false, error: 'S3 not initialized' };
    } catch (error) {
      console.error(`❌ R2 UPLOAD FAILURE for ${key}:`, error);
      throw error;
    }
  }

  async readAsJson(key: string): Promise<any> {
    if (!this.s3) throw new Error('S3Client not initialized');
    const bytes = await this.s3.file(this.getScopedKey(key)).bytes();
    try {
      const decompressed = Bun.zstdDecompressSync(bytes);
      return JSON.parse(new TextDecoder().decode(decompressed));
    } catch {
      return JSON.parse(new TextDecoder().decode(bytes));
    }
  }

  getMasterPerfMetrics(): PerfMetric[] {
    return this.perfTracker.getMetrics();
  }

  getOperationMetrics(): Record<string, number> {
    return Object.fromEntries(this.operationMetrics);
  }

  getMasterPerfMatrixString(): string {
    return this.perfTracker.getMatrixString();
  }
}