#!/usr/bin/env bun
// Simple ColorfulTypeContext Demonstration
// Shows the enhanced context without WebSocket conflicts

import { ColorSystem } from './enhanced-colorsystem-integration';
import { TensionAnalyzer, type TensionMetrics } from './tension-metrics-system';

// =============================================================================
// ENHANCED COLORFUL TYPE CONTEXT (SIMPLIFIED)
// =============================================================================

/**
 * System context interface for tension analysis
 */
interface SystemContext {
  errorRate?: number;
  latency?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  queueDepth?: number;
  diskUsage?: number;
  networkLatency?: number;
  cacheHitRate?: number;
}

/**
 * Enhanced ColorfulTypeContext with integrated colors and tension
 */
export class ColorfulTypeContext {
  #tensionMetrics: TensionMetrics;
  #lastUpdate = Date.now();
  #colorCache = new Map<string, string>();
  
  constructor(
    public type: "STORAGE" | "SECRETS" | "SERVICE",
    public scope: string,
    public domain: string,
    private systemContext: SystemContext = {}
  ) {
    // Initialize tension metrics
    this.#tensionMetrics = TensionAnalyzer.analyzeContext(this.getContextKey(), this.systemContext);
  }
  
  /**
   * Get context key for analysis
   */
  private getContextKey(): string {
    return `${this.type.toLowerCase()}-${this.scope.toLowerCase()}-${this.domain}`;
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
      
      this.#colorCache.set(key, ColorSystem.generateHSL(adjustedTension));
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
      
      this.#colorCache.set(key, ColorSystem.generateHEX(adjustedTension));
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
      
      this.#colorCache.set(key, ColorSystem.generateGradientHSL(adjustedTension));
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
      palette: ColorSystem.generatePalette(tension),
      colorScheme: ColorSystem.generateColorScheme(tension),
      rgb: ColorSystem.generateRGB(tension),
      recommendations: TensionAnalyzer.getRecommendations(this.#tensionMetrics)
    };
  }
  
