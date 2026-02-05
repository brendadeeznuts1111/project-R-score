#!/usr/bin/env bun
// Enhanced Health Endpoint with TensionMetrics System
// Integrates comprehensive tension analysis, weighted contributors, and trend tracking

import { Elysia } from 'elysia';
import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';
import { WebSocketServer } from 'ws';

// =============================================================================
// TENSION METRICS SYSTEM
// =============================================================================

/**
 * Tension metrics interface with comprehensive analysis
 */
export interface TensionMetrics {
  /** Current tension value (0-100) */
  value: number;
  /** Trend analysis: improving, stable, or degrading */
  trend: 'improving' | 'stable' | 'degrading';
  /** Weighted contributors to tension calculation */
  contributors: Array<{
    source: string;
    weight: number;
    value: number;
    impact: number; // value * weight
  }>;
  /** Historical tension values for trend analysis */
  history: Array<{ timestamp: number; value: number; trend: string }>;
  /** Analysis metadata */
  metadata: {
    totalWeight: number;
    contributorCount: number;
    lastUpdated: number;
    analysisConfidence: number; // 0-100 based on data quality
  };
}

/**
 * System context for tension analysis
 */
interface SystemContext {
  errorRate?: number;        // 0-1 (0% to 100%)
  latency?: number;          // milliseconds
  memoryUsage?: number;      // 0-100 (percentage)
  queueDepth?: number;       // number of items
  cpuUsage?: number;         // 0-100 (percentage)
  diskUsage?: number;        // 0-100 (percentage)
  networkLatency?: number;   // milliseconds
  cacheHitRate?: number;     // 0-1 (0% to 100%)
  activeConnections?: number; // count
  requestRate?: number;      // requests per second
  errorCount?: number;       // count in last period
  responseTimeP95?: number;  // 95th percentile response time
  throughput?: number;       // operations per second
}

/**
 * Advanced tension analyzer with weighted metrics and trend analysis
 */
export class TensionAnalyzer {
  private static historicalData: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  
  /**
   * Analyze system context and generate comprehensive tension metrics
   */
  static analyzeContext(contextKey: string, ctx: SystemContext): TensionMetrics {
    const contributors: TensionMetrics['contributors'] = [];
    let totalWeight = 0;
    
    // Analyze error rates (highest weight - most critical)
    if (ctx.errorRate !== undefined) {
      const errorScore = Math.min(ctx.errorRate * 100, 100);
      contributors.push({
        source: 'error_rate',
        weight: 0.25,
        value: errorScore,
        impact: errorScore * 0.25
      });
      totalWeight += 0.25;
    }
    
    // Analyze latency (high weight - affects user experience)
    if (ctx.latency !== undefined) {
      const latencyScore = Math.min((ctx.latency / 1000) * 10, 100);
      contributors.push({
        source: 'latency',
        weight: 0.20,
        value: latencyScore,
        impact: latencyScore * 0.20
      });
      totalWeight += 0.20;
    }
    
    // Analyze memory usage (medium weight - system stability)
    if (ctx.memoryUsage !== undefined) {
      contributors.push({
        source: 'memory',
        weight: 0.15,
        value: ctx.memoryUsage,
        impact: ctx.memoryUsage * 0.15
      });
      totalWeight += 0.15;
    }
    
    // Analyze CPU usage (medium weight - system performance)
    if (ctx.cpuUsage !== undefined) {
      contributors.push({
        source: 'cpu',
        weight: 0.15,
        value: ctx.cpuUsage,
        impact: ctx.cpuUsage * 0.15
      });
      totalWeight += 0.15;
    }
    
    // Analyze queue depth (lower weight - backlog indicator)
    if (ctx.queueDepth !== undefined) {
      const queueScore = Math.min(ctx.queueDepth * 20, 100);
      contributors.push({
        source: 'queue',
        weight: 0.10,
        value: queueScore,
        impact: queueScore * 0.10
      });
      totalWeight += 0.10;
    }
    
    // Analyze disk usage (lower weight - storage concerns)
    if (ctx.diskUsage !== undefined) {
      contributors.push({
        source: 'disk',
        weight: 0.05,
        value: ctx.diskUsage,
        impact: ctx.diskUsage * 0.05
      });
      totalWeight += 0.05;
    }
    
    // Analyze network latency (lower weight - external dependencies)
    if (ctx.networkLatency !== undefined) {
      const networkScore = Math.min((ctx.networkLatency / 500) * 10, 100);
      contributors.push({
        source: 'network',
        weight: 0.05,
        value: networkScore,
        impact: networkScore * 0.05
      });
      totalWeight += 0.05;
    }
    
    // Analyze cache hit rate (lower weight - performance optimization)
    if (ctx.cacheHitRate !== undefined) {
      const cacheScore = Math.max(0, (1 - ctx.cacheHitRate) * 100); // Invert - lower hit rate = higher tension
      contributors.push({
        source: 'cache',
        weight: 0.05,
        value: cacheScore,
        impact: cacheScore * 0.05
      });
      totalWeight += 0.05;
    }
    
    // Calculate weighted tension
    let tension = contributors.reduce((sum, c) => sum + c.impact, 0);
    tension = totalWeight > 0 ? tension / totalWeight : 50; // Default to neutral
    
    // Round to nearest integer
    const roundedTension = Math.round(tension);
    
    // Get historical data
    const history = this.getHistoricalData(contextKey, roundedTension);
    
    // Determine trend with historical analysis
    const trend = this.determineTrend(roundedTension, history);
    
    // Calculate analysis confidence based on data completeness
    const analysisConfidence = this.calculateConfidence(contributors, totalWeight);
    
    return {
      value: roundedTension,
      trend,
      contributors,
      history,
      metadata: {
        totalWeight,
        contributorCount: contributors.length,
        lastUpdated: Date.now(),
        analysisConfidence
      }
    };
  }
  
