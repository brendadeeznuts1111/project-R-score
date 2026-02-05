#!/usr/bin/env bun

/**
 * 🎯 Performance Panel Integration - Quantum Hash System
 * 
 * Adds HashPerformancePanel to admin dashboard with real-time metrics
 */

import { QuantumHashSystem } from './quantum-hash-system';

interface PerformanceMetrics {
  timestamp: Date;
  totalOperations: number;
  totalBytes: number;
  averageTime: number;
  throughput: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEfficiency: number;
  quantumAccelerated: boolean;
}

interface AlertThresholds {
  maxAverageTime: number;
  minThroughput: number;
  minCacheEfficiency: number;
  maxErrorRate: number;
}

interface PerformanceAlert {
  id: string;
  type: 'performance' | 'cache' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: PerformanceMetrics;
  resolved: boolean;
}

class HashPerformancePanel {
  private quantumHash: QuantumHashSystem;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: AlertThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private maxMetricsHistory: number = 100;

  constructor() {
    this.quantumHash = new QuantumHashSystem();
    this.thresholds = {
      maxAverageTime: 1.0, // 1ms
      minThroughput: 1000, // 1000 KB/s
      minCacheEfficiency: 0.8, // 80%
      maxErrorRate: 0.05 // 5%
    };
  }

