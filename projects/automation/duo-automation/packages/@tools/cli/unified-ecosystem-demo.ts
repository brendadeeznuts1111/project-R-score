#!/usr/bin/env bun
// Unified Color & Tension Ecosystem Demonstration
// Integrates AdvancedColorManagementSystem, TensionMetrics, and ColorfulTypeContext

import { AdvancedColorManagementSystem, type ColorValue, type ColorScheme, type ColorPalette } from './enhanced-colorsystem-integration';
import { TensionAnalyzer, type TensionMetrics } from './tension-metrics-system';
import { ColorfulTypeContext, ColorfulContextManager } from './enhanced-colorful-type-context';

// =============================================================================
// UNIFIED ECOSYSTEM INTEGRATION
// =============================================================================

/**
 * Complete system state combining color and tension information
 */
export interface UnifiedSystemState {
  /** System identifier */
  systemId: string;
  /** Current tension metrics */
  tensionMetrics: TensionMetrics;
  /** Color information from AdvancedColorManagementSystem */
  colorSystem: {
    value: ColorValue;
    scheme: ColorScheme;
    palette: ColorPalette;
    gradient: string;
    classification: string;
    description: string;
  };
  /** Context information from ColorfulTypeContext */
  contextInfo: {
    type: string;
    scope: string;
    domain: string;
    colorInfo: any;
    backend: any;
    meta: any;
  };
  /** System recommendations */
  recommendations: string[];
  /** Performance indicators */
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * System monitoring thresholds
 */
export interface MonitoringThresholds {
  tensionWarning: number;
  tensionCritical: number;
  responseTimeWarning: number;
  responseTimeCritical: number;
  errorRateWarning: number;
  errorRateCritical: number;
  throughputWarning: number;
  throughputCritical: number;
}

/**
 * Unified ecosystem manager combining all systems
 */
export class UnifiedColorTensionEcosystem {
  private readonly contextManager: ColorfulContextManager;
  private readonly systems: Map<string, UnifiedSystemState> = new Map();
  private readonly thresholds: MonitoringThresholds;
  private subscribers: Set<(update: UnifiedSystemState) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(thresholds: Partial<MonitoringThresholds> = {}) {
    this.contextManager = new ColorfulContextManager();
    this.thresholds = {
      tensionWarning: 60,
      tensionCritical: 80,
      responseTimeWarning: 500,
      responseTimeCritical: 1000,
      errorRateWarning: 0.05,
      errorRateCritical: 0.1,
      throughputWarning: 100,
      throughputCritical: 50,
      ...thresholds
    };

    this.initializeSystems();
    this.startMonitoring();
  }

  /**
   * Initialize all system contexts
   */
  private initializeSystems(): void {
    const systemConfigs = [
      { type: 'STORAGE', scope: 'ENTERPRISE', domain: 'duoplus' },
      { type: 'STORAGE', scope: 'DEVELOPMENT', domain: 'duoplus' },
      { type: 'STORAGE', scope: 'LOCAL-SANDBOX', domain: 'duoplus' },
      { type: 'SECRETS', scope: 'ENTERPRISE', domain: 'duoplus' },
      { type: 'SECRETS', scope: 'DEVELOPMENT', domain: 'duoplus' },
      { type: 'SECRETS', scope: 'LOCAL-SANDBOX', domain: 'duoplus' },
      { type: 'SERVICE', scope: 'ENTERPRISE', domain: 'duoplus' },
      { type: 'SERVICE', scope: 'DEVELOPMENT', domain: 'duoplus' },
      { type: 'SERVICE', scope: 'LOCAL-SANDBOX', domain: 'duoplus' }
    ];

    systemConfigs.forEach(config => {
      const context = this.contextManager.createContext(
        config.type as any,
        config.scope,
        config.domain
      );

      const systemId = `${config.type}-${config.scope}-${config.domain}`;
      this.systems.set(systemId, this.createUnifiedState(systemId, context));
    });
  }