  /**
   * Determine trend based on current value and historical data
   */
  private static determineTrend(currentValue: number, history: Array<{ timestamp: number; value: number }>): 'improving' | 'stable' | 'degrading' {
    if (history.length < 3) {
      // Not enough history, use absolute value
      if (currentValue < 30) return 'improving';
      if (currentValue < 70) return 'stable';
      return 'degrading';
    }
    
    // Analyze recent trend (last 5 data points or all if less)
    const recentHistory = history.slice(-5);
    const values = recentHistory.map(h => h.value);
    
    // Calculate trend slope
    let slope = 0;
    for (let i = 1; i < values.length; i++) {
      slope += values[i] - values[i - 1];
    }
    slope /= (values.length - 1);
    
    // Determine trend based on slope and current value
    if (slope < -5 && currentValue < 50) return 'improving';
    if (slope > 5 && currentValue > 50) return 'degrading';
    return 'stable';
  }
  
  /**
   * Get historical data for a context
   */
  private static getHistoricalData(contextKey: string, currentValue: number): Array<{ timestamp: number; value: number; trend: string }> {
    if (!this.historicalData.has(contextKey)) {
      this.historicalData.set(contextKey, []);
    }
    
    const history = this.historicalData.get(contextKey)!;
    
    // Add current value to history
    const now = Date.now();
    history.push({ timestamp: now, value: currentValue });
    
    // Keep only last 100 data points (roughly 3+ minutes at 2-second intervals)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    // Add trend to historical data
    return history.map((h, index) => ({
      ...h,
      trend: this.determineTrend(h.value, history.slice(0, index))
    }));
  }
  
  /**
   * Calculate analysis confidence based on data quality
   */
  private static calculateConfidence(contributors: TensionMetrics['contributors'], totalWeight: number): number {
    // Base confidence on total weight (more metrics = higher confidence)
    let confidence = Math.min(totalWeight * 100, 100);
    
    // Boost confidence if we have critical metrics
    const hasErrorRate = contributors.some(c => c.source === 'error_rate');
    const hasLatency = contributors.some(c => c.source === 'latency');
    const hasMemory = contributors.some(c => c.source === 'memory');
    
    if (hasErrorRate && hasLatency) confidence += 10;
    if (hasMemory) confidence += 5;
    
    return Math.min(confidence, 100);
  }
  
  /**
   * Get tension description based on value and trend
   */
  static getTensionDescription(tension: number, trend: 'improving' | 'stable' | 'degrading'): string {
    const baseDescriptions = {
      0: 'Excellent',
      10: 'Very Good',
      20: 'Good',
      30: 'Fair',
      40: 'Moderate',
      50: 'Average',
      60: 'Concerning',
      70: 'Poor',
      80: 'Bad',
      90: 'Critical',
      100: 'Failure'
    };
    
    const range = Math.floor(tension / 10) * 10;
    const baseDesc = baseDescriptions[range as keyof typeof baseDescriptions] || 'Unknown';
    
    const trendModifiers = {
      improving: ' & Improving ↗️',
      stable: ' & Stable ➡️',
      degrading: ' & Degrading ↘️'
    };
    
    return `${baseDesc}${trendModifiers[trend]}`;
  }
  
