/**
 * Real-Time Performance Monitoring System
 * 
 * Comprehensive observability stack with predictive analytics
 * and automated alerting for achieving Industry Dominance
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
    timestamp: number;
    operation: string;
    time: number;
    memory: number;
    cpu: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    withinBudget: boolean;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
    operation: string;
    threshold: number;
    metric: 'time' | 'memory' | 'cpu' | 'errorRate';
    severity: 'low' | 'medium' | 'high' | 'critical';
    cooldown: number; // Cooldown period in milliseconds
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
    operation: string;
    trend: 'improving' | 'stable' | 'degrading';
    confidence: number;
    prediction: number;
    timeWindow: number;
}

/**
 * Real-time performance monitor
 */
export class RealTimePerformanceMonitor extends EventEmitter {
    private metrics: PerformanceMetrics[] = [];
    private alerts: AlertConfig[] = [];
    private lastAlerts: Map<string, number> = new Map();
    private isMonitoring = false;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private trendAnalysis: Map<string, PerformanceTrend> = new Map();

    constructor() {
        super();
        this.setupDefaultAlerts();
    }

    /**
     * Start real-time monitoring
     */
    startMonitoring(intervalMs: number = 1000): void {
        if (this.isMonitoring) {
            console.log('📊 Monitoring already active');
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
        }, intervalMs);