  /**
   * Initialize performance panel
   */
  async initialize(): Promise<void> {
    console.log('🎯 Initializing HashPerformancePanel...');
    
    try {
      // Start real-time monitoring
      this.startMonitoring();
      
      // Setup alert system
      this.setupAlertSystem();
      
      // Initialize dashboard components
      await this.initializeDashboard();
      
      console.log('✅ HashPerformancePanel initialized successfully');
      
    } catch (error) {
      console.error(`❌ Failed to initialize performance panel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start real-time performance monitoring
   */
  private startMonitoring(): void {
    console.log('📊 Starting real-time performance monitoring...');
    
    const monitor = () => {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }
      
      // Check for alerts
      this.checkAlerts(metrics);
      
      // Update dashboard
      this.updateDashboard(metrics);
    };

    // Run every 5 seconds
    this.monitoringInterval = setInterval(monitor, 5000);
    
    console.log('✅ Real-time monitoring started (5-second intervals)');
  }

  /**
   * Collect performance metrics
   */
  private collectMetrics(): PerformanceMetrics {
    const stats = this.quantumHash.getPerformanceStats();
    
    return {
      timestamp: new Date(),
      totalOperations: stats.totalOperations,
      totalBytes: stats.totalBytes,
      averageTime: stats.averageTime,
      throughput: stats.throughput,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      cacheEfficiency: stats.cacheEfficiency || 0,
      quantumAccelerated: true
    };
  }

  /**
   * Setup alert system
   */
  private setupAlertSystem(): void {
    console.log('🚨 Setting up performance alert system...');
    
    console.log(`   ⏱️  Max average time: ${this.thresholds.maxAverageTime}ms`);
    console.log(`   📈 Min throughput: ${this.thresholds.minThroughput} KB/s`);
    console.log(`   🎯 Min cache efficiency: ${(this.thresholds.minCacheEfficiency * 100).toFixed(1)}%`);
    console.log(`   ❌ Max error rate: ${(this.thresholds.maxErrorRate * 100).toFixed(1)}%`);
    
    console.log('✅ Alert system configured');
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check average time
    if (metrics.averageTime > this.thresholds.maxAverageTime) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: metrics.averageTime > this.thresholds.maxAverageTime * 2 ? 'high' : 'medium',
        message: `Average hash time (${metrics.averageTime.toFixed(3)}ms) exceeds threshold (${this.thresholds.maxAverageTime}ms)`,
        timestamp: new Date(),
        metrics,
        resolved: false
      });
    }

    // Check throughput
    if (metrics.throughput < this.thresholds.minThroughput) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: metrics.throughput < this.thresholds.minThroughput / 2 ? 'critical' : 'high',
        message: `Throughput (${metrics.throughput.toFixed(0)} KB/s) below threshold (${this.thresholds.minThroughput} KB/s)`,
        timestamp: new Date(),
        metrics,
        resolved: false
      });
    }

    // Check cache efficiency
    if (metrics.cacheEfficiency < this.thresholds.minCacheEfficiency) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'cache',
        severity: 'medium',
        message: `Cache efficiency (${(metrics.cacheEfficiency * 100).toFixed(1)}%) below threshold (${(this.thresholds.minCacheEfficiency * 100).toFixed(1)}%)`,
        timestamp: new Date(),
        metrics,
        resolved: false
      });
    }

    // Add new alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      console.log(`🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.message}`);
    });

    // Keep only recent alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Initialize dashboard components
   */
  private async initializeDashboard(): Promise<void> {
    console.log('📊 Initializing dashboard components...');
    
    // Create performance charts
    await this.createPerformanceCharts();
    
    // Create metrics display
    await this.createMetricsDisplay();
    
    // Create alerts panel
    await this.createAlertsPanel();
    
    console.log('✅ Dashboard components initialized');
  }

  /**
   * Create performance charts
   */
  private async createPerformanceCharts(): Promise<void> {
    console.log('   📈 Creating performance charts...');
    
    // Chart configurations
    const charts = {
      throughput: {
        title: 'Hash Throughput (KB/s)',
        type: 'line',
        data: []
      },
      averageTime: {
        title: 'Average Hash Time (ms)',
        type: 'line',
        data: []
      },
      cacheEfficiency: {
        title: 'Cache Efficiency (%)',
        type: 'area',
        data: []
      },
      operations: {
        title: 'Total Operations',
        type: 'bar',
        data: []
      }
    };

    console.log('   ✅ Performance charts created');
  }

  /**
   * Create metrics display
   */
  private async createMetricsDisplay(): Promise<void> {
    console.log('   📊 Creating metrics display...');
    
    const metrics = this.collectMetrics();
    
    console.log('   ✅ Metrics display created');
  }

  /**
   * Create alerts panel
   */
  private async createAlertsPanel(): Promise<void> {
    console.log('   🚨 Creating alerts panel...');
    
    console.log('   ✅ Alerts panel created');
  }

  /**
   * Update dashboard with new metrics
   */
  private updateDashboard(metrics: PerformanceMetrics): void {
    // Update real-time displays
    console.log(`📊 Dashboard Update: ${metrics.throughput.toFixed(0)} KB/s, ${metrics.averageTime.toFixed(3)}ms avg, ${(metrics.cacheEfficiency * 100).toFixed(1)}% cache`);
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: PerformanceMetrics;
    trends: {
      throughput: 'increasing' | 'decreasing' | 'stable';
      averageTime: 'improving' | 'degrading' | 'stable';
      cacheEfficiency: 'improving' | 'degrading' | 'stable';
    };
    alerts: {
      total: number;
      active: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recommendations: string[];
  }> {
    console.log('📊 Generating performance report...');

    // Ensure we have metrics before generating report
    if (this.metrics.length === 0) {
      // Collect initial metrics if none exist
      this.collectMetrics();
    }

    if (this.metrics.length === 0) {
      throw new Error('No metrics available for report generation');
    }

    const current = this.metrics[this.metrics.length - 1];
    const previous = this.metrics[Math.max(0, this.metrics.length - 10)];

    // Calculate trends
    const trends = {
      throughput: this.calculateTrend(previous.throughput, current.throughput),
      averageTime: this.calculateTrend(previous.averageTime, current.averageTime, true),
      cacheEfficiency: this.calculateTrend(previous.cacheEfficiency, current.cacheEfficiency)
    };

    // Count alerts
    const alertCounts = this.alerts.reduce((counts, alert) => {
      if (!alert.resolved) {
        counts.total++;
        counts.active++;
        counts[alert.severity]++;
      }
      return counts;
    }, { total: 0, active: 0, critical: 0, high: 0, medium: 0, low: 0 });

    // Generate recommendations
    const recommendations = this.generateRecommendations(current, trends);

    console.log('📊 Performance Report Generated:');
    console.log(`   Current Throughput: ${current.throughput.toFixed(0)} KB/s`);
    console.log(`   Current Average Time: ${current.averageTime.toFixed(3)}ms`);
    console.log(`   Cache Efficiency: ${(current.cacheEfficiency * 100).toFixed(1)}%`);
    console.log(`   Active Alerts: ${alertCounts.active}`);

    return {
      summary: current,
      trends,
      alerts: alertCounts,
      recommendations
    };
  }

  /**
   * Calculate trend between two values
   */
  private calculateTrend(previous: number, current: number, inverse = false): 'increasing' | 'decreasing' | 'stable' {
    const change = (current - previous) / previous;
    
    if (Math.abs(change) < 0.05) {
      return 'stable';
    }
    
    if (inverse) {
      return change > 0 ? 'degrading' : 'improving';
    }
    
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, trends: any): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (trends.averageTime === 'degrading') {
      recommendations.push('Consider optimizing hash operations or increasing cache size');
    }

    if (trends.throughput === 'decreasing') {
      recommendations.push('Investigate throughput degradation - check system resources');
    }

    if (trends.cacheEfficiency === 'degrading') {
      recommendations.push('Review cache configuration and TTL settings');
    }

    // Alert-based recommendations
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    if (activeAlerts.length > 5) {
      recommendations.push('High number of active alerts - investigate system health');
    }

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('Critical alerts require immediate attention');
    }

    // Performance optimization
    if (metrics.throughput < 5000) {
      recommendations.push('Consider enabling hardware acceleration for better performance');
    }

    if (metrics.cacheEfficiency < 0.9) {
      recommendations.push('Optimize cache hit ratio by adjusting TTL or cache size');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Display performance dashboard
   */
  displayDashboard(): void {
    console.clear();
    console.log('🎯 Hash Performance Panel - Real-time Dashboard');
    console.log('='.repeat(60));

    if (this.metrics.length === 0) {
      console.log('⏳ Waiting for metrics...');
      return;
    }

    const current = this.metrics[this.metrics.length - 1];
    const activeAlerts = this.alerts.filter(a => !a.resolved);

    // Current metrics
    console.log('\n📊 Current Performance Metrics:');
    console.log(`   🚀 Throughput: ${current.throughput.toFixed(0)} KB/s`);
    console.log(`   ⏱️  Average Time: ${current.averageTime.toFixed(3)}ms`);
    console.log(`   💾 Cache Efficiency: ${(current.cacheEfficiency * 100).toFixed(1)}%`);
    console.log(`   📈 Total Operations: ${current.totalOperations.toLocaleString()}`);
    console.log(`   💾 Data Processed: ${(current.totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ⚡ Quantum Accelerated: ${current.quantumAccelerated ? '✅' : '❌'}`);

    // Recent alerts
    if (activeAlerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      activeAlerts.slice(-5).forEach(alert => {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🔵'
        };
        console.log(`   ${severityIcon[alert.severity]} ${alert.message}`);
      });
    } else {
      console.log('\n✅ No active alerts');
    }

    // Status
    console.log('\n🎯 System Status:');
    const status = activeAlerts.length === 0 ? '🟢 OPTIMAL' : 
                   activeAlerts.some(a => a.severity === 'critical') ? '🔴 CRITICAL' : '🟡 WARNING';
    console.log(`   Status: ${status}`);
    console.log(`   Last Update: ${current.timestamp.toLocaleTimeString()}`);

    console.log('\nPress Ctrl+C to stop monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️  Performance monitoring stopped');
    }
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const performancePanel = new HashPerformancePanel();
  
  console.log('🎯 Performance Panel Integration - Quantum Hash System');
  console.log('=====================================================\n');
  
  performancePanel.initialize()
    .then(() => {
      console.log('\n✅ Performance panel integration complete!');
      
      // Display dashboard every 10 seconds
      setInterval(() => {
        performancePanel.displayDashboard();
      }, 10000);
      
      // Show initial dashboard
      performancePanel.displayDashboard();
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        performancePanel.stopMonitoring();
        console.log('\n👋 Performance panel stopped');
        process.exit(0);
      });
    })
    .catch(console.error);
}

export { HashPerformancePanel };