  /**
   * Get recommendations based on tension metrics
   */
  static getRecommendations(metrics: TensionMetrics): string[] {
    const recommendations: string[] = [];
    
    // Analyze top contributors
    const sortedContributors = [...metrics.contributors].sort((a, b) => b.impact - a.impact);
    
    sortedContributors.slice(0, 3).forEach(contributor => {
      switch (contributor.source) {
        case 'error_rate':
          if (contributor.value > 20) {
            recommendations.push('🚨 High error rate detected - investigate application logs and error handling');
          } else if (contributor.value > 10) {
            recommendations.push('⚠️ Elevated error rate - review error patterns and implement better monitoring');
          }
          break;
        case 'latency':
          if (contributor.value > 70) {
            recommendations.push('⏱️ High latency detected - optimize database queries and reduce response time');
          } else if (contributor.value > 40) {
            recommendations.push('📈 Latency increasing - consider caching and performance optimizations');
          }
          break;
        case 'memory':
          if (contributor.value > 85) {
            recommendations.push('💾 High memory usage - investigate memory leaks and optimize data structures');
          } else if (contributor.value > 70) {
            recommendations.push('📊 Memory usage elevated - monitor garbage collection and memory allocation');
          }
          break;
        case 'cpu':
          if (contributor.value > 85) {
            recommendations.push('🔥 High CPU usage - optimize algorithms and consider horizontal scaling');
          } else if (contributor.value > 70) {
            recommendations.push('⚡ CPU usage elevated - profile application performance and optimize bottlenecks');
          }
          break;
        case 'queue':
          if (contributor.value > 60) {
            recommendations.push('📋 Queue depth increasing - add more workers or optimize processing speed');
          }
          break;
        case 'disk':
          if (contributor.value > 80) {
            recommendations.push('💿 Disk usage high - implement log rotation and cleanup old data');
          }
          break;
        case 'network':
          if (contributor.value > 60) {
            recommendations.push('🌐 Network latency high - check external dependencies and network connectivity');
          }
          break;
        case 'cache':
          if (contributor.value > 50) {
            recommendations.push('🗄️ Cache hit rate low - optimize cache strategy and increase cache size');
          }
          break;
      }
    });
    
    // Add trend-based recommendations
    if (metrics.trend === 'degrading' && metrics.value > 60) {
      recommendations.push('📉 System performance degrading - immediate attention required');
    } else if (metrics.trend === 'improving' && metrics.value < 40) {
      recommendations.push('📈 System performance improving - continue monitoring');
    }
    
    // Add confidence-based recommendations
    if (metrics.metadata.analysisConfidence < 50) {
      recommendations.push('📊 Low analysis confidence - add more monitoring metrics');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ System performing well - continue monitoring');
    }
    
    return recommendations;
  }
}

// =============================================================================
// TENSION-AWARE COLOR SYSTEM INTEGRATION
// =============================================================================

/**
 * Enhanced color system that uses tension metrics
 */
class TensionAwareColorSystem {
  /**
   * Generate colors based on tension metrics
   */
  static generateColorsFromMetrics(metrics: TensionMetrics): {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    gradient: string;
    status: 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';
  } {
    const tension = metrics.value;
    const trend = metrics.trend;
    
    // Enhanced color mapping with trend consideration
    let baseHue = 120 - (tension * 1.2); // Green to red
    
    // Adjust hue based on trend
    if (trend === 'improving') {
      baseHue = Math.min(120, baseHue + 10); // Shift toward green
    } else if (trend === 'degrading') {
      baseHue = Math.max(0, baseHue - 10); // Shift toward red
    }
    
    const primary = this.hslToHex(baseHue, 70, 50);
    const secondary = this.hslToHex((baseHue + 180) % 360, 60, 45);
    const background = tension > 50 ? '#3b82f6' : '#3b82f6';
    const text = tension > 50 ? '#3b82f6' : '#14532d';
    const gradient = `linear-gradient(135deg, hsl(${baseHue}, 80%, 60%), hsl(${Math.max(0, baseHue - 30)}, 80%, 40%))`;
    
    let status: 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';
    if (tension <= 20) status = 'excellent';
    else if (tension <= 40) status = 'good';
    else if (tension <= 60) status = 'moderate';
    else if (tension <= 80) status = 'concerning';
    else status = 'critical';
    
    return { primary, secondary, background, text, gradient, status };
  }
  
  /**
   * Convert HSL to HEX
   */
  private static hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }
}

// =============================================================================
// TENSION MONITORING CONTEXT
// =============================================================================

/**
 * Context that monitors tension with real-time analysis
 */
class TensionMonitoringContext {
  private readonly contextKey: string;
  private readonly scope: string;
  private readonly domain: string;
  private currentMetrics: TensionMetrics | null = null;
  private subscribers: Set<(metrics: TensionMetrics) => void> = new Set();
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(contextKey: string, scope: string, domain: string) {
    this.contextKey = contextKey;
    this.scope = scope;
    this.domain = domain;
    this.startAnalysis();
  }

  /**
   * Start continuous tension analysis
   */
  private startAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, 2000); // Analyze every 2 seconds
  }

  /**
   * Perform tension analysis with simulated system data
   */
  private performAnalysis(): void {
    // Simulate system context data
    const context: SystemContext = {
      errorRate: Math.random() * 0.1, // 0-10% error rate
      latency: Math.random() * 500 + 50, // 50-550ms latency
      memoryUsage: Math.random() * 60 + 20, // 20-80% memory usage
      cpuUsage: Math.random() * 70 + 10, // 10-80% CPU usage
      queueDepth: Math.random() * 5, // 0-5 items in queue
      diskUsage: Math.random() * 40 + 30, // 30-70% disk usage
      networkLatency: Math.random() * 200 + 10, // 10-210ms network latency
      cacheHitRate: Math.random() * 0.3 + 0.7, // 70-100% cache hit rate
      activeConnections: Math.floor(Math.random() * 100) + 10,
      requestRate: Math.random() * 1000 + 100, // 100-1100 req/s
      responseTimeP95: Math.random() * 800 + 200, // 200-1000ms P95
      throughput: Math.random() * 500 + 500 // 500-1000 ops/s
    };

    // Analyze tension
    const metrics = TensionAnalyzer.analyzeContext(this.contextKey, context);
    this.currentMetrics = metrics;

    // Notify subscribers
    this.subscribers.forEach(callback => callback(metrics));
  }

  /**
   * Get current tension metrics
   */
  getMetrics(): TensionMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Subscribe to tension updates
   */
  subscribe(callback: (metrics: TensionMetrics) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }
}

