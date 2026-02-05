#!/usr/bin/env bun
/**
 * Log Analytics and Monitoring System
 * 
 * Provides real-time analysis of log data with:
 * - Error pattern detection
 * - Performance metrics
 * - Trend analysis
 * - Alert generation
 * - Dashboard data
 */

import { readFile, writeFile, exists } from 'fs/promises';
import { join } from 'path';
import { LogEntry, LogLevel } from './enhanced-logger';

export interface AnalyticsConfig {
    logFile: string;
    alertThresholds: {
        errorRate: number; // percentage
        responseTime: number; // milliseconds
        memoryUsage: number; // percentage
        diskSpace: number; // percentage
    };
    timeWindows: {
        minute: number;
        hour: number;
        day: number;
    };
    enableRealTime: boolean;
    enablePredictions: boolean;
}

export interface LogMetrics {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    errorRate: number;
    averageResponseTime: number;
    peakMemoryUsage: number;
    trends: {
        errors: number[];
        performance: number[];
        volume: number[];
    };
    alerts: Alert[];
}

export interface Alert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'error_rate' | 'performance' | 'resource' | 'pattern';
    message: string;
    timestamp: string;
    context: Record<string, any>;
    resolved: boolean;
}

export interface PatternMatch {
    pattern: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    samples: string[];
}

export class LogAnalytics {
    private config: AnalyticsConfig;
    private alerts: Alert[] = [];
    private patterns: Map<string, PatternMatch> = new Map();
    private metrics: LogMetrics | null = null;
    private lastAnalysis = new Date(0);

    constructor(config: Partial<AnalyticsConfig> = {}) {
        this.config = {
            logFile: join(import.meta.dir, '../vault-enhanced.log'),
            alertThresholds: {
                errorRate: 5.0,
                responseTime: 1000,
                memoryUsage: 80.0,
                diskSpace: 90.0
            },
            timeWindows: {
                minute: 60 * 1000,
                hour: 60 * 60 * 1000,
                day: 24 * 60 * 60 * 1000
            },
            enableRealTime: true,
            enablePredictions: true,
            ...config
        };
    }