  /**
   * Generate CSS variables for this context
   */
  private generateCSS(): string {
    const cssClass = `${this.type.toLowerCase()}-${this.scope.toLowerCase()}`;
    const palette = ColorSystem.generatePalette(this.tension);
    
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
  --color-primary: ${ColorSystem.generateColorScheme(this.tension).primary};
  --color-secondary: ${ColorSystem.generateColorScheme(this.tension).secondary};
  --color-accent: ${ColorSystem.generateColorScheme(this.tension).accent};
  --color-background: ${ColorSystem.generateColorScheme(this.tension).background};
  --color-text: ${ColorSystem.generateColorScheme(this.tension).text};
  
  /* RGB Values */
  --color-rgb: ${ColorSystem.generateRGB(this.tension).r}, ${ColorSystem.generateRGB(this.tension).g}, ${ColorSystem.generateRGB(this.tension).b};
  
  /* Color Palette */
  ${Object.entries(palette).map(([shade, color]) => 
    `--color-palette-${shade}: ${color};`
  ).join('\n  ')}
}
    `.trim();
  }
  
  /**
   * Get backend configuration
   */
  getBackend() {
    const backends = {
      'STORAGE': {
        'ENTERPRISE': { type: 'aws-s3', endpoint: 's3.amazonaws.com', status: 'connected' },
        'DEVELOPMENT': { type: 'minio', endpoint: 'minio.dev.local', status: 'connected' },
        'LOCAL-SANDBOX': { type: 'local', endpoint: 'file://./storage', status: 'connected' }
      },
      'SECRETS': {
        'ENTERPRISE': { type: 'aws-secrets-manager', endpoint: 'secretsmanager.us-east-1.amazonaws.com', status: 'connected' },
        'DEVELOPMENT': { type: 'vault', endpoint: 'vault.dev.local:8200', status: 'connected' },
        'LOCAL-SANDBOX': { type: 'env-file', endpoint: '.env.local', status: 'connected' }
      },
      'SERVICE': {
        'ENTERPRISE': { type: 'kubernetes', endpoint: 'k8s.enterprise.com', status: 'connected' },
        'DEVELOPMENT': { type: 'docker-compose', endpoint: 'docker.dev.local', status: 'connected' },
        'LOCAL-SANDBOX': { type: 'localhost', endpoint: '127.0.0.1', status: 'connected' }
      }
    };
    
    const backend = backends[this.type]?.[this.scope as keyof typeof backends.STORAGE] || {
      type: 'unknown',
      endpoint: 'unknown',
      status: 'disconnected'
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
  get meta() {
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
      progressBar: this.generateProgressBar()
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
          palette: Object.keys(ColorSystem.generatePalette(this.tension)).length + ' shades'
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
  
  // Create different contexts with realistic system data
  console.log('\n📦 Creating contexts...');
  
  const storageContext = new ColorfulTypeContext('STORAGE', 'ENTERPRISE', 'duoplus', {
    errorRate: 0.02,
    latency: 150,
    memoryUsage: 45,
    cpuUsage: 30,
    queueDepth: 2,
    cacheHitRate: 0.85
  });
  
  const secretsContext = new ColorfulTypeContext('SECRETS', 'DEVELOPMENT', 'duoplus', {
    errorRate: 0.05,
    latency: 300,
    memoryUsage: 65,
    cpuUsage: 55,
    queueDepth: 5,
    cacheHitRate: 0.75
  });
  
  const serviceContext = new ColorfulTypeContext('SERVICE', 'LOCAL-SANDBOX', 'duoplus', {
    errorRate: 0.15,
    latency: 800,
    memoryUsage: 85,
    cpuUsage: 75,
    queueDepth: 12,
    cacheHitRate: 0.45
  });
  
  const contexts = [storageContext, secretsContext, serviceContext];
  
  console.log(`✅ Created ${contexts.length} contexts`);
  
  // Display context information
  console.log('\n📊 Context Information:');
  
  contexts.forEach(context => {
    console.log(`\n${context.type} (${context.scope}):`);
    console.log(`  Tension: ${context.tension}% (${context.trend})`);
    console.log(`  Status: ${context.getTensionLevel()} ${context.getTensionEmoji()}`);
    console.log(`  HSL: ${context.hslColor}`);
    console.log(`  HEX: ${context.hexColor}`);
    console.log(`  Backend: ${context.getBackend().type}`);
    console.log(`  Contributors: ${context.tensionMetrics.contributors.length}`);
    console.log(`  Confidence: ${context.tensionMetrics.metadata.analysisConfidence}%`);
    console.log(`  Description: ${context.colorInfo.description}`);
  });
  
  // Display color information
  console.log('\n🎨 Color Information:');
  
  contexts.forEach(context => {
    const colors = context.colorInfo;
    console.log(`\n${context.type} Colors:`);
    console.log(`  Primary: ${colors.colorScheme.primary}`);
    console.log(`  Secondary: ${colors.colorScheme.secondary}`);
    console.log(`  Accent: ${colors.colorScheme.accent}`);
    console.log(`  Background: ${colors.colorScheme.background}`);
    console.log(`  Text: ${colors.colorScheme.text}`);
    console.log(`  RGB: ${colors.rgb.r}, ${colors.rgb.g}, ${colors.rgb.b}`);
    console.log(`  Palette: ${Object.keys(colors.palette).length} shades`);
  });
  
  // Display CSS generation
  console.log('\n📱 CSS Generation:');
  
  contexts.forEach(context => {
    console.log(`\n${context.type} CSS:`);
    const css = context.colorInfo.css;
    console.log(css.substring(0, 300) + '...');
  });
  
  // Display recommendations
  console.log('\n💡 Recommendations:');
  
  contexts.forEach(context => {
    const recommendations = context.colorInfo.recommendations;
    console.log(`\n${context.type}:`);
    recommendations.slice(0, 2).forEach(rec => {
      console.log(`  • ${rec}`);
    });
  });
  
  // Display Bun.inspect output
  console.log('\n🔍 Bun.inspect output:');
  console.log(storageContext);
  
  console.log('\n✅ Demonstration complete!');
  console.log('\n📋 Key Features Demonstrated:');
  console.log('  ✅ Tension-based color generation');
  console.log('  ✅ Trend-aware color adjustments');
  console.log('  ✅ Comprehensive color information');
  console.log('  ✅ CSS variable generation');
  console.log('  ✅ Intelligent recommendations');
  console.log('  ✅ Visual indicators and progress bars');
  console.log('  ✅ Backend configuration tracking');
  console.log('  ✅ Enhanced CLI display with Bun.inspect');
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateColorfulTypeContext().catch(console.error);
}