// =============================================================================
// ENHANCED WEBSOCKET SERVER WITH TENSION METRICS
// =============================================================================

/**
 * WebSocket server with tension metrics integration
 */
class TensionMetricsWebSocketServer {
  private wss: WebSocketServer;
  private monitoringContexts: Map<string, TensionMonitoringContext> = new Map();

  constructor(port: number = 8766, hostname: string = 'localhost') {
    // Use proper Bun networking configuration
    this.wss = new WebSocketServer({ 
      port,
      hostname,
      // Add proper error handling and reuse address
      reuseAddr: true,
      // Set reasonable timeout
      perMessageDeflate: false
    });
    this.setupWebSocketHandlers();
    this.initializeMonitoringContexts();
    
    console.log(UnicodeTableFormatter.colorize(`🌐 TensionMetrics WebSocket server started on ws://${hostname}:${port}`, DesignSystem.status.operational));
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws, request) => {
      console.log(UnicodeTableFormatter.colorize('🔗 TensionMetrics WebSocket connection established', DesignSystem.text.accent.blue));
      
      // Send initial metrics data
      this.sendInitialMetrics(ws);
      
      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error(UnicodeTableFormatter.colorize(`❌ WebSocket message error: ${error}`, DesignSystem.status.downtime));
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(UnicodeTableFormatter.colorize('🔌 TensionMetrics WebSocket connection closed', DesignSystem.text.secondary));
      });
    });
  }

  /**
   * Initialize monitoring contexts
   */
  private initializeMonitoringContexts(): void {
    const contexts = [
      'storage-enterprise', 'storage-development', 'storage-local-sandbox',
      'api-enterprise', 'api-development', 'api-local-sandbox',
      'database-primary', 'database-replica', 'cache-redis'
    ];

    contexts.forEach(contextKey => {
      const [type, scope] = contextKey.split('-');
      const context = new TensionMonitoringContext(contextKey, scope || 'unknown', 'duoplus');
      
      // Subscribe to updates and broadcast to WebSocket clients
      context.subscribe((metrics) => {
        this.broadcastMetricsUpdate(contextKey, metrics);
      });
      
      this.monitoringContexts.set(contextKey, context);
    });
  }

  /**
   * Send initial metrics to new connection
   */
  private sendInitialMetrics(ws: WebSocket): void {
    const allMetrics = Array.from(this.monitoringContexts.entries()).map(([key, context]) => {
      const metrics = context.getMetrics();
      if (!metrics) return null;
      
      const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
      const recommendations = TensionAnalyzer.getRecommendations(metrics);
      
      return {
        key,
        metrics,
        colors,
        recommendations,
        description: TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend)
      };
    }).filter(Boolean);

    ws.send(JSON.stringify({
      type: 'initial-metrics',
      contexts: allMetrics,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message.context);
        break;
      case 'getMetrics':
        this.sendMetrics(ws, message.context);
        break;
      case 'getRecommendations':
        this.sendRecommendations(ws, message.context);
        break;
      case 'getAllContexts':
        this.sendAllContexts(ws);
        break;
      default:
        console.log(UnicodeTableFormatter.colorize(`❓ Unknown message type: ${message.type}`, DesignSystem.text.secondary));
    }
  }

  /**
   * Handle subscription to specific context
   */
  private handleSubscription(ws: WebSocket, contextKey: string): void {
    const context = this.monitoringContexts.get(contextKey);
    if (context) {
      const metrics = context.getMetrics();
      if (metrics) {
        const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
        const recommendations = TensionAnalyzer.getRecommendations(metrics);
        
        ws.send(JSON.stringify({
          type: 'metrics-subscribed',
          context: contextKey,
          metrics,
          colors,
          recommendations,
          description: TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend),
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Send metrics for specific context
   */
  private sendMetrics(ws: WebSocket, contextKey: string): void {
    const context = this.monitoringContexts.get(contextKey);
    if (context) {
      const metrics = context.getMetrics();
      if (metrics) {
        ws.send(JSON.stringify({
          type: 'metrics-data',
          context: contextKey,
          metrics,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Send recommendations for context
   */
  private sendRecommendations(ws: WebSocket, contextKey: string): void {
    const context = this.monitoringContexts.get(contextKey);
    if (context) {
      const metrics = context.getMetrics();
      if (metrics) {
        const recommendations = TensionAnalyzer.getRecommendations(metrics);
        ws.send(JSON.stringify({
          type: 'recommendations',
          context: contextKey,
          recommendations,
          tension: metrics.value,
          trend: metrics.trend,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Send all contexts
   */
  private sendAllContexts(ws: WebSocket): void {
    const contexts = Array.from(this.monitoringContexts.keys());
    ws.send(JSON.stringify({
      type: 'all-contexts',
      contexts,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Broadcast metrics update to all clients
   */
  private broadcastMetricsUpdate(contextKey: string, metrics: TensionMetrics): void {
    const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
    const recommendations = TensionAnalyzer.getRecommendations(metrics);
    
    const update = {
      type: 'metrics-update',
      context: contextKey,
      metrics,
      colors,
      recommendations,
      description: TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend),
      timestamp: new Date().toISOString()
    };

    const messageStr = JSON.stringify(update);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    this.monitoringContexts.forEach(context => context.stop());
    this.wss.close();
  }
}

// =============================================================================
// ENHANCED API WITH TENSION METRICS
// =============================================================================

/**
 * Create enhanced API with tension metrics integration
 */
function createTensionMetricsAPI(wsServer: TensionMetricsWebSocketServer) {
  return new Elysia()
    .get('/api/contexts', () => {
      const allContexts = Array.from(wsServer['monitoringContexts'].entries()).map(([key, context]) => {
        const metrics = TensionAnalyzer.analyzeContext(key, context.systemContext);
        const recommendations = TensionAnalyzer.getRecommendations(metrics);
        const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
        
        return {
          key,
          name: context.name,
          description: context.description,
          metrics: {
            value: metrics.value,
            trend: metrics.trend,
            confidence: metrics.metadata.analysisConfidence,
            recommendations,
            colors,
            history: metrics.history.slice(-10) // Last 10 data points
          }
        };
      }).filter(Boolean);

      return {
        contexts: allContexts,
        timestamp: new Date().toISOString(),
        webSocketUrl: 'ws://localhost:8766/ws-inspect',
        features: [
          'tension-analysis',
          'weighted-contributors',
          'trend-detection',
          'historical-tracking',
          'recommendations',
          'color-integration'
        ]
      };
    })

    // Specific context metrics
    .get('/tension-metrics/:contextKey', ({ params }) => {
      const context = wsServer['monitoringContexts'].get(params.contextKey);
      if (!context) {
        return { error: 'Context not found', status: 404 };
      }

      const metrics = context.getMetrics();
      if (!metrics) {
        return { error: 'No metrics available', status: 404 };
      }

      const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
      const recommendations = TensionAnalyzer.getRecommendations(metrics);

      return {
        context: params.contextKey,
        metrics,
        colors,
        recommendations,
        description: TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend),
        timestamp: new Date().toISOString()
      };
    })

    // Tension analysis utilities
    .get('/tension-analysis/utilities', () => {
      return {
        title: 'Tension Analysis Utilities',
        description: 'Comprehensive tension analysis with weighted contributors and trend detection',
        metrics: {
          value: 'Current tension value (0-100)',
          trend: 'System trend: improving, stable, or degrading',
          contributors: 'Weighted contributors to tension calculation',
          history: 'Historical tension values for trend analysis',
          confidence: 'Analysis confidence based on data quality'
        },
        contributors: {
          error_rate: { weight: 0.25, description: 'System error rate percentage' },
          latency: { weight: 0.20, description: 'Response time in milliseconds' },
          memory: { weight: 0.15, description: 'Memory usage percentage' },
          cpu: { weight: 0.15, description: 'CPU usage percentage' },
          queue: { weight: 0.10, description: 'Queue depth indicator' },
          disk: { weight: 0.05, description: 'Disk usage percentage' },
          network: { weight: 0.05, description: 'Network latency' },
          cache: { weight: 0.05, description: 'Cache hit rate (inverted)' }
        },
        examples: {
          analyzeContext: 'TensionAnalyzer.analyzeContext(contextKey, systemContext)',
          getRecommendations: 'TensionAnalyzer.getRecommendations(metrics)',
          getDescription: 'TensionAnalyzer.getTensionDescription(tension, trend)'
        }
      };
    })

    // Enhanced health endpoint with tension metrics
    .get('/health', () => {
      const allContexts = Array.from(wsServer['monitoringContexts'].values());
      const allMetrics = allContexts.map(context => context.getMetrics()).filter(Boolean);
      
      if (allMetrics.length === 0) {
        return { error: 'No metrics available', status: 503 };
      }

      // Calculate overall system tension
      const avgTension = allMetrics.reduce((sum, m) => sum + m!.value, 0) / allMetrics.length;
      const criticalCount = allMetrics.filter(m => m!.value > 80).length;
      const degradingCount = allMetrics.filter(m => m!.trend === 'degrading').length;
      
      let overallStatus = 'healthy';
      if (criticalCount > 0 || avgTension > 80) overallStatus = 'unhealthy';
      else if (avgTension > 60 || degradingCount > allMetrics.length / 2) overallStatus = 'degraded';

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        tension: {
          average: Math.round(avgTension),
          critical: criticalCount,
          degrading: degradingCount,
          total: allMetrics.length
        },
        webSocket: {
          url: `ws://${hostname}:${wsPort}/ws-inspect`,
          status: 'connected',
          clients: wsServer['wss'].clients.size
        },
        features: [
          'tension-metrics',
          'weighted-analysis',
          'trend-detection',
          'recommendations',
          'color-integration'
        ]
      };
    })

    // Demo page with tension metrics
    .get('/', () => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TensionMetrics System Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #3b82f6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .context-card {
            margin: 20px 0;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .tension-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .tension-value {
            font-size: 2em;
            font-weight: bold;
        }
        .tension-trend {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .trend-improving { background: #3b82f6; color: #3b82f6; }
        .trend-stable { background: #fef3c7; color: #92400e; }
        .trend-degrading { background: #fee2e2; color: #991b1b; }
        .tension-bar {
            height: 12px;
            background: #3b82f6;
            border-radius: 6px;
            overflow: hidden;
            margin: 10px 0;
        }
        .tension-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        .contributors {
            margin: 15px 0;
        }
        .contributor {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            margin: 4px 0;
            background: rgba(0,0,0,0.05);
            border-radius: 4px;
            font-size: 14px;
        }
        .contributor-impact {
            font-weight: bold;
        }
        .recommendations {
            margin: 15px 0;
        }
        .recommendation {
            padding: 8px;
            margin: 4px 0;
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🔍 Tension Metrics Dashboard</h1>
            <p>Real-time system tension analysis and recommendations</p>
        </div>
        
        <div class="status">
            <div>
                <strong>WebSocket Status:</strong> <span id="ws-status">Disconnected</span>
            </div>
            <div>
                <strong>Last Update:</strong> <span id="last-update">Never</span>
            </div>
        </div>
        
        <div id="contexts-container">
            <!-- Context cards will be dynamically inserted here -->
        </div>
    </div>

    <script>
        let ws = null;
        let animationInterval = null;
        const hostname = '${hostname}';
        const wsPort = ${wsPort};

        function connectWebSocket() {
            ws = new WebSocket(\`ws://\${hostname}:\${wsPort}/ws-inspect\`);
            
            ws.onopen = () => {
                document.getElementById('ws-status').textContent = 'Connected';
                document.getElementById('ws-status').style.color = '#10b981';
                
                // Request initial metrics
                ws.send(JSON.stringify({ type: 'getAllContexts' }));
            };
            
            ws.onmessage = (event) => {
                const update = JSON.parse(event.data);
                handleTensionMetricsMessage(update);
            };
            
            ws.onclose = () => {
                document.getElementById('ws-status').textContent = 'Disconnected';
                document.getElementById('ws-status').style.color = '#ef4444';
                
                // Attempt to reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                document.getElementById('ws-status').textContent = 'Error';
                document.getElementById('ws-status').style.color = '#ef4444';
            };
        }

        function handleTensionMetricsMessage(update) {
            switch (update.type) {
                case 'initial-metrics':
                    renderContextCards(update.contexts);
                    break;
                case 'metrics-update':
                    updateContextCard(update.context, update);
                    break;
                case 'all-contexts':
                    subscribeToContexts(update.contexts);
                    break;
            }
        }

        function renderContextCards(contexts) {
            const container = document.getElementById('contexts-container');
            container.innerHTML = '';
            
            contexts.forEach(ctx => {
                const card = createContextCard(ctx);
                container.appendChild(card);
            });
        }

        function createContextCard(context) {
            const card = document.createElement('div');
            card.className = \`context-card status-\${context.colors.status}\`;
            card.id = \`context-\${context.key}\`;
            
            card.innerHTML = \`
                <div class="tension-header">
                    <h3>\${context.key}</h3>
                    <div>
                        <span class="tension-value">\${context.metrics.value}</span>
                        <span class="tension-trend trend-\${context.metrics.trend}">\${context.metrics.trend.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="tension-bar">
                    <div class="tension-fill" style="width: \${context.metrics.value}%; background: \${context.colors.gradient}"></div>
                </div>
                
                <p><strong>Status:</strong> \${context.description}</p>
                <p><strong>Confidence:</strong> \${context.metrics.metadata.analysisConfidence}%</p>
                
                <div class="contributors">
                    <h4>Top Contributors:</h4>
                    \${context.metrics.contributors.slice(0, 4).map(c => 
                        \`<div class="contributor">
                            <span>\${c.source} (weight: \${c.weight})</span>
                            <span class="contributor-impact">\${c.value.toFixed(1)}% → \${c.impact.toFixed(1)}%</span>
                        </div>\`
                    ).join('')}
                </div>
                
                <div class="recommendations">
                    <h4>Recommendations:</h4>
                    \${context.recommendations.slice(0, 3).map(r => 
                        \`<div class="recommendation">\${r}</div>\`
                    ).join('')}
                </div>
            \`;
            
            return card;
        }

        function updateContextCard(contextKey, update) {
            const card = document.getElementById(\`context-\${contextKey}\`);
            if (!card) return;
            
            // Update tension value and trend
            const tensionValue = card.querySelector('.tension-value');
            const tensionTrend = card.querySelector('.tension-trend');
            const tensionFill = card.querySelector('.tension-fill');
            
            tensionValue.textContent = update.metrics.value;
            tensionTrend.textContent = update.metrics.trend.toUpperCase();
            tensionTrend.className = \`tension-trend trend-\${update.metrics.trend}\`;
            tensionFill.style.width = \`\${update.metrics.value}%\`;
            tensionFill.style.background = update.colors.gradient;
            
            // Update status
            card.className = \`context-card status-\${update.colors.status}\`;
        }

        function subscribeToAll() {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            
            const contexts = ['storage-enterprise', 'storage-development', 'storage-local-sandbox', 
                             'api-enterprise', 'api-development', 'api-local-sandbox'];
            
            contexts.forEach(context => {
                ws.send(JSON.stringify({ type: 'subscribe', context }));
            });
        }

        function getAllContexts() {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'getAllContexts' }));
        }

        function subscribeToContexts(contexts) {
            contexts.forEach(context => {
                ws.send(JSON.stringify({ type: 'subscribe', context }));
            });
        }

        function toggleAnimation() {
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            } else {
                animationInterval = setInterval(() => {
                    getAllContexts();
                }, 3000);
            }
        }

        // Initialize WebSocket connection
        connectWebSocket();
    </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    });
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the TensionMetrics system
 */
async function demonstrateTensionMetrics(): Promise<void> {
  console.log(EmpireProDashboard.generateHeader(
    'TENSION METRICS SYSTEM DEMONSTRATION',
    'Weighted Analysis, Trend Detection, and Real-time Monitoring'
  ));

  // Configure server with proper Bun networking
  const hostname = process.env.HOSTNAME || 'localhost';
  const port = parseInt(process.env.PORT || '3000');
  const wsPort = parseInt(process.env.WS_PORT || '8766');
  
  // Start WebSocket server first with proper configuration
  const wsServer = new TensionMetricsWebSocketServer(wsPort, hostname);
  
  // Create the Elysia app
  const app = createTensionMetricsAPI(wsServer);
  
  // Create HTTP server with Bun.serve for better networking
  const httpServer = Bun.serve({
    port,
    hostname,
    reuseAddr: true,
    development: process.env.NODE_ENV !== 'production',
    async fetch(req) {
      const url = new URL(req.url);
      
      // Route to the Elysia app
      if (url.pathname === '/' || url.pathname.startsWith('/tension') || url.pathname.startsWith('/api')) {
        // Forward request to Elysia app
        return app.fetch(req);
      }
      
      // Default response
    },
    error(error) {
      console.error(UnicodeTableFormatter.colorize(`❌ Server error: ${error}`, DesignSystem.status.downtime));
      return new Response('Internal Server Error', { status: 500 });
    }
  });
  
  console.log(UnicodeTableFormatter.colorize('🚀 TensionMetrics API Started', DesignSystem.status.operational));
  console.log(UnicodeTableFormatter.colorize(`🌐 Main Server: http://${hostname}:${port}`, DesignSystem.text.accent.blue));
  console.log(UnicodeTableFormatter.colorize(`📊 Demo Page: http://${hostname}:${port}/`, DesignSystem.text.accent.green));
  console.log(UnicodeTableFormatter.colorize(`📈 Metrics: http://${hostname}:${port}/tension-metrics`, DesignSystem.text.accent.purple));
  console.log(UnicodeTableFormatter.colorize(`🔗 WebSocket: ws://${hostname}:${wsPort}/ws-inspect`, DesignSystem.text.accent.yellow));
  console.log(UnicodeTableFormatter.colorize(`🛠️ Utilities: http://${hostname}:${port}/tension-analysis/utilities`, DesignSystem.text.secondary));
  
  // Demonstrate TensionAnalyzer usage
  console.log(UnicodeTableFormatter.colorize('\n📊 TENSION ANALYZER DEMONSTRATION:', DesignSystem.text.accent.blue));
  
  // Test with different system contexts
  const testContexts = [
    {
      name: 'Healthy System',
      context: {
        errorRate: 0.01,
        latency: 100,
        memoryUsage: 45,
        cpuUsage: 30,
        queueDepth: 1,
        cacheHitRate: 0.95
      }
    },
    {
      name: 'Stressed System',
      context: {
        errorRate: 0.08,
        latency: 800,
        memoryUsage: 85,
        cpuUsage: 75,
        queueDepth: 8,
        cacheHitRate: 0.6
      }
    },
    {
      name: 'Critical System',
      context: {
        errorRate: 0.25,
        latency: 2000,
        memoryUsage: 95,
        cpuUsage: 90,
        queueDepth: 15,
        cacheHitRate: 0.3
      }
    }
  ];
  
  testContexts.forEach(({ name, context }) => {
    console.log(UnicodeTableFormatter.colorize(`\n🔍 Analyzing: ${name}`, DesignSystem.text.primary));
    
    const metrics = TensionAnalyzer.analyzeContext('test-context', context);
    const description = TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend);
    const recommendations = TensionAnalyzer.getRecommendations(metrics);
    const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);
    
    console.log(`  Tension: ${metrics.value}% (${description})`);
    console.log(`  Trend: ${metrics.trend}`);
    console.log(`  Confidence: ${metrics.metadata.analysisConfidence}%`);
    console.log(`  Contributors: ${metrics.contributors.length}`);
    console.log(`  Status: ${colors.status}`);
    
    console.log(UnicodeTableFormatter.colorize('  Top Contributors:', DesignSystem.text.secondary));
    metrics.contributors
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .forEach(c => {
        console.log(`    ${c.source}: ${c.value.toFixed(1)}% (weight: ${c.weight}) → ${c.impact.toFixed(1)}%`);
      });
    
    console.log(UnicodeTableFormatter.colorize('  Recommendations:', DesignSystem.text.secondary));
    recommendations.slice(0, 2).forEach(r => {
      console.log(`    • ${r}`);
    });
  });
  
  // Demonstrate real-time monitoring
  console.log(UnicodeTableFormatter.colorize('\n🔄 REAL-TIME MONITORING DEMONSTRATION:', DesignSystem.text.accent.blue));
  
  const monitoringContext = new TensionMonitoringContext('demo-context', 'ENTERPRISE', 'duoplus');
  
  console.log(UnicodeTableFormatter.colorize('📡 Starting real-time monitoring...', DesignSystem.text.primary));
  
  // Subscribe to updates
  const unsubscribe = monitoringContext.subscribe((metrics) => {
    const description = TensionAnalyzer.getTensionDescription(metrics.value, metrics.trend);
    const topContributor = metrics.contributors.sort((a, b) => b.impact - a.impact)[0];
    
    console.log(UnicodeTableFormatter.colorize(
      `📈 Update: ${metrics.value}% - ${description} | Top: ${topContributor.source} (${topContributor.impact.toFixed(1)}%)`,
      metrics.value > 70 ? DesignSystem.status.downtime : 
      metrics.value > 40 ? DesignSystem.status.degraded : DesignSystem.status.operational
    ));
  });
  
  // Let it run for a few seconds to show updates
  setTimeout(() => {
    monitoringContext.stop();
    unsubscribe();
    console.log(UnicodeTableFormatter.colorize('🛑 Real-time monitoring stopped', DesignSystem.text.secondary));
  }, 8000);
  
  console.log(EmpireProDashboard.generateFooter());
  
  console.log('\n🎉 TENSION METRICS SYSTEM DEMO COMPLETE!');
  console.log('✅ Weighted tension analysis with multiple contributors');
  console.log('✅ Trend detection with historical tracking');
  console.log('✅ Real-time monitoring with WebSocket integration');
  console.log('✅ Color-aware visualization based on tension levels');
  console.log('✅ Intelligent recommendations based on system state');
  console.log('✅ Comprehensive API with multiple endpoints');
  
  console.log('\n📋 TENSION METRICS FEATURES:');
  console.log('  📊 Weighted Analysis: Error rate, latency, memory, CPU, queue, disk, network, cache');
  console.log('  📈 Trend Detection: Improving, stable, or degrading based on historical data');
  console.log('  🎯 Confidence Scoring: Analysis confidence based on data quality and completeness');
  console.log('  🎨 Color Integration: Dynamic colors based on tension and trend');
  console.log('  💡 Recommendations: Actionable insights based on top contributors');
  console.log('  📚 Historical Tracking: Up to 100 data points for trend analysis');
  
  console.log('\n🔧 USAGE EXAMPLES:');
  console.log('  // Analyze system tension');
  console.log('  const metrics = TensionAnalyzer.analyzeContext(contextKey, systemContext);');
  console.log('  console.log(metrics.value, metrics.trend, metrics.contributors);');
  console.log('');
  console.log('  // Get recommendations');
  console.log('  const recommendations = TensionAnalyzer.getRecommendations(metrics);');
  console.log('');
  console.log('  // Generate colors from tension');
  console.log('  const colors = TensionAwareColorSystem.generateColorsFromMetrics(metrics);');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(UnicodeTableFormatter.colorize('\n🛑 Shutting down TensionMetrics server...', DesignSystem.text.secondary));
    wsServer.close();
    httpServer.stop();
    process.exit(0);
  });
}

// Start the TensionMetrics demonstration
demonstrateTensionMetrics().catch(error => {
  console.error(UnicodeTableFormatter.colorize(`❌ Failed to start TensionMetrics: ${error}`, DesignSystem.status.downtime));
  process.exit(1);
});