        console.log(`🚀 Real-time performance monitoring started (${intervalMs}ms interval)`);
        this.emit('monitoring:started');
    }

    /**
     * Stop real-time monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('⏹️ Real-time performance monitoring stopped');
        this.emit('monitoring:stopped');
    }

    /**
     * Record performance metrics
     */
    recordMetrics(metrics: PerformanceMetrics): void {
        this.metrics.push(metrics);

        // Keep only last 10000 metrics
        if (this.metrics.length > 10000) {
            this.metrics = this.metrics.slice(-10000);
        }

        // Check for alerts
        this.checkAlerts(metrics);

        // Update trend analysis
        this.updateTrendAnalysis(metrics.operation);

        // Emit metrics event
        this.emit('metrics:recorded', metrics);
    }

    /**
     * Setup default alert configurations
     */
    private setupDefaultAlerts(): void {
        this.alerts = [
            {
                operation: 'validation.string',
                threshold: 10,
                metric: 'time',
                severity: 'high',
                cooldown: 30000
            },
            {
                operation: 'validation.array',
                threshold: 15,
                metric: 'time',
                severity: 'high',
                cooldown: 30000
            },
            {
                operation: 'file.read',
                threshold: 20,
                metric: 'time',
                severity: 'medium',
                cooldown: 60000
            },
            {
                operation: 'template.processing',
                threshold: 50,
                metric: 'time',
                severity: 'medium',
                cooldown: 60000
            },
            {
                operation: 'bulk.processing',
                threshold: 300,
                metric: 'time',
                severity: 'low',
                cooldown: 120000
            },
            {
                operation: 'memory',
                threshold: 500,
                metric: 'memory',
                severity: 'critical',
                cooldown: 10000
            },
            {
                operation: 'cpu',
                threshold: 80,
                metric: 'cpu',
                severity: 'high',
                cooldown: 15000
            }
        ];
    }

    /**
     * Check for performance alerts
     */
    private checkAlerts(metrics: PerformanceMetrics): void {
        const now = Date.now();

        for (const alert of this.alerts) {
            const alertKey = `${alert.operation}-${alert.metric}`;
            const lastAlert = this.lastAlerts.get(alertKey) || 0;

            // Check cooldown
            if (now - lastAlert < alert.cooldown) continue;

            // Check threshold
            let value = 0;
            if (alert.metric === 'time') value = metrics.time;
            else if (alert.metric === 'memory') value = metrics.memory;
            else if (alert.metric === 'cpu') value = metrics.cpu;

            if (value > alert.threshold) {
                this.triggerAlert(alert, metrics, value);
                this.lastAlerts.set(alertKey, now);
            }
        }
    }

    /**
     * Trigger performance alert
     */
    private triggerAlert(alert: AlertConfig, metrics: PerformanceMetrics, value: number): void {
        const alertData = {
            alert,
            metrics,
            value,
            timestamp: Date.now()
        };

        console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]:`);
        console.warn(`   Operation: ${alert.operation}`);
        console.warn(`   Metric: ${alert.metric} = ${value.toFixed(2)} (threshold: ${alert.threshold})`);
        console.warn(`   Time: ${metrics.time.toFixed(2)}ms | Memory: ${metrics.memory.toFixed(2)}MB | CPU: ${metrics.cpu.toFixed(1)}%`);

        this.emit('alert:triggered', alertData);
    }

    /**
     * Perform system health check
     */
    private performHealthCheck(): void {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute

        if (recentMetrics.length === 0) return;

        const avgTime = recentMetrics.reduce((sum, m) => sum + m.time, 0) / recentMetrics.length;
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
        const avgCPU = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
        const withinBudget = recentMetrics.filter(m => m.withinBudget).length;
        const budgetPercentage = (withinBudget / recentMetrics.length) * 100;

        const healthStatus = {
            timestamp: now,
            averageTime: avgTime,
            averageMemory: avgMemory,
            averageCPU: avgCPU,
            budgetCompliance: budgetPercentage,
            operationsPerMinute: recentMetrics.length,
            status: budgetPercentage >= 95 ? 'healthy' : budgetPercentage >= 80 ? 'warning' : 'critical'
        };

        this.emit('health:check', healthStatus);

        if (healthStatus.status === 'critical') {
            console.error('🚨 System Health Critical - Immediate attention required');
        } else if (healthStatus.status === 'warning') {
            console.warn('⚠️ System Health Warning - Performance degradation detected');
        }
    }

    /**
     * Update trend analysis for an operation
     */
    private updateTrendAnalysis(operation: string): void {
        const operationMetrics = this.metrics
            .filter(m => m.operation === operation)
            .slice(-100); // Last 100 measurements

        if (operationMetrics.length < 10) return;

        // Simple linear regression for trend analysis
        const times = operationMetrics.map(m => m.time);
        const n = times.length;
        const sumX = (n * (n - 1)) / 2; // Sum of indices
        const sumY = times.reduce((sum, time) => sum + time, 0);
        const sumXY = times.reduce((sum, time, index) => sum + time * index, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Determine trend
        let trend: 'improving' | 'stable' | 'degrading';
        if (Math.abs(slope) < 0.01) {
            trend = 'stable';
        } else if (slope < 0) {
            trend = 'improving';
        } else {
            trend = 'degrading';
        }

        // Calculate confidence (simplified)
        const avgTime = sumY / n;
        const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / n;
        const confidence = Math.max(0, 1 - (variance / (avgTime * avgTime)));

        // Predict next value
        const prediction = slope * n + intercept;

        this.trendAnalysis.set(operation, {
            operation,
            trend,
            confidence,
            prediction,
            timeWindow: operationMetrics.length
        });
    }

    /**
     * Get real-time dashboard data
     */
    getDashboardData(): {
        currentMetrics: PerformanceMetrics[];
        healthStatus: any;
        trends: PerformanceTrend[];
        recentAlerts: any[];
        performanceScore: number;
    } {
        const now = Date.now();
        const currentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes
        const trends = Array.from(this.trendAnalysis.values());

        // Calculate performance score
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute
        const score = recentMetrics.length > 0
            ? (recentMetrics.filter(m => m.withinBudget).length / recentMetrics.length) * 100
            : 100;

        return {
            currentMetrics,
            healthStatus: this.getLatestHealthStatus(),
            trends,
            recentAlerts: this.getRecentAlerts(),
            performanceScore: score
        };
    }

    /**
     * Get latest health status
     */
    private getLatestHealthStatus(): any {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000);

        if (recentMetrics.length === 0) {
            return {
                status: 'unknown',
                message: 'No recent metrics available'
            };
        }

        const avgTime = recentMetrics.reduce((sum, m) => sum + m.time, 0) / recentMetrics.length;
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
        const avgCPU = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
        const withinBudget = recentMetrics.filter(m => m.withinBudget).length;
        const budgetPercentage = (withinBudget / recentMetrics.length) * 100;

        return {
            status: budgetPercentage >= 95 ? 'healthy' : budgetPercentage >= 80 ? 'warning' : 'critical',
            averageTime: avgTime,
            averageMemory: avgMemory,
            averageCPU: avgCPU,
            budgetCompliance: budgetPercentage,
            operationsPerMinute: recentMetrics.length
        };
    }

    /**
     * Get recent alerts
     */
    private getRecentAlerts(): any[] {
        // This would be implemented with actual alert storage
        return [];
    }

    /**
     * Generate performance predictions
     */
    generatePredictions(timeHorizonMinutes: number = 60): Array<{
        operation: string;
        currentPerformance: number;
        predictedPerformance: number;
        trend: string;
        confidence: number;
        recommendation: string;
    }> {
        const predictions: Array<{
            operation: string;
            currentPerformance: number;
            predictedPerformance: number;
            trend: string;
            confidence: number;
            recommendation: string;
        }> = [];

        for (const [operation, trend] of this.trendAnalysis) {
            const recentMetrics = this.metrics
                .filter(m => m.operation === operation)
                .slice(-10);

            if (recentMetrics.length === 0) continue;

            const currentPerformance = recentMetrics.reduce((sum, m) => sum + m.time, 0) / recentMetrics.length;
            const predictedPerformance = trend.prediction;

            let recommendation: string;
            if (trend.trend === 'degrading' && trend.confidence > 0.7) {
                recommendation = '⚠️ Optimize immediately - performance degrading';
            } else if (trend.trend === 'improving') {
                recommendation = '✅ Continue current optimization strategy';
            } else {
                recommendation = '📊 Monitor closely - performance stable';
            }

            predictions.push({
                operation,
                currentPerformance,
                predictedPerformance,
                trend: trend.trend,
                confidence: trend.confidence,
                recommendation
            });
        }

        return predictions;
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics(timeRangeMinutes: number = 60): PerformanceMetrics[] {
        const cutoff = Date.now() - (timeRangeMinutes * 60 * 1000);
        return this.metrics.filter(m => m.timestamp >= cutoff);
    }
}

/**
 * Global real-time monitor instance
 */
export const realTimeMonitor = new RealTimePerformanceMonitor();

/**
 * Initialize real-time monitoring
 */
export function initializeRealTimeMonitoring(): void {
    realTimeMonitor.startMonitoring(1000);

    // Setup event listeners
    realTimeMonitor.on('alert:triggered', (alert) => {
        console.log('🚨 Performance alert triggered:', alert.alert.operation);
    });

    realTimeMonitor.on('health:check', (health) => {
        if (health.status !== 'healthy') {
            console.log(`🏥 Health status: ${health.status} (${health.budgetCompliance.toFixed(1)}% compliance)`);
        }
    });

    console.log('🚀 Real-time performance monitoring initialized for Industry Dominance');
}

/**
 * Get real-time dashboard data
 */
export function getRealTimeDashboard() {
    return realTimeMonitor.getDashboardData();
}

/**
 * Generate performance predictions
 */
export function generatePerformancePredictions(timeHorizonMinutes: number = 60) {
    return realTimeMonitor.generatePredictions(timeHorizonMinutes);
}