  /**
   * Create unified system state
   */
  private createUnifiedState(systemId: string, context: ColorfulTypeContext): UnifiedSystemState {
    const tension = context.tension;
    const tensionMetrics = context.tensionMetrics;

    // Generate color system information
    const colorValue = AdvancedColorManagementSystem.generateCompleteColorValue(tension);
    const colorScheme = AdvancedColorManagementSystem.generateColorSchemeFromTension(tension);
    const colorPalette = AdvancedColorManagementSystem.generateColorPaletteFromTension(tension);
    const gradient = AdvancedColorManagementSystem.generateHSLGradientFromTension(tension);
    const classification = AdvancedColorManagementSystem.getTensionClassification(tension);
    const description = AdvancedColorManagementSystem.getColorDescriptionFromTension(tension);

    // Generate recommendations
    const recommendations = this.generateRecommendations(tensionMetrics, colorValue);

    // Simulate performance metrics
    const performance = this.simulatePerformanceMetrics(tension);

    return {
      systemId,
      tensionMetrics,
      colorSystem: {
        value: colorValue,
        scheme: colorScheme,
        palette: colorPalette,
        gradient,
        classification,
        description
      },
      contextInfo: {
        type: context.type,
        scope: context.scope,
        domain: context.domain,
        colorInfo: context.colorInfo,
        backend: context.getBackend(),
        meta: context.meta
      },
      recommendations,
      performance,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate comprehensive recommendations with categorization and action items
   */
  private generateRecommendations(tensionMetrics: TensionMetrics, colorValue: ColorValue): string[] {
    const recommendations: string[] = [];
    const tension = tensionMetrics.value;
    const trend = tensionMetrics.trend;
    const confidence = tensionMetrics.metadata.analysisConfidence;

    // CRITICAL ALERTS - Immediate Action Required
    if (tension > 85) {
      recommendations.push('🚨 CRITICAL: System in failure state - IMMEDIATE ACTION REQUIRED');
      recommendations.push('📞 Page on-call engineering team immediately');
      recommendations.push('🔥 Consider emergency failover to backup systems');
      recommendations.push('� Enable detailed logging and monitoring');
      recommendations.push('🛑 Prepare for potential service degradation');
    } else if (tension > 75) {
      recommendations.push('⚠️ SEVERE: System tension critical - urgent intervention needed');
      recommendations.push('🔍 Investigate top contributing factors immediately');
      recommendations.push('📈 Consider scaling resources horizontally');
      recommendations.push('🔄 Prepare rollback plan for recent deployments');
    }

    // HIGH PRIORITY - Address Within Hours
    if (tension > 60) {
      recommendations.push('🔴 HIGH PRIORITY: System performance severely degraded');
      recommendations.push('📋 Schedule emergency performance review meeting');
      recommendations.push('🔧 Optimize database queries and connection pooling');
      recommendations.push('💾 Review memory allocation and garbage collection');
      recommendations.push('⚡ Profile CPU-intensive operations');
    }

    // CONTRIBUTOR-SPECIFIC RECOMMENDATIONS
    const topContributors = tensionMetrics.contributors
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);

    topContributors.forEach((contributor, index) => {
      const priority = index === 0 ? '🔴' : index === 1 ? '🟡' : '🟢';
      
      switch (contributor.source) {
        case 'error_rate':
          if (contributor.value > 0.1) {
            recommendations.push(`${priority} CRITICAL ERROR RATE: ${(contributor.value * 100).toFixed(1)}% - Check application logs for exceptions`);
            recommendations.push(`   🔍 Review recent deployments for breaking changes`);
            recommendations.push(`   🧪 Run integration tests to identify failing components`);
            recommendations.push(`   📊 Enable error tracking and alerting`);
          } else if (contributor.value > 0.05) {
            recommendations.push(`${priority} Elevated error rate detected - investigate API endpoints`);
            recommendations.push(`   📈 Monitor error patterns and frequency`);
          }
          break;
          
        case 'latency':
          if (contributor.value > 70) {
            recommendations.push(`${priority} HIGH LATENCY: ${Math.round(contributor.value)}ms - Performance severely impacted`);
            recommendations.push(`   ⚡ Optimize slow database queries and add indexes`);
            recommendations.push(`   🗄️ Consider database connection pooling optimization`);
            recommendations.push(`   📦 Implement caching for frequently accessed data`);
            recommendations.push(`   🌐 Review network latency and CDN configuration`);
          } else if (contributor.value > 50) {
            recommendations.push(`${priority} Response time elevated - profile application bottlenecks`);
          }
          break;
          
        case 'memory':
          if (contributor.value > 85) {
            recommendations.push(`${priority} CRITICAL MEMORY: ${Math.round(contributor.value)}% - Risk of OOM errors`);
            recommendations.push(`   💾 Check for memory leaks in long-running processes`);
            recommendations.push(`   🔧 Optimize data structures and reduce object creation`);
            recommendations.push(`   📊 Analyze heap dumps for memory allocation patterns`);
            recommendations.push(`   🔄 Consider implementing memory pooling`);
          } else if (contributor.value > 70) {
            recommendations.push(`${priority} Memory usage high - monitor garbage collection`);
          }
          break;
          
        case 'cpu':
          if (contributor.value > 85) {
            recommendations.push(`${priority} CRITICAL CPU: ${Math.round(contributor.value)}% - System overloaded`);
            recommendations.push(`   🔥 Profile CPU-intensive operations and optimize algorithms`);
            recommendations.push(`   📈 Consider horizontal scaling with load balancer`);
            recommendations.push(`   ⚙️ Review thread pool configuration and concurrency`);
            recommendations.push(`   🔄 Implement async processing for non-critical tasks`);
          } else if (contributor.value > 70) {
            recommendations.push(`${priority} CPU usage elevated - optimize computational complexity`);
          }
          break;
          
        case 'queue_depth':
          if (contributor.value > 100) {
            recommendations.push(`${priority} QUEUE BACKLOG: ${Math.round(contributor.value)} items - Processing bottleneck`);
            recommendations.push(`   📋 Add more worker processes or threads`);
            recommendations.push(`   ⚡ Optimize message processing speed`);
            recommendations.push(`   🗄️ Consider queue partitioning for parallel processing`);
            recommendations.push(`   📊 Monitor queue growth rate and set up alerts`);
          }
          break;
          
        case 'disk_usage':
          if (contributor.value > 90) {
            recommendations.push(`${priority} DISK SPACE CRITICAL: ${Math.round(contributor.value)}% full`);
            recommendations.push(`   🗑️ Clean up temporary files and old logs`);
            recommendations.push(`   📦 Implement log rotation and archiving`);
            recommendations.push(`   💾 Add additional storage capacity`);
            recommendations.push(`   📊 Monitor disk growth trends`);
          }
          break;
          
        case 'network_latency':
          if (contributor.value > 100) {
            recommendations.push(`${priority} NETWORK LATENCY: ${Math.round(contributor.value)}ms - Network issues detected`);
            recommendations.push(`   🌐 Check network infrastructure and routing`);
            recommendations.push(`   📡 Consider CDN implementation for static assets`);
            recommendations.push(`   🔍 Monitor network packet loss and retransmissions`);
          }
          break;
          
        case 'cache_hit_rate':
          if (contributor.value < 0.5) {
            recommendations.push(`${priority} LOW CACHE HIT RATE: ${(contributor.value * 100).toFixed(1)}% - Inefficient caching`);
            recommendations.push(`   📈 Review cache key strategies and TTL settings`);
            recommendations.push(`   🔧 Optimize cache warming strategies`);
            recommendations.push(`   📊 Analyze cache miss patterns`);
          }
          break;
      }
    });

    // TREND-BASED RECOMMENDATIONS
    if (trend === 'degrading') {
      recommendations.push('📉 TREND DEGRADING: Performance declining over time');
      recommendations.push('   🔍 Compare with recent deployments and configuration changes');
      recommendations.push('   📊 Analyze historical metrics to identify degradation patterns');
      recommendations.push('   🛠️ Consider rolling back recent changes if degradation is severe');
      recommendations.push('   📈 Implement more frequent monitoring during recovery');
    } else if (trend === 'improving') {
      recommendations.push('📈 TREND IMPROVING: Performance recovering well');
      recommendations.push('   ✅ Continue current optimization strategies');
      recommendations.push('   📊 Document successful changes for future reference');
      recommendations.push('   🎯 Set new performance baselines');
    } else {
      recommendations.push('➡️ TREND STABLE: System performance consistent');
      recommendations.push('   📊 Continue monitoring for any changes');
      recommendations.push('   🎯 Consider proactive optimizations');
    }

    // COLOR-BASED RECOMMENDATIONS
    if (colorValue.rgb.r > 200 && colorValue.rgb.g < 100) {
      recommendations.push('🎨 RED ZONE: System in critical state - consider emergency measures');
      recommendations.push('   🚨 Implement circuit breakers to prevent cascading failures');
      recommendations.push('   📱 Enable degraded mode for non-critical features');
      recommendations.push('   🔄 Prepare for service restart or failover');
    } else if (colorValue.rgb.r > 150 && colorValue.rgb.g < 150) {
      recommendations.push('🟠 ORANGE ZONE: System under stress - optimize resource allocation');
      recommendations.push('   📊 Review resource utilization and scaling needs');
      recommendations.push('   🔧 Implement performance optimizations');
    } else if (colorValue.rgb.g > 150 && colorValue.rgb.r < 100) {
      recommendations.push('🟢 GREEN ZONE: System performing optimally');
      recommendations.push('   ✅ Maintain current operational practices');
      recommendations.push('   📊 Consider capacity planning for future growth');
      recommendations.push('   🎯 Set aggressive performance targets');
    }

    // CONFIDENCE-BASED RECOMMENDATIONS
    if (confidence < 70) {
      recommendations.push('📊 LOW CONFIDENCE: Analysis confidence below 70%');
      recommendations.push('   🔍 Collect more comprehensive metrics data');
      recommendations.push('   📈 Improve monitoring coverage and accuracy');
      recommendations.push('   🧪 Validate data collection methods');
    }

    // BUSINESS IMPACT RECOMMENDATIONS
    if (tension > 50) {
      recommendations.push('💼 BUSINESS IMPACT: User experience may be affected');
      recommendations.push('   📱 Monitor user experience metrics and error reports');
      recommendations.push('   📞 Prepare customer communication for service issues');
      recommendations.push('   🎯 Prioritize fixes that impact user-facing features');
    }

    // INFRASTRUCTURE RECOMMENDATIONS
    if (tension > 60) {
      recommendations.push('🏗️ INFRASTRUCTURE: Review system architecture and scaling');
      recommendations.push('   📈 Consider auto-scaling implementation');
      recommendations.push('   🔍 Review load balancer configuration');
      recommendations.push('   �️ Evaluate database performance and indexing');
      recommendations.push('   🌐 Consider geographic distribution for global users');
    }

    // MONITORING AND OBSERVABILITY
    recommendations.push('📊 OBSERVABILITY: Enhance monitoring and alerting');
    recommendations.push('   🔔 Set up custom alerts for key metrics');
    recommendations.push('   📈 Implement dashboard for real-time monitoring');
    recommendations.push('   📋 Create runbooks for common issues');
    recommendations.push('   🧪 Schedule regular performance reviews');

    // Ensure we have at least one positive recommendation
    if (tension <= 30 && recommendations.length === 0) {
      recommendations.push('✅ EXCELLENT: System performing within optimal parameters');
      recommendations.push('   🎯 Consider setting more aggressive performance targets');
      recommendations.push('   📊 Document current configuration for baseline');
      recommendations.push('   🚀 Plan for future capacity and growth');
    } else if (tension <= 50 && recommendations.filter(r => r.includes('✅')).length === 0) {
      recommendations.push('✅ GOOD: System performing within acceptable parameters');
      recommendations.push('   📊 Continue monitoring for optimization opportunities');
    }

    return recommendations;
  }

  /**
   * Simulate performance metrics based on tension
   */
  private simulatePerformanceMetrics(tension: number): {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  } {
    // Higher tension = worse performance
    const tensionFactor = tension / 100;
    
    return {
      responseTime: Math.round(100 + (tensionFactor * 900)), // 100-1000ms
      throughput: Math.round(1000 - (tensionFactor * 800)), // 1000-200 ops/s
      errorRate: Math.round(tensionFactor * 100) / 1000, // 0-10%
      uptime: Math.round(100 - (tensionFactor * 5)) // 95-100%
    };
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateAllSystems();
    }, 3000); // Update every 3 seconds
  }

