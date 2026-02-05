#!/usr/bin/env bun
// YAML-Enhanced Master Performance Inspector with Hot-Reloadable Configuration

import { getConfigManager, type CategoryConfig, type Thresholds } from './config-manager.js';
import { ProductionUriInspector } from "../../../cli/production-uri-inspector.js";
import { AdvancedUriInspector } from "../../../cli/advanced-uri-inspector.js";

// Define InspectionResult interface locally to avoid circular imports
interface InspectionResult {
  timestamp: string;
  uri: string;
  status: string;
  category: string;
  message: string;
  decodedUri?: string;
  zeroWidthAnalysis: any;
  encodingAnomalies: string[];
  securityRisk: string;
  displayWidth: number;
  processingTime: number;
}

interface PerfMetric {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  category: string;
  type: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  scope: string;
  metadata?: Record<string, any>;
}

class YamlEnhancedPerfInspector {
  private configManager = getConfigManager();
  private categoryColors: Record<string, string> = {};
  private topicIcons: Record<string, string> = {};
  private initialized: boolean = false;

  constructor() {
    this.initializeFromConfig();
    this.setupConfigListeners();
  }

  private async initializeFromConfig(): Promise<void> {
    try {
      const config = await this.configManager.getConfig();
      
      // Initialize colors from YAML config
      Object.entries(config.categories).forEach(([name, category]) => {
        if (category.enabled) {
          this.categoryColors[name] = this.getColorCode(category.color);
        }
      });

      // Initialize icons from YAML config
      Object.entries(config.categories).forEach(([name, category]) => {
        if (category.enabled) {
          this.topicIcons[name] = category.emoji;
        }
      });

      this.initialized = true;
      console.log('🎨 YAML-Enhanced Performance Inspector initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize YAML-enhanced inspector:', error);
    }
  }

  private setupConfigListeners(): void {
    this.configManager.on('configLoaded', () => {
      console.log('🔄 Performance inspector configuration reloaded');
      this.initializeFromConfig();
    });

    this.configManager.on('configError', (error) => {
      console.error('❌ Configuration error in performance inspector:', error);
    });
  }

