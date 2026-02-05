#!/usr/bin/env bun
// Enhanced ColorfulTypeContext with Colors & Tension Integration
// Combines ColorSystem and TensionMetrics for comprehensive context management

import { AdvancedColorManagementSystem } from './enhanced-colorsystem-integration';
import { TensionAnalyzer, type TensionMetrics } from './tension-metrics-system';

// =============================================================================
// ENHANCED COLORFUL TYPE CONTEXT
// =============================================================================

/**
 * System context interface for tension analysis
 */
interface SystemContext {
  errorRate?: number;        // 0-1 (0% to 100% errors)
  latency?: number;          // Response time in milliseconds
  memoryUsage?: number;      // 0-100 (memory percentage)
  cpuUsage?: number;         // 0-100 (CPU percentage)
  queueDepth?: number;       // Number of items in queue
  diskUsage?: number;        // 0-100 (disk percentage)
  networkLatency?: number;   // Network latency in ms
  cacheHitRate?: number;     // 0-1 (cache hit rate)
  activeConnections?: number; // Active connection count
  requestRate?: number;      // Requests per second
  responseTimeP95?: number;  // 95th percentile response time
  throughput?: number;       // Operations per second
}

/**
 * Backend configuration interface
 */
interface BackendConfig {
  type: string;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'degraded';
  lastCheck: Date;
  responseTime?: number;
}

/**
 * Context metadata interface
 */
interface ContextMetadata {
  createdAt: Date;
  lastUpdated: Date;
  version: string;
  environment: string;
  region?: string;
  tags: string[];
}

/**
 * Enhanced ColorfulTypeContext with integrated colors and tension
 */
export class ColorfulTypeContext {
  #tensionMetrics: TensionMetrics;
  #lastUpdate = Date.now();
  #colorCache = new Map<string, string>();
  #subscribers: Set<(update: { tension: number; colors: any; metrics: TensionMetrics }) => void> = new Set();
  #analysisInterval: NodeJS.Timeout | null = null;
  
  constructor(
    public type: "STORAGE" | "SECRETS" | "SERVICE",
    public scope: string,
    public domain: string,
    private systemContext: SystemContext = {}
  ) {
    // Initialize tension metrics
    this.#tensionMetrics = TensionAnalyzer.analyzeContext(this.getContextKey(), this.systemContext);
    
    // Start continuous analysis
    this.startContinuousAnalysis();
  }
  
  /**
   * Get context key for analysis
   */
  private getContextKey(): string {
    return `${this.type.toLowerCase()}-${this.scope.toLowerCase()}-${this.domain}`;
  }
  