  /**
   * Update all system states
   */
  private updateAllSystems(): void {
    this.systems.forEach((state, systemId) => {
      // Simulate system changes
      const context = this.contextManager.getContext(systemId.split('-')[0].toLowerCase());
      if (context) {
        const updatedState = this.createUnifiedState(systemId, context);
        this.systems.set(systemId, updatedState);
        
        // Notify subscribers
        this.subscribers.forEach(callback => callback(updatedState));
      }
    });
  }

  /**
   * Get system state by ID
   */
  getSystemState(systemId: string): UnifiedSystemState | undefined {
    return this.systems.get(systemId);
  }

  /**
   * Get all system states
   */
  getAllSystemStates(): UnifiedSystemState[] {
    return Array.from(this.systems.values());
  }

  /**
   * Get systems by type
   */
  getSystemsByType(type: string): UnifiedSystemState[] {
    return Array.from(this.systems.values()).filter(
      state => state.contextInfo.type === type
    );
  }

  /**
   * Get systems by scope
   */
  getSystemsByScope(scope: string): UnifiedSystemState[] {
    return Array.from(this.systems.values()).filter(
      state => state.contextInfo.scope === scope
    );
  }

  /**
   * Get critical systems
   */
  getCriticalSystems(): UnifiedSystemState[] {
    return Array.from(this.systems.values()).filter(
      state => state.tensionMetrics.value > this.thresholds.tensionCritical
    );
  }