  private getColorCode(colorName: string): string {
    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };
    return colors[colorName] || '\x1b[37m';
  }

  private formatValue(value: number | string, unit: string, status: string): string {
    const reset = '\x1b[0m';
    const statusColors = {
      PASS: '\x1b[32m',
      FAIL: '\x1b[31m',
      WARN: '\x1b[33m'
    };

    const statusColor = statusColors[status as keyof typeof statusColors] || '';
    return `${statusColor}${value}${unit}${reset}`;
  }

  private createTable(metrics: PerfMetric[]): string {
    if (metrics.length === 0) return 'No metrics to display';

    const config = this.configManager.getConfig();
    const outputConfig = config.scopes[this.configManager.getCurrentScope()].output;
    
    if (!outputConfig.colors) {
      return this.createPlainTextTable(metrics);
    }

    const headers = ['Metric', 'Value', 'Category', 'Status', 'Impact'];
    const rows = metrics.map(metric => [
      `${this.topicIcons[metric.category] || ''} ${metric.name}`,
      this.formatValue(metric.value, metric.unit, metric.status),
      `${this.categoryColors[metric.category] || ''}${metric.category}\x1b[0m`,
      this.getStatusIndicator(metric.status),
      this.getImpactIndicator(metric.impact)
    ]);

    return this.renderTable(headers, rows, outputConfig.maxWidth);
  }

  private createPlainTextTable(metrics: PerfMetric[]): string {
    const headers = ['Metric', 'Value', 'Category', 'Status', 'Impact'];
    const rows = metrics.map(metric => [
      `${metric.name}`,
      `${metric.value}${metric.unit}`,
      `${metric.category}`,
      metric.status,
      metric.impact
    ]);

    return this.renderTable(headers, rows, 120);
  }

  private renderTable(headers: string[], rows: string[][], maxWidth: number): string {
    const columnWidths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => (row[i] || '').length))
    );

    const separator = columnWidths.map(width => '-'.repeat(width)).join(' | ');
    const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i])).join(' | ');
    
    let table = `${headerRow}\n${separator}\n`;
    
    for (const row of rows) {
      const formattedRow = row.map((cell, i) => (cell || '').padEnd(columnWidths[i])).join(' | ');
      table += `${formattedRow}\n`;
    }

    return table;
  }

  private getStatusIndicator(status: string): string {
    const indicators = {
      PASS: '✅',
      FAIL: '❌',
      WARN: '⚠️'
    };
    return indicators[status as keyof typeof indicators] || status;
  }

  private getImpactIndicator(impact: string): string {
    const indicators = {
      HIGH: '🔴',
      MEDIUM: '🟡',
      LOW: '🟢'
    };
    return indicators[impact as keyof typeof indicators] || impact;
  }

  public async convertUriInspectionToPerfMetrics(inspectionResults: InspectionResult[], scope: string): Promise<PerfMetric[]> {
    if (!this.initialized) {
      await this.waitForInitialization();
    }
    
    const config = await this.configManager.getConfig();
    const thresholds = config.scopes[scope]?.thresholds || config.thresholds;
    
    return inspectionResults.map((result, index) => {
      const categoryConfig = config.categories[result.category];
      if (!categoryConfig?.enabled) {
        return null;
      }

      const status = this.determineStatus(result, thresholds);
      const impact = this.determineImpact(result, categoryConfig);

      return {
        id: `uri-${index}`,
        name: `URI Inspection: ${result.uri.substring(0, 50)}${result.uri.length > 50 ? '...' : ''}`,
        value: result.processingTime,
        unit: 'ms',
        category: result.category,
        type: 'security',
        status,
        impact,
        timestamp: result.timestamp,
        scope,
        metadata: {
          uri: result.uri,
          decodedUri: result.decodedUri,
          securityRisk: result.securityRisk,
          zeroWidthChars: result.zeroWidthAnalysis?.count || 0,
          encodingAnomalies: result.encodingAnomalies?.length || 0
        }
      };
    }).filter((metric): metric is PerfMetric => metric !== null);
  }

  private async waitForInitialization(): Promise<void> {
    let attempts = 0;
    while (!this.initialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!this.initialized) {
      throw new Error('YAML-Enhanced Inspector failed to initialize');
    }
  }

  private determineStatus(result: InspectionResult, thresholds: Thresholds): 'PASS' | 'FAIL' | 'WARN' {
    if (result.processingTime > thresholds.processingTime) {
      return 'FAIL';
    }
    if (result.securityRisk === 'HIGH') {
      return 'FAIL';
    }
    if (result.securityRisk === 'MEDIUM' || result.encodingAnomalies.length > 0) {
      return 'WARN';
    }
    return 'PASS';
  }

  private determineImpact(result: InspectionResult, categoryConfig: CategoryConfig): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (result.securityRisk === 'HIGH' || categoryConfig.priority === 'high') {
      return 'HIGH';
    }
    if (result.securityRisk === 'MEDIUM' || categoryConfig.priority === 'medium') {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  public async runIntegratedUriSecurityInspection(
    uris: string[],
    scope: string = this.configManager.getCurrentScope()
  ): Promise<{
    inspectionResults: InspectionResult[];
    perfMetrics: PerfMetric[];
    summary: string;
  }> {
    if (!this.initialized) {
      await this.waitForInitialization();
    }
    
    const config = await this.configManager.getConfig();
    
    if (!(await this.configManager.isFeatureEnabled('advancedUriInspection'))) {
      throw new Error('Advanced URI inspection is not enabled in current configuration');
    }

    const startTime = Date.now();
    
    // Initialize production URI inspector directly
    const uriInspector = new ProductionUriInspector();
    
    console.log(`🔍 Running URI Security Inspection on ${uris.length} URIs...`);
    
    // Get enabled features asynchronously
    const enabledFeatures: string[] = [];
    for (const feature of Object.keys(config.featureFlags)) {
      if (await this.configManager.isFeatureEnabled(feature)) {
        enabledFeatures.push(feature);
      }
    }
    
    console.log(`📋 Scope: ${scope} | Features enabled: ${enabledFeatures.join(', ')}`);
    
    const inspectionResults: InspectionResult[] = [];
    
    // Process URIs based on configuration
    const scopeConfig = config.scopes[scope];
    const maxConcurrent = scopeConfig?.thresholds.maxConcurrentInspections || 5;
    
    if (scopeConfig?.inspection.parallelProcessing && uris.length > 1) {
      // Process in parallel batches
      const batches = [];
      for (let i = 0; i < uris.length; i += maxConcurrent) {
        batches.push(uris.slice(i, i + maxConcurrent));
      }
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (uri) => {
          try {
            const result = await uriInspector.inspectUri(uri);
            inspectionResults.push(result as InspectionResult);
          } catch (error) {
            console.error(`❌ Failed to inspect URI: ${uri}`, error);
          }
        });
        
        await Promise.all(batchPromises);
      }
    } else {
      // Process sequentially
      for (const uri of uris) {
        try {
          const result = await uriInspector.inspectUri(uri);
          inspectionResults.push(result as InspectionResult);
        } catch (error) {
          console.error(`❌ Failed to inspect URI: ${uri}`, error);
        }
      }
    }
    
    // Convert to performance metrics
    const perfMetrics = await this.convertUriInspectionToPerfMetrics(inspectionResults, scope);
    
    // Generate summary
    const totalTime = Date.now() - startTime;
    const summary = await this.generateSummary(inspectionResults, perfMetrics, totalTime, scope);
    
    return {
      inspectionResults,
      perfMetrics,
      summary
    };
  }

  private async generateSummary(results: InspectionResult[], metrics: PerfMetric[], totalTime: number, scope: string): Promise<string> {
    const config = await this.configManager.getConfig();
    const passCount = metrics.filter(m => m.status === 'PASS').length;
    const failCount = metrics.filter(m => m.status === 'FAIL').length;
    const warnCount = metrics.filter(m => m.status === 'WARN').length;
    
    const categories = [...new Set(results.map(r => r.category))];
    const categoryStats = categories.map(cat => {
      const catMetrics = metrics.filter(m => m.category === cat);
      const catConfig = config.categories[cat];
      return {
        name: cat,
        emoji: catConfig?.emoji || '📋',
        count: catMetrics.length,
        issues: catMetrics.filter(m => m.status !== 'PASS').length
      };
    });

    // Get enabled features asynchronously
    const enabledFeatures: string[] = [];
    for (const feature of Object.keys(config.featureFlags)) {
      if (await this.configManager.isFeatureEnabled(feature)) {
        enabledFeatures.push(feature);
      }
    }

    return `
🔍 URI Security Inspection Summary
═══════════════════════════════════════════════════════════

📊 Scope: ${scope} | Total Time: ${totalTime}ms | URIs: ${results.length}

📈 Results:
   ✅ Passed: ${passCount}
   ❌ Failed: ${failCount}
   ⚠️  Warnings: ${warnCount}

📋 Categories:
${categoryStats.map(cat => `   ${cat.emoji} ${cat.name}: ${cat.count} inspected, ${cat.issues} issues`).join('\n')}

🎯 Configuration Features Enabled:
${enabledFeatures.map(f => `   ✅ ${f}`).join('\n')}

═══════════════════════════════════════════════════════════
    `.trim();
  }

  public generateUriSecurityDashboard(perfMetrics: PerfMetric[], options: { format?: 'table' | 'json' } = {}): string {
    const config = this.configManager.getConfig();
    const outputConfig = config.scopes[this.configManager.getCurrentScope()].output;
    const format = options.format || outputConfig.format;
    
    if (format === 'json') {
      return JSON.stringify(perfMetrics, null, 2);
    }
    
    return this.createTable(perfMetrics);
  }

  public switchScope(newScope: string): void {
    this.configManager.switchScope(newScope);
    console.log(`🔄 Performance inspector switched to scope: ${newScope}`);
  }

  public getCurrentScope(): string {
    return this.configManager.getCurrentScope();
  }

  public async getConfigStatus(): Promise<string> {
    const config = await this.configManager.getConfig();
    const scope = this.configManager.getCurrentScope();
    const scopeConfig = config.scopes[scope];
    
    console.log(`🔍 Debug: scope=${scope}, scopeConfig=${JSON.stringify(scopeConfig, null, 2)}`);
    
    // Get enabled features asynchronously
    const enabledFeatures: string[] = [];
    for (const feature of Object.keys(config.featureFlags)) {
      if (await this.configManager.isFeatureEnabled(feature)) {
        enabledFeatures.push(feature);
      }
    }
    
    return `
📋 Current Configuration Status
═══════════════════════════════════════════════════════════

🎯 Active Scope: ${scope}
⚡ Parallel Processing: ${scopeConfig?.inspection?.parallelProcessing ? 'Enabled' : 'Disabled'}
🔄 Hot Reload: ${process.env.NODE_ENV === 'development' ? 'Enabled' : 'Disabled'}

📊 Thresholds:
   • Processing Time: ${scopeConfig?.thresholds?.processingTime || 'N/A'}ms
   • Max Concurrent: ${scopeConfig?.thresholds?.maxConcurrentInspections || 'N/A'}
   • Max URI Length: ${scopeConfig?.thresholds?.maxUriLength || 'N/A'}

🎛️  Enabled Features:
${enabledFeatures.map(f => `   ✅ ${f}`).join('\n')}

📋 Active Categories:
${Object.entries(config.categories).filter(([_, cat]) => cat.enabled).map(([name, cat]) => `   ${cat.emoji} ${name} (${cat.color})`).join('\n')}

═══════════════════════════════════════════════════════════
    `.trim();
  }
}