  /**
   * Start continuous tension analysis
   */
  private startContinuousAnalysis(): void {
    this.#analysisInterval = setInterval(() => {
      this.updateTension();
    }, 2000); // Update every 2 seconds
  }
  
  /**
   * Update tension with new analysis
   */
  private updateTension(): void {
    // Simulate system context changes
    this.simulateSystemContextChanges();
    
    // Re-analyze tension
    const newMetrics = TensionAnalyzer.analyzeContext(this.getContextKey(), this.systemContext);
    this.#tensionMetrics = newMetrics;
    this.#lastUpdate = Date.now();
    
    // Clear color cache when tension changes
    this.#colorCache.clear();
    
    // Notify subscribers
    const update = {
      tension: this.tension,
      colors: this.colorInfo,
      metrics: this.#tensionMetrics
    };
    
    this.#subscribers.forEach(callback => callback(update));
  }
  
  /**
   * Simulate realistic system context changes
   */
  private simulateSystemContextChanges(): void {
    // Simulate gradual changes with occasional spikes
    const time = Date.now();
    const baseVariation = Math.sin(time / 10000) * 0.02; // Slow oscillation
    const randomSpike = Math.random() < 0.1 ? Math.random() * 0.1 : 0; // Occasional spikes
    
    // Update various metrics with realistic patterns
    this.systemContext.errorRate = Math.max(0, Math.min(0.5, 
      (this.systemContext.errorRate || 0.01) + baseVariation + randomSpike));
    
    this.systemContext.latency = Math.max(50, Math.min(2000,
      (this.systemContext.latency || 200) + (Math.random() - 0.5) * 100));
    
    this.systemContext.memoryUsage = Math.max(10, Math.min(95,
      (this.systemContext.memoryUsage || 50) + (Math.random() - 0.5) * 5));
    
    this.systemContext.cpuUsage = Math.max(5, Math.min(100,
      (this.systemContext.cpuUsage || 30) + (Math.random() - 0.5) * 10));
    
    this.systemContext.queueDepth = Math.max(0, Math.min(20,
      Math.floor((this.systemContext.queueDepth || 2) + (Math.random() - 0.5) * 2)));
    
    this.systemContext.cacheHitRate = Math.max(0.3, Math.min(1,
      (this.systemContext.cacheHitRate || 0.8) + (Math.random() - 0.5) * 0.05));
  }
  
  /**
   * Get current tension value
   */
  get tension(): number {
    return this.#tensionMetrics.value;
  }
  
  /**
   * Get tension trend
   */
  get trend(): 'improving' | 'stable' | 'degrading' {
    return this.#tensionMetrics.trend;
  }
  
  /**
   * Get HSL color with caching
   */
  get hslColor(): string {
    const key = `hsl:${this.tension}:${this.trend}`;
    if (!this.#colorCache.has(key)) {
      // Adjust color based on trend
      let adjustedTension = this.tension;
      if (this.trend === 'improving') adjustedTension = Math.max(0, this.tension - 10);
      if (this.trend === 'degrading') adjustedTension = Math.min(100, this.tension + 10);
      
      this.#colorCache.set(key, AdvancedColorManagementSystem.generateHSLColorFromTension({ tension: adjustedTension }));
    }
    return this.#colorCache.get(key)!;
  }
  
  /**
   * Get HEX color with caching
   */
  get hexColor(): string {
    const key = `hex:${this.tension}:${this.trend}`;
    if (!this.#colorCache.has(key)) {
      let adjustedTension = this.tension;
      if (this.trend === 'improving') adjustedTension = Math.max(0, this.tension - 10);
      if (this.trend === 'degrading') adjustedTension = Math.min(100, this.tension + 10);
      
      this.#colorCache.set(key, AdvancedColorManagementSystem.generateHEXColorFromTension(adjustedTension));
    }
    return this.#colorCache.get(key)!;
  }
  
  /**
   * Get gradient with caching
   */
  get gradient(): string {
    const key = `grad:${this.tension}:${this.trend}`;
    if (!this.#colorCache.has(key)) {
      let adjustedTension = this.tension;
      if (this.trend === 'improving') adjustedTension = Math.max(0, this.tension - 10);
      if (this.trend === 'degrading') adjustedTension = Math.min(100, this.tension + 10);
      
      this.#colorCache.set(key, AdvancedColorManagementSystem.generateHSLGradientFromTension(adjustedTension));
    }
    return this.#colorCache.get(key)!;
  }
  
  /**
   * Get comprehensive color information
   */
  get colorInfo() {
    const tension = this.tension;
    const trend = this.trend;
    
    return {
      hsl: this.hslColor,
      hex: this.hexColor,
      gradient: this.gradient,
      tension,
      trend,
      description: TensionAnalyzer.getTensionDescription(tension, trend),
      status: this.getTensionLevel(),
      emoji: this.getTensionEmoji(),
      css: this.generateCSS(),
      palette: AdvancedColorManagementSystem.generateColorPaletteFromTension(tension),
      colorScheme: AdvancedColorManagementSystem.generateColorSchemeFromTension(tension),
      rgb: AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(tension)),
      recommendations: TensionAnalyzer.getRecommendations(this.#tensionMetrics)
    };
  }
  
  /**
   * Generate CSS variables for this context
   */
  private generateCSS(): string {
    const cssClass = `${this.type.toLowerCase()}-${this.scope.toLowerCase()}`;
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(this.tension);
    
    return `
/* ${this.type} ${this.scope} Context - Tension: ${this.tension}% (${this.trend}) */
.${cssClass} {
  /* Core Colors */
  --hsl-color: ${this.hslColor};
  --hex-color: ${this.hexColor};
  --tension-gradient: ${this.gradient};
  --tension-level: ${this.tension};
  --tension-trend: ${this.trend};
  --tension-status: ${this.getTensionLevel()};
  
  /* Color Scheme */
  --color-primary: ${AdvancedColorManagementSystem.generateColorSchemeFromTension(this.tension).primary};
  --color-secondary: ${AdvancedColorManagementSystem.generateColorSchemeFromTension(this.tension).secondary};
  --color-accent: ${AdvancedColorManagementSystem.generateColorSchemeFromTension(this.tension).accent};
  --color-background: ${AdvancedColorManagementSystem.generateColorSchemeFromTension(this.tension).background};
  --color-text: ${AdvancedColorManagementSystem.generateColorSchemeFromTension(this.tension).text};
  
  /* RGB Values */
  --color-rgb: ${AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(this.tension)).r}, ${AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(this.tension)).g}, ${AdvancedColorManagementSystem.extractRGBFromHEX(AdvancedColorManagementSystem.generateHEXColorFromTension(this.tension)).b};
  
  /* Color Palette */
  ${Object.entries(palette).map(([shade, color]) => 
    `--color-palette-${shade}: ${color};`
  ).join('\n  ')}
  
  /* Status-based Classes */
  --status-healthy: ${this.tension < 30 ? 'block' : 'none'};
  --status-stable: ${this.tension >= 30 && this.tension < 50 ? 'block' : 'none'};
  --status-stressed: ${this.tension >= 50 && this.tension < 70 ? 'block' : 'none'};
  --status-critical: ${this.tension >= 70 ? 'block' : 'none'};
}

/* Utility Classes for ${cssClass} */
.${cssClass}.tension-visual {
  background: var(--tension-gradient);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.${cssClass}.status-indicator::before {
  content: '${this.getTensionEmoji()}';
  margin-right: 8px;
}

.${cssClass}.tension-bar {
  height: 8px;
  background: #3b82f6;
  border-radius: 4px;
  overflow: hidden;
}

.${cssClass}.tension-bar::after {
  content: '';
  display: block;
  height: 100%;
  width: calc(var(--tension-level) * 1%);
  background: var(--tension-gradient);
  transition: width 0.3s ease;
}

.${cssClass}.palette-demo {
  display: flex;
  gap: 2px;
  margin: 8px 0;
}

.${cssClass}.palette-demo > div {
  flex: 1;
  height: 20px;
  border-radius: 2px;
}
    `.trim();
  }
  
  /**
   * Generate CSS for palette demonstration
   */
  generatePaletteCSS(): string {
    const cssClass = `${this.type.toLowerCase()}-${this.scope.toLowerCase()}`;
    const palette = AdvancedColorManagementSystem.generateColorPaletteFromTension(this.tension);
    
    return `
/* Palette demonstration for ${cssClass} */
.${cssClass}.palette-demo > div:nth-child(1) { background: ${palette[50]}; }
.${cssClass}.palette-demo > div:nth-child(2) { background: ${palette[100]}; }
.${cssClass}.palette-demo > div:nth-child(3) { background: ${palette[200]}; }
.${cssClass}.palette-demo > div:nth-child(4) { background: ${palette[300]}; }
.${cssClass}.palette-demo > div:nth-child(5) { background: ${palette[400]}; }
.${cssClass}.palette-demo > div:nth-child(6) { background: ${palette[500]}; color: white; }
.${cssClass}.palette-demo > div:nth-child(7) { background: ${palette[600]}; color: white; }
.${cssClass}.palette-demo > div:nth-child(8) { background: ${palette[700]}; color: white; }
.${cssClass}.palette-demo > div:nth-child(9) { background: ${palette[800]}; color: white; }
.${cssClass}.palette-demo > div:nth-child(10) { background: ${palette[900]}; color: white; }
    `.trim();
  }
  
  /**
   * Get backend configuration
   */
  getBackend(): BackendConfig {
    const backends = {
      'STORAGE': {
        'ENTERPRISE': { type: 'aws-s3', endpoint: 's3.amazonaws.com', status: 'connected' as const },
        'DEVELOPMENT': { type: 'minio', endpoint: 'minio.dev.local', status: 'connected' as const },
        'LOCAL-SANDBOX': { type: 'local', endpoint: 'file://./storage', status: 'connected' as const }
      },
      'SECRETS': {
        'ENTERPRISE': { type: 'aws-secrets-manager', endpoint: 'secretsmanager.us-east-1.amazonaws.com', status: 'connected' as const },
        'DEVELOPMENT': { type: 'vault', endpoint: 'vault.dev.local:8200', status: 'connected' as const },
        'LOCAL-SANDBOX': { type: 'env-file', endpoint: '.env.local', status: 'connected' as const }
      },
      'SERVICE': {
        'ENTERPRISE': { type: 'kubernetes', endpoint: 'k8s.enterprise.com', status: 'connected' as const },
        'DEVELOPMENT': { type: 'docker-compose', endpoint: 'docker.dev.local', status: 'connected' as const },
        'LOCAL-SANDBOX': { type: 'localhost', endpoint: '127.0.0.1', status: 'connected' as const }
      }
    };
    
    const backend = backends[this.type]?.[this.scope as keyof typeof backends.STORAGE] || {
      type: 'unknown',
      endpoint: 'unknown',
      status: 'disconnected' as const
    };
    
    return {
      ...backend,
      lastCheck: new Date(),
      responseTime: Math.floor(Math.random() * 100) + 10
    };
  }
  
  /**
   * Get context metadata
   */
  get meta(): ContextMetadata {
    return {
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      lastUpdated: new Date(this.#lastUpdate),
      version: '3.7.0',
      environment: this.scope.toLowerCase(),
      region: this.scope === 'ENTERPRISE' ? 'us-east-1' : 'local',
      tags: [this.type.toLowerCase(), this.scope.toLowerCase(), 'tension-aware']
    };
  }
  
  /**
   * Subscribe to context updates
   */
  subscribe(callback: (update: { tension: number; colors: any; metrics: TensionMetrics }) => void): () => void {
    this.#subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.#subscribers.delete(callback);
    };
  }
  
  /**
   * Get tension metrics
   */
  get tensionMetrics(): TensionMetrics {
    return this.#tensionMetrics;
  }
  
  /**
   * Get tension emoji
   */
  private getTensionEmoji(): string {
    if (this.tension < 30) return '🟢';
    if (this.tension < 50) return '🟡';
    if (this.tension < 70) return '🟠';
    if (this.tension < 90) return '🔴';
    return '💥';
  }
  
  /**
   * Get tension level description
   */
  private getTensionLevel(): string {
    if (this.tension < 30) return 'Healthy';
    if (this.tension < 50) return 'Stable';
    if (this.tension < 70) return 'Stressed';
    if (this.tension < 90) return 'Critical';
    return 'Failing';
  }
  
  /**
   * Generate visual indicator
   */
  private generateVisualIndicator() {
    const blocks = '■'.repeat(Math.ceil(this.tension / 10));
    const emptyBlocks = '□'.repeat(10 - Math.ceil(this.tension / 10));
    
    return {
      ascii: `[${blocks}${emptyBlocks}] ${this.tension}%`,
      emoji: this.getTensionEmoji(),
      level: this.getTensionLevel(),
      trend: this.trend === 'improving' ? '↗️' : this.trend === 'degrading' ? '↘️' : '➡️',
      progressBar: this.generateProgressBar(),
      sparkline: this.generateSparkline()
    };
  }
  
  /**
   * Generate progress bar
   */
  private generateProgressBar(): string {
    const filled = Math.round(this.tension / 5);
    const empty = 20 - filled;
    const fillChar = this.tension > 70 ? '█' : this.tension > 40 ? '▓' : '▒';
    const emptyChar = '░';
    
    return `[${fillChar.repeat(filled)}${emptyChar.repeat(empty)}]`;
  }
  
  /**
   * Generate sparkline from historical data
   */
  private generateSparkline(): string {
    const history = this.#tensionMetrics.history.slice(-20);
    if (history.length === 0) return '▁▂▃▄▅▆▇█';
    
    const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const max = Math.max(...history.map(h => h.value));
    const min = Math.min(...history.map(h => h.value));
    const range = max - min || 1;
    
    return history.map(h => {
      const normalized = (h.value - min) / range;
      const index = Math.floor(normalized * (sparklineChars.length - 1));
      return sparklineChars[index];
    }).join('');
  }
  
  /**
   * Bun inspect custom implementation for enhanced CLI display
   */
  [Symbol.for('Bun.inspect.custom')]() {
    const label = `[${this.type}:${this.scope}]`;
    const visual = this.generateVisualIndicator();
    const backend = this.getBackend();
    
    return {
      [label]: {
        tension: {
          value: this.tension,
          trend: this.trend,
          level: this.getTensionLevel(),
          description: TensionAnalyzer.getTensionDescription(this.tension, this.trend),
          visual: visual
        },
        colors: {
          hsl: this.hslColor,
          hex: this.hexColor,
          gradient: this.gradient.substring(0, 50) + '...',
          palette: Object.keys(AdvancedColorManagementSystem.generateColorPaletteFromTension(this.tension)).length + ' shades'
        },
        system: {
          backend: `${backend.type} (${backend.endpoint})`,
          status: backend.status,
          responseTime: backend.responseTime + 'ms'
        },
        metrics: {
          contributors: this.#tensionMetrics.contributors.length,
          confidence: this.#tensionMetrics.metadata.analysisConfidence + '%',
          history: this.#tensionMetrics.history.length + ' points'
        },
        recommendations: TensionAnalyzer.getRecommendations(this.#tensionMetrics).slice(0, 3),
        meta: this.meta
      }
    };
  }
  
  /**
   * Stop continuous analysis
   */
  stop(): void {
    if (this.#analysisInterval) {
      clearInterval(this.#analysisInterval);
      this.#analysisInterval = null;
    }
  }
  
  /**
   * Force update tension analysis
   */
  forceUpdate(): void {
    this.updateTension();
  }
}

// =============================================================================
// CONTEXT MANAGER
// =============================================================================

/**
 * Manager for multiple ColorfulTypeContext instances
 */
export class ColorfulContextManager {
  private contexts: Map<string, ColorfulTypeContext> = new Map();
  
  /**
   * Create a new context
   */
  createContext(type: "STORAGE" | "SECRETS" | "SERVICE", scope: string, domain: string): ColorfulTypeContext {
    const key = `${type}-${scope}-${domain}`;
    
    if (this.contexts.has(key)) {
      return this.contexts.get(key)!;
    }
    
    const context = new ColorfulTypeContext(type, scope, domain);
    this.contexts.set(key, context);
    
    return context;
  }
  
  /**
   * Get existing context
   */
  getContext(key: string): ColorfulTypeContext | undefined {
    return this.contexts.get(key);
  }
  
  /**
   * Get all contexts
   */
  getAllContexts(): ColorfulTypeContext[] {
    return Array.from(this.contexts.values());
  }
  
  /**
   * Get contexts by type
   */
  getContextsByType(type: "STORAGE" | "SECRETS" | "SERVICE"): ColorfulTypeContext[] {
    return Array.from(this.contexts.values()).filter(ctx => ctx.type === type);
  }
  
  /**
   * Get contexts by scope
   */
  getContextsByScope(scope: string): ColorfulTypeContext[] {
    return Array.from(this.contexts.values()).filter(ctx => ctx.scope === scope);
  }
  
  /**
   * Generate combined CSS for all contexts
   */
  generateCombinedCSS(): string {
    let css = `
/* Combined CSS for all ColorfulTypeContext instances */
/* Generated at: ${new Date().toISOString()} */

:root {
  --context-count: ${this.contexts.size};
}
`;
    
    this.contexts.forEach(context => {
      css += '\n' + context.colorInfo.css + '\n';
      css += '\n' + context.generatePaletteCSS() + '\n';
    });
    
    return css;
  }
  
  /**
   * Stop all contexts
   */
  stopAll(): void {
    this.contexts.forEach(context => context.stop());
  }
  
  /**
   * Get system overview
   */
  getSystemOverview(): {
    totalContexts: number;
    averageTension: number;
    criticalContexts: number;
    healthyContexts: number;
    types: Record<string, number>;
    scopes: Record<string, number>;
  } {
    const contexts = this.getAllContexts();
    
    if (contexts.length === 0) {
      return {
        totalContexts: 0,
        averageTension: 0,
        criticalContexts: 0,
        healthyContexts: 0,
        types: {},
        scopes: {}
      };
    }
    
    const totalTension = contexts.reduce((sum, ctx) => sum + ctx.tension, 0);
    const criticalContexts = contexts.filter(ctx => ctx.tension > 70).length;
    const healthyContexts = contexts.filter(ctx => ctx.tension < 30).length;
    
    const types: Record<string, number> = {};
    const scopes: Record<string, number> = {};
    
    contexts.forEach(ctx => {
      types[ctx.type] = (types[ctx.type] || 0) + 1;
      scopes[ctx.scope] = (scopes[ctx.scope] || 0) + 1;
    });
    
    return {
      totalContexts: contexts.length,
      averageTension: Math.round(totalTension / contexts.length),
      criticalContexts,
      healthyContexts,
      types,
      scopes
    };
  }
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the enhanced ColorfulTypeContext
 */
async function demonstrateColorfulTypeContext(): Promise<void> {
  console.log('🎨 Enhanced ColorfulTypeContext Demonstration');
  console.log('='.repeat(50));
  
  // Create context manager
  const manager = new ColorfulContextManager();
  
  // Create different contexts
  console.log('\n📦 Creating contexts...');
  
  const storageContext = manager.createContext('STORAGE', 'ENTERPRISE', 'duoplus');
  const secretsContext = manager.createContext('SECRETS', 'DEVELOPMENT', 'duoplus');
  const serviceContext = manager.createContext('SERVICE', 'LOCAL-SANDBOX', 'duoplus');
  
  console.log(`✅ Created ${manager.getAllContexts().length} contexts`);
  
  // Display context information
  console.log('\n📊 Context Information:');
  
  const contexts = [storageContext, secretsContext, serviceContext];
  
  contexts.forEach(context => {
    console.log(`\n${context.type} (${context.scope}):`);
    console.log(`  Tension: ${context.tension}% (${context.trend})`);
    console.log(`  Status: ${context.getTensionLevel()} ${context.getTensionEmoji()}`);
    console.log(`  HSL: ${context.hslColor}`);
    console.log(`  HEX: ${context.hexColor}`);
    console.log(`  Backend: ${context.getBackend().type}`);
    console.log(`  Contributors: ${context.tensionMetrics.contributors.length}`);
    console.log(`  Confidence: ${context.tensionMetrics.metadata.analysisConfidence}%`);
  });
  
  // Subscribe to updates
  console.log('\n🔔 Subscribing to updates...');
  
  const unsubscribeStorage = storageContext.subscribe(update => {
    console.log(`📈 Storage Update: ${update.tension}% - ${update.colors.description}`);
  });
  
  const unsubscribeSecrets = secretsContext.subscribe(update => {
    console.log(`🔐 Secrets Update: ${update.tension}% - ${update.colors.description}`);
  });
  
  // Let updates run for a few seconds
  console.log('\n⏱️ Monitoring for updates...');
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  // Display system overview
  console.log('\n📋 System Overview:');
  const overview = manager.getSystemOverview();
  
  console.log(`  Total Contexts: ${overview.totalContexts}`);
  console.log(`  Average Tension: ${overview.averageTension}%`);
  console.log(`  Critical Contexts: ${overview.criticalContexts}`);
  console.log(`  Healthy Contexts: ${overview.healthyContexts}`);
  console.log(`  Types: ${Object.entries(overview.types).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  console.log(`  Scopes: ${Object.entries(overview.scopes).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  
  // Generate CSS
  console.log('\n🎨 Generating CSS...');
  const css = manager.generateCombinedCSS();
  console.log(`Generated ${css.length} characters of CSS`);
  
  // Display Bun.inspect output
  console.log('\n🔍 Bun.inspect output:');
  console.log(storageContext);
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  unsubscribeStorage();
  unsubscribeSecrets();
  manager.stopAll();
  
  console.log('\n✅ Demonstration complete!');
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateColorfulTypeContext().catch(console.error);
}