  /**
   * Get warning systems
   */
  getWarningSystems(): UnifiedSystemState[] {
    return Array.from(this.systems.values()).filter(
      state => state.tensionMetrics.value > this.thresholds.tensionWarning &&
      state.tensionMetrics.value <= this.thresholds.tensionCritical
    );
  }

  /**
   * Get healthy systems
   */
  getHealthySystems(): UnifiedSystemState[] {
    return Array.from(this.systems.values()).filter(
      state => state.tensionMetrics.value <= this.thresholds.tensionWarning
    );
  }

  /**
   * Get system overview
   */
  getSystemOverview(): {
    total: number;
    critical: number;
    warning: number;
    healthy: number;
    averageTension: number;
    averageResponseTime: number;
    averageThroughput: number;
    totalErrors: number;
    uptime: number;
  } {
    const states = this.getAllSystemStates();
    
    if (states.length === 0) {
      return {
        total: 0,
        critical: 0,
        warning: 0,
        healthy: 0,
        averageTension: 0,
        averageResponseTime: 0,
        averageThroughput: 0,
        totalErrors: 0,
        uptime: 0
      };
    }

    const critical = this.getCriticalSystems().length;
    const warning = this.getWarningSystems().length;
    const healthy = this.getHealthySystems().length;
    
    const averageTension = Math.round(
      states.reduce((sum, state) => sum + state.tensionMetrics.value, 0) / states.length
    );
    
    const averageResponseTime = Math.round(
      states.reduce((sum, state) => sum + state.performance.responseTime, 0) / states.length
    );
    
    const averageThroughput = Math.round(
      states.reduce((sum, state) => sum + state.performance.throughput, 0) / states.length
    );
    
    const totalErrors = states.reduce((sum, state) => sum + state.performance.errorRate, 0);
    const uptime = Math.round(
      states.reduce((sum, state) => sum + state.performance.uptime, 0) / states.length
    );

    return {
      total: states.length,
      critical,
      warning,
      healthy,
      averageTension,
      averageResponseTime,
      averageThroughput,
      totalErrors,
      uptime
    };
  }