// Test function to demonstrate the YAML-enhanced inspector
export async function testYamlEnhancedInspector(): Promise<void> {
  console.log('🎨 Testing YAML-Enhanced Performance Inspector');
  console.log('═══════════════════════════════════════════════════════════');
  
  const inspector = new YamlEnhancedPerfInspector();
  
  // Wait a moment for initialization
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Show current configuration
  console.log(await inspector.getConfigStatus());
  console.log();
  
  // Test URIs including problematic ones
  const testUris = [
    'https://example.com/api/users',
    'https://api.example.com/v1/data',
    'https://test.com/path?param=value',
    'https://malicious.com/url%20with%20encoding',
    'https://example.com/path\u200Bwith\u200Czero\u200Dwidth\u200Echars',
    'https://test.com/normal/path'
  ];
  
  try {
    console.log('🔍 Running URI Security Inspection with YAML configuration...');
    
    const results = await inspector.runIntegratedUriSecurityInspection(testUris, 'development');
    
    console.log();
    console.log(results.summary);
    console.log();
    
    console.log('📊 Performance Metrics Dashboard:');
    console.log(inspector.generateUriSecurityDashboard(results.perfMetrics));
    console.log();
    
    // Test scope switching
    console.log('🔄 Testing scope switching...');
    inspector.switchScope('enterprise');
    
    // Wait for config reload
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(await inspector.getConfigStatus());
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

export { YamlEnhancedPerfInspector };