    /**
     * Analyze log file and generate metrics
     */
    async analyze(): Promise<LogMetrics> {
        const startTime = Date.now();

        try {
            const logContent = await this.readLogFile();
            const entries = this.parseLogEntries(logContent);

            this.metrics = this.calculateMetrics(entries);
            this.detectPatterns(entries);
            this.generateAlerts(this.metrics);
            this.lastAnalysis = new Date();

            await this.log.info('Log analysis completed', {
                entriesProcessed: entries.length,
                metricsGenerated: Object.keys(this.metrics).length,
                alertsGenerated: this.metrics.alerts.length,
                duration: Date.now() - startTime
            });

            return this.metrics;
        } catch (error) {
            await this.log.error('Log analysis failed', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Get real-time metrics for dashboard
     */
    async getRealTimeMetrics(): Promise<LogMetrics> {
        if (!this.metrics || Date.now() - this.lastAnalysis.getTime() > 60000) {
            return await this.analyze();
        }
        return this.metrics;
    }

    /**
     * Search logs with filters
     */
    async search(filters: {
        level?: LogLevel;
        category?: string;
        source?: string;
        message?: string;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): Promise<LogEntry[]> {
        const logContent = await this.readLogFile();
        const entries = this.parseLogEntries(logContent);

        return entries.filter(entry => {
            if (filters.level && entry.level !== filters.level) return false;
            if (filters.category && entry.category !== filters.category) return false;
            if (filters.source && entry.source !== filters.source) return false;
            if (filters.message && !entry.message.includes(filters.message)) return false;
            if (filters.startTime && new Date(entry.timestamp) < filters.startTime) return false;
            if (filters.endTime && new Date(entry.timestamp) > filters.endTime) return false;
            return true;
        }).slice(0, filters.limit || 1000);
    }

    /**
     * Get error trends over time
     */
    async getErrorTrends(hours: number = 24): Promise<{
        timestamps: string[];
        errorCounts: number[];
        warningCounts: number[];
    }> {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

        const entries = await this.search({
            startTime,
            endTime
        });

        const hourlyBuckets = new Map<string, { errors: number; warnings: number }>();

        entries.forEach(entry => {
            const hour = new Date(entry.timestamp).toISOString().substring(0, 13) + ':00:00.000Z';

            if (!hourlyBuckets.has(hour)) {
                hourlyBuckets.set(hour, { errors: 0, warnings: 0 });
            }

            const bucket = hourlyBuckets.get(hour)!;
            if (entry.level === LogLevel.ERROR) bucket.errors++;
            if (entry.level === LogLevel.WARN) bucket.warnings++;
        });

        const timestamps = Array.from(hourlyBuckets.keys()).sort();
        const errorCounts = timestamps.map(t => hourlyBuckets.get(t)!.errors);
        const warningCounts = timestamps.map(t => hourlyBuckets.get(t)!.warnings);

        return { timestamps, errorCounts, warningCounts };
    }

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(): Promise<{
        averageResponseTime: number;
        slowestOperations: Array<{ operation: string; duration: number; timestamp: string }>;
        responseTimeTrend: number[];
    }> {
        const entries = await this.search({ limit: 10000 });
        const entriesWithDuration = entries.filter(e => e.duration !== undefined);

        if (entriesWithDuration.length === 0) {
            return {
                averageResponseTime: 0,
                slowestOperations: [],
                responseTimeTrend: []
            };
        }

        const averageResponseTime = entriesWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / entriesWithDuration.length;

        const slowestOperations = entriesWithDuration
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 10)
            .map(e => ({
                operation: e.message,
                duration: e.duration || 0,
                timestamp: e.timestamp
            }));

        // Calculate trend (last 50 entries with duration)
        const recentEntries = entriesWithDuration.slice(-50);
        const responseTimeTrend = recentEntries.map(e => e.duration || 0);

        return {
            averageResponseTime,
            slowestOperations,
            responseTimeTrend
        };
    }

    /**
     * Detect recurring error patterns
     */
    private detectPatterns(entries: LogEntry[]): void {
        const errorEntries = entries.filter(e => e.level >= LogLevel.ERROR);

        // Simple pattern detection - group by message similarity
        const messageGroups = new Map<string, LogEntry[]>();

        errorEntries.forEach(entry => {
            // Normalize message for pattern matching
            const normalized = entry.message
                .replace(/\d+/g, 'N') // Replace numbers with N
                .replace(/['"]/g, '') // Remove quotes
                .toLowerCase()
                .trim();

            if (!messageGroups.has(normalized)) {
                messageGroups.set(normalized, []);
            }
            messageGroups.get(normalized)!.push(entry);
        });

        // Update pattern matches
        messageGroups.forEach((entries, pattern) => {
            if (entries.length >= 3) { // Only track patterns that appear 3+ times
                const existing = this.patterns.get(pattern);

                if (existing) {
                    existing.count = entries.length;
                    existing.lastSeen = entries[entries.length - 1].timestamp;
                    if (existing.samples.length < 5) {
                        existing.samples.push(entries[0].message);
                    }
                } else {
                    this.patterns.set(pattern, {
                        pattern,
                        count: entries.length,
                        firstSeen: entries[0].timestamp,
                        lastSeen: entries[entries.length - 1].timestamp,
                        samples: entries.slice(0, 5).map(e => e.message)
                    });
                }
            }
        });
    }

    /**
     * Calculate comprehensive metrics
     */
    private calculateMetrics(entries: LogEntry[]): LogMetrics {
        const byLevel = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 0,
            [LogLevel.WARN]: 0,
            [LogLevel.ERROR]: 0,
            [LogLevel.CRITICAL]: 0
        };

        const byCategory: Record<string, number> = {};
        const bySource: Record<string, number> = {};
        let totalResponseTime = 0;
        let responseTimeCount = 0;
        let peakMemoryUsage = 0;

        entries.forEach(entry => {
            byLevel[entry.level]++;

            byCategory[entry.category || 'unknown'] = (byCategory[entry.category || 'unknown'] || 0) + 1;
            bySource[entry.source || 'unknown'] = (bySource[entry.source || 'unknown'] || 0) + 1;

            if (entry.duration !== undefined) {
                totalResponseTime += entry.duration;
                responseTimeCount++;
            }

            if (entry.metadata?.memory?.heapUsed) {
                peakMemoryUsage = Math.max(peakMemoryUsage, entry.metadata.memory.heapUsed);
            }
        });

        const total = entries.length;
        const errorCount = byLevel[LogLevel.ERROR] + byLevel[LogLevel.CRITICAL];
        const errorRate = total > 0 ? (errorCount / total) * 100 : 0;
        const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

        return {
            total,
            byLevel,
            byCategory,
            bySource,
            errorRate,
            averageResponseTime,
            peakMemoryUsage,
            trends: {
                errors: [], // Would be calculated based on historical data
                performance: [],
                volume: []
            },
            alerts: this.alerts
        };
    }

    /**
     * Generate alerts based on thresholds
     */
    private generateAlerts(metrics: LogMetrics): void {
        this.alerts = [];

        // Error rate alert
        if (metrics.errorRate > this.config.alertThresholds.errorRate) {
            this.alerts.push({
                id: `error_rate_${Date.now()}`,
                severity: metrics.errorRate > 10 ? 'critical' : 'high',
                type: 'error_rate',
                message: `Error rate is ${metrics.errorRate.toFixed(2)}% (threshold: ${this.config.alertThresholds.errorRate}%)`,
                timestamp: new Date().toISOString(),
                context: { errorRate: metrics.errorRate, threshold: this.config.alertThresholds.errorRate },
                resolved: false
            });
        }

        // Performance alert
        if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
            this.alerts.push({
                id: `performance_${Date.now()}`,
                severity: 'medium',
                type: 'performance',
                message: `Average response time is ${metrics.averageResponseTime.toFixed(2)}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
                timestamp: new Date().toISOString(),
                context: { responseTime: metrics.averageResponseTime, threshold: this.config.alertThresholds.responseTime },
                resolved: false
            });
        }

        // Pattern alert for recurring errors
        const activePatterns = Array.from(this.patterns.values()).filter(p =>
            Date.now() - new Date(p.lastSeen).getTime() < 60 * 60 * 1000 // Last hour
        );

        if (activePatterns.length > 0) {
            this.alerts.push({
                id: `pattern_${Date.now()}`,
                severity: 'medium',
                type: 'pattern',
                message: `${activePatterns.length} recurring error patterns detected`,
                timestamp: new Date().toISOString(),
                context: { patterns: activePatterns.map(p => ({ pattern: p.pattern, count: p.count })) },
                resolved: false
            });
        }
    }

    /**
     * Read and parse log file
     */
    private async readLogFile(): Promise<string> {
        try {
            if (!await exists(this.config.logFile)) {
                return '';
            }
            return await readFile(this.config.logFile, 'utf-8');
        } catch (error) {
            await this.log.error('Failed to read log file', { error: error instanceof Error ? error.message : String(error) });
            return '';
        }
    }

    /**
     * Parse log entries from JSON lines
     */
    private parseLogEntries(content: string): LogEntry[] {
        const lines = content.trim().split('\n').filter(line => line.trim());
        const entries: LogEntry[] = [];

        lines.forEach(line => {
            try {
                const entry = JSON.parse(line) as LogEntry;
                entries.push(entry);
            } catch {
                // Skip invalid lines
            }
        });

        return entries;
    }

    /**
     * Get detected patterns
     */
    getPatterns(): PatternMatch[] {
        return Array.from(this.patterns.values()).sort((a, b) => b.count - a.count);
    }

    /**
     * Get active alerts
     */
    getAlerts(): Alert[] {
        return this.alerts.filter(alert => !alert.resolved);
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(alertId: string): Promise<void> {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            await this.log.info('Alert resolved', { alertId, type: alert.type });
        }
    }

    // Enhanced logger instance
    private log = {
        info: async (message: string, context?: Record<string, any>) => {
            // Would use the enhanced logger here
            console.log(`[Analytics] ${message}`, context);
        },
        error: async (message: string, context?: Record<string, any>) => {
            console.error(`[Analytics] ${message}`, context);
        }
    };
}

// Export singleton instance
export const analytics = new LogAnalytics();