  /**
   * Subscribe to system updates
   */
  subscribe(callback: (update: UnifiedSystemState) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Generate comprehensive CSS for all systems
   */
  generateUnifiedCSS(): string {
    let css = `
/* Unified Color & Tension Ecosystem CSS */
/* Generated at: ${new Date().toISOString()} */

:root {
  --ecosystem-systems: ${this.systems.size};
  --ecosystem-critical: ${this.getCriticalSystems().length};
  --ecosystem-warning: ${this.getWarningSystems().length};
  --ecosystem-healthy: ${this.getHealthySystems().length};
}

/* System status indicators */
.system-critical {
  --status-color: #dc2626;
  --status-bg: #fee2e2;
  --status-text: #991b1b;
}

.system-warning {
  --status-color: #f59e0b;
  --status-bg: #fef3c7;
  --status-text: #92400e;
}

.system-healthy {
  --status-color: #10b981;
  --status-bg: #3b82f6;
  --status-text: #3b82f6;
}

/* Performance indicators */
.performance-excellent {
  --performance-color: #10b981;
  --performance-bg: #3b82f6;
}

.performance-good {
  --performance-color: #3b82f6;
  --performance-bg: #dbeafe;
}

.performance-poor {
  --performance-color: #f59e0b;
  --performance-bg: #fef3c7;
}

.performance-critical {
  --performance-color: #ef4444;
  --performance-bg: #fee2e2;
}
`;

    // Add CSS for each system
    this.systems.forEach((state) => {
      const { systemId, tensionMetrics, colorSystem } = state;
      const className = systemId.toLowerCase().replace(/-/g, '-');
      
      css += `
/* System: ${systemId} */
.${className} {
  --system-tension: ${tensionMetrics.value};
  --system-trend: ${tensionMetrics.trend};
  --system-classification: ${colorSystem.classification};
  --system-description: '${colorSystem.description}';
  
  /* Color System */
  --system-hsl: ${colorSystem.value.hsl};
  --system-hex: ${colorSystem.value.hex};
  --system-gradient: ${colorSystem.gradient};
  --system-rgb: ${colorSystem.value.rgb.r}, ${colorSystem.value.rgb.g}, ${colorSystem.value.rgb.b};
  
  /* Color Scheme */
  --system-primary: ${colorSystem.scheme.primary};
  --system-secondary: ${colorSystem.scheme.secondary};
  --system-accent: ${colorSystem.scheme.accent};
  --system-background: ${colorSystem.scheme.background};
  --system-text: ${colorSystem.scheme.text};
  
  /* Performance */
  --system-response-time: ${state.performance.responseTime}ms;
  --system-throughput: ${state.performance.throughput}ops/s;
  --system-error-rate: ${state.performance.errorRate}%;
  --system-uptime: ${state.performance.uptime}%;
  
  /* Status Classes */
  ${tensionMetrics.value > this.thresholds.tensionCritical ? '--system-status: critical;' : ''}
  ${tensionMetrics.value > this.thresholds.tensionWarning && tensionMetrics.value <= this.thresholds.tensionCritical ? '--system-status: warning;' : ''}
  ${tensionMetrics.value <= this.thresholds.tensionWarning ? '--system-status: healthy;' : ''}
}

.${className} .system-header {
  background: var(--system-gradient);
  color: var(--system-text);
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
}

.${className} .system-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 12px 0;
}

.${className} .metric-card {
  background: var(--system-background);
  border: 1px solid var(--system-primary);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.${className} .metric-value {
  font-size: 1.5em;
  font-weight: bold;
  color: var(--system-primary);
}

.${className} .metric-label {
  font-size: 0.9em;
  color: var(--system-text);
  opacity: 0.8;
}

.${className} .recommendations {
  background: rgba(var(--system-rgb), 0.1);
  border-left: 4px solid var(--system-primary);
  padding: 12px;
  margin: 12px 0;
  border-radius: 0 6px 6px 0;
}

.${className} .recommendation-item {
  margin: 4px 0;
  font-size: 0.9em;
  color: var(--system-text);
}
`;
    });

    return css;
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.contextManager.stopAll();
  }
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the unified ecosystem
 */
async function demonstrateUnifiedEcosystem(): Promise<void> {
  console.log('🌟 UNIFIED COLOR & TENSION ECOSYSTEM DEMONSTRATION');
  console.log('=' .repeat(60));

  // Create ecosystem with custom thresholds
  const ecosystem = new UnifiedColorTensionEcosystem({
    tensionWarning: 50,
    tensionCritical: 75,
    responseTimeWarning: 300,
    responseTimeCritical: 800,
    errorRateWarning: 0.03,
    errorRateCritical: 0.08
  });

  console.log('\n📊 SYSTEM OVERVIEW:');
  const overview = ecosystem.getSystemOverview();
  console.log(`  Total Systems: ${overview.total}`);
  console.log(`  Critical: ${overview.critical} 🔴`);
  console.log(`  Warning: ${overview.warning} 🟡`);
  console.log(`  Healthy: ${overview.healthy} 🟢`);
  console.log(`  Average Tension: ${overview.averageTension}%`);
  console.log(`  Average Response Time: ${overview.averageResponseTime}ms`);
  console.log(`  Average Throughput: ${overview.averageThroughput} ops/s`);
  console.log(`  Total Error Rate: ${overview.totalErrors.toFixed(2)}%`);
  console.log(`  System Uptime: ${overview.uptime}%`);

  // Display system details
  console.log('\n🖥️ SYSTEM DETAILS:');
  const allSystems = ecosystem.getAllSystemStates();
  
  allSystems.forEach((system, index) => {
    console.log(`\n${index + 1}. ${system.systemId}`);
    console.log(`   Tension: ${system.tensionMetrics.value}% (${system.tensionMetrics.trend})`);
    console.log(`   Classification: ${system.colorSystem.classification}`);
    console.log(`   Description: ${system.colorSystem.description}`);
    console.log(`   Primary Color: ${system.colorSystem.scheme.primary}`);
    console.log(`   Response Time: ${system.performance.responseTime}ms`);
    console.log(`   Throughput: ${system.performance.throughput} ops/s`);
    console.log(`   Error Rate: ${system.performance.errorRate}%`);
    console.log(`   Recommendations: ${system.recommendations.length}`);
    
    if (system.recommendations.length > 0) {
      console.log(`   Top Recommendation: ${system.recommendations[0]}`);
    }
  });

  // Display critical systems
  console.log('\n🚨 CRITICAL SYSTEMS:');
  const criticalSystems = ecosystem.getCriticalSystems();
  if (criticalSystems.length > 0) {
    criticalSystems.forEach(system => {
      console.log(`  ❌ ${system.systemId}: ${system.tensionMetrics.value}% tension`);
      system.recommendations.slice(0, 2).forEach(rec => {
        console.log(`     • ${rec}`);
      });
    });
  } else {
    console.log('  ✅ No critical systems detected');
  }

  // Display systems by type
  console.log('\n📋 SYSTEMS BY TYPE:');
  const types = ['STORAGE', 'SECRETS', 'SERVICE'];
  types.forEach(type => {
    const systems = ecosystem.getSystemsByType(type);
    const avgTension = Math.round(
      systems.reduce((sum, s) => sum + s.tensionMetrics.value, 0) / systems.length
    );
    console.log(`  ${type}: ${systems.length} systems, avg tension: ${avgTension}%`);
  });

  // Subscribe to updates
  console.log('\n🔔 SUBSCRIBING TO REAL-TIME UPDATES...');
  const unsubscribe = ecosystem.subscribe((update) => {
    if (update.tensionMetrics.value > 70) {
      console.log(`🚨 ALERT: ${update.systemId} tension increased to ${update.tensionMetrics.value}%`);
    }
  });

  // Let it run for a few seconds to show updates
  console.log('\n⏱️ MONITORING FOR UPDATES...');
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Generate CSS
  console.log('\n🎨 GENERATING UNIFIED CSS...');
  const css = ecosystem.generateUnifiedCSS();
  console.log(`Generated ${css.length} characters of unified CSS`);

  // Cleanup
  console.log('\n🧹 CLEANING UP...');
  unsubscribe();
  ecosystem.stop();

  console.log('\n✅ UNIFIED ECOSYSTEM DEMONSTRATION COMPLETE!');
  console.log('\n📋 ECOSYSTEM FEATURES:');
  console.log('  🌟 Unified system state combining color and tension');
  console.log('  📊 Real-time monitoring with configurable thresholds');
  console.log('  🎨 Advanced color management with mathematical precision');
  console.log('  📈 Tension analysis with weighted contributors');
  console.log('  🔔 Intelligent recommendations based on system state');
  console.log('  🎯 Performance metrics and trend analysis');
  console.log('  📱 Comprehensive CSS generation for all systems');
  console.log('  🔧 TypeScript interfaces with full type safety');
  console.log('  🌐 Real-time subscription system for updates');

  console.log('\n🔧 USAGE EXAMPLES:');
  console.log('  // Create ecosystem');
  console.log('  const ecosystem = new UnifiedColorTensionEcosystem();');
  console.log('');
  console.log('  // Get system overview');
  console.log('  const overview = ecosystem.getSystemOverview();');
  console.log('');
  console.log('  // Get critical systems');
  console.log('  const critical = ecosystem.getCriticalSystems();');
  console.log('');
  console.log('  // Subscribe to updates');
  console.log('  ecosystem.subscribe((update) => {');
  console.log('    console.log(`System ${update.systemId} updated`);');
  console.log('  });');
  console.log('');
  console.log('  // Generate unified CSS');
  console.log('  const css = ecosystem.generateUnifiedCSS();');
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateUnifiedEcosystem().catch(console.error);
}
