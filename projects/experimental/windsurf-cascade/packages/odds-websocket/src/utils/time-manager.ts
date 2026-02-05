/**
 * Enhanced Time Management Utilities for Bun Applications
 * 
 * This module provides centralized time management using Bun's best practices:
 * - Bun.nanoseconds() for high-precision timing
 * - performance.now() for web-standard timing
 * - Date objects for application timestamps
 * - Timezone management for international markets
 * - Testing and benchmarking support
 */

// Time management configuration
export interface TimeConfig {
    timezone?: string;
    enableHighPrecision?: boolean;
    benchmarkMode?: boolean;
}

// Timing measurement interface
export interface TimingMeasurement {
    startTime: number;
    endTime?: number;
    duration?: number;
    label: string;
    precision: 'nanoseconds' | 'milliseconds' | 'seconds';
}

// Time zone information
export interface TimeZoneInfo {
    name: string;
    offset: number;
    isDST: boolean;
}

/**
 * Centralized Time Manager using Bun's best practices
 */
export class TimeManager {
    private static instance: TimeManager;
    private config: TimeConfig;
    private measurements: Map<string, TimingMeasurement> = new Map();
    private timezoneCache: Map<string, TimeZoneInfo> = new Map();

    private constructor(config: TimeConfig = {}) {
        this.config = {
            timezone: config.timezone || 'UTC',
            enableHighPrecision: config.enableHighPrecision ?? true,
            benchmarkMode: config.benchmarkMode ?? false,
            ...config
        };

        this.initializeTimezone();
    }

    /**
     * Get singleton instance
     */
    static getInstance(config?: TimeConfig): TimeManager {
        if (!TimeManager.instance) {
            TimeManager.instance = new TimeManager(config);
        }
        return TimeManager.instance;
    }

    /**
     * Initialize timezone settings
     */
    private initializeTimezone(): void {
        if (this.config.timezone && this.config.timezone !== 'UTC') {
            process.env.TZ = this.config.timezone;
        }
    }

    /**
     * Get current timestamp using Bun's best practices
     */
    now(): Date {
        return new Date();
    }

    /**
     * Get current Unix timestamp in milliseconds
     */
    nowMs(): number {
        return Date.now();
    }

    /**
     * Get current Unix timestamp in seconds
     */
    nowSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Get high-precision nanoseconds since process start (Bun-specific)
     */
    nanoseconds(): number {
        return Bun.nanoseconds();
    }

    /**
     * Get high-precision milliseconds since process start (performance.now())
     */
    performanceMs(): number {
        return performance.now();
    }

    /**
     * Get Unix timestamp from performance time
     */
    performanceToUnix(performanceMs: number): number {
        return performance.timeOrigin + performanceMs;
    }

    /**
     * Create a timestamp with timezone awareness
     */
    createTimestamp(date?: Date, timezone?: string): Date {
        const targetDate = date || this.now();
        if (timezone && timezone !== 'UTC') {
            // Temporarily set timezone for date creation
            const originalTZ = process.env.TZ;
            process.env.TZ = timezone;
            const result = new Date(targetDate);
            process.env.TZ = originalTZ;
            return result;
        }
        return new Date(targetDate);
    }

    /**
     * Get timezone information
     */
    getTimezoneInfo(timezone?: string): TimeZoneInfo {
        const tz = timezone || this.config.timezone || 'UTC';

        if (this.timezoneCache.has(tz)) {
            return this.timezoneCache.get(tz)!;
        }

        const originalTZ = process.env.TZ;
        process.env.TZ = tz;

        const now = new Date();
        const info: TimeZoneInfo = {
            name: tz,
            offset: now.getTimezoneOffset(),
            isDST: this.isDST(now)
        };

        this.timezoneCache.set(tz, info);
        process.env.TZ = originalTZ;

        return info;
    }

    /**
     * Check if date is in Daylight Saving Time
     */
    private isDST(date: Date): boolean {
        const jan = new Date(date.getFullYear(), 0, 1);
        const jul = new Date(date.getFullYear(), 6, 1);
        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== date.getTimezoneOffset();
    }

    /**
     * Start timing measurement
     */
    startTiming(label: string, precision: 'nanoseconds' | 'milliseconds' | 'seconds' = 'milliseconds'): void {
        const startTime = precision === 'nanoseconds'
            ? this.nanoseconds()
            : precision === 'seconds'
                ? this.nowSeconds()
                : this.performanceMs();

        this.measurements.set(label, {
            startTime,
            label,
            precision
        });
    }

    /**
     * End timing measurement and return duration
     */
    endTiming(label: string): number | null {
        const measurement = this.measurements.get(label);
        if (!measurement) return null;

        const endTime = measurement.precision === 'nanoseconds'
            ? this.nanoseconds()
            : measurement.precision === 'seconds'
                ? this.nowSeconds()
                : this.performanceMs();

        const duration = endTime - measurement.startTime;

        this.measurements.set(label, {
            ...measurement,
            endTime,
            duration
        });

        return duration;
    }

    /**
     * Get timing measurement
     */
    getTiming(label: string): TimingMeasurement | null {
        return this.measurements.get(label) || null;
    }

    /**
     * Clear timing measurement
     */
    clearTiming(label: string): void {
        this.measurements.delete(label);
    }

    /**
     * Clear all timing measurements
     */
    clearAllTimings(): void {
        this.measurements.clear();
    }

    /**
     * Get all timing measurements
     */
    getAllTimings(): Map<string, TimingMeasurement> {
        return new Map(this.measurements);
    }

    /**
     * Format duration with appropriate units
     */
    formatDuration(duration: number, precision: 'nanoseconds' | 'milliseconds' | 'seconds' = 'milliseconds'): string {
        switch (precision) {
            case 'nanoseconds':
                if (duration < 1000) return `${duration}ns`;
                if (duration < 1000000) return `${(duration / 1000).toFixed(2)}μs`;
                if (duration < 1000000000) return `${(duration / 1000000).toFixed(2)}ms`;
                return `${(duration / 1000000000).toFixed(2)}s`;

            case 'seconds':
                return `${duration}s`;

            case 'milliseconds':
            default:
                if (duration < 1000) return `${duration.toFixed(2)}ms`;
                if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
                return `${(duration / 60000).toFixed(2)}m`;
        }
    }

    /**
     * Create a deterministic timestamp for testing
     */
    createTestTimestamp(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
        return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }

    /**
     * Parse ISO timestamp with timezone handling
     */
    parseTimestamp(timestamp: string | number | Date): Date {
        if (timestamp instanceof Date) return timestamp;
        if (typeof timestamp === 'number') return new Date(timestamp);
        return new Date(timestamp);
    }

    /**
     * Validate timestamp is within acceptable range
     */
    isValidTimestamp(timestamp: Date): boolean {
        const now = this.now();
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        return timestamp >= oneYearAgo && timestamp <= oneYearFromNow;
    }

    /**
     * Get market-specific timestamp for trading hours
     */
    getMarketTimestamp(market: 'US' | 'EU' | 'ASIA' | 'GLOBAL'): Date {
        const now = this.now();

        switch (market) {
            case 'US':
                // US Eastern Time (EST/EDT)
                return this.createTimestamp(now, 'America/New_York');

            case 'EU':
                // Central European Time (CET/CEST)
                return this.createTimestamp(now, 'Europe/London');

            case 'ASIA':
                // Tokyo Time (JST)
                return this.createTimestamp(now, 'Asia/Tokyo');

            case 'GLOBAL':
            default:
                return now;
        }
    }

    /**
     * Check if market is currently open
     */
    isMarketOpen(market: 'US' | 'EU' | 'ASIA', timestamp?: Date): boolean {
        const marketTime = timestamp || this.getMarketTimestamp(market);
        const hours = marketTime.getUTCHours();

        switch (market) {
            case 'US':
                // US market: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
                return hours >= 14 && hours < 21;

            case 'EU':
                // EU market: 8:00 AM - 4:30 PM GMT (8:00 - 16:30 UTC)
                return hours >= 8 && hours < 16;

            case 'ASIA':
                // Tokyo market: 9:00 AM - 3:00 PM JST (0:00 - 6:00 UTC)
                return hours >= 0 && hours < 6;

            default:
                return false;
        }
    }

    /**
     * Get next market open time
     */
    getNextMarketOpen(market: 'US' | 'EU' | 'ASIA'): Date {
        const now = this.now();
        const marketTime = this.getMarketTimestamp(market);

        // Simple implementation - returns next market day at open
        const nextOpen = new Date(marketTime);
        nextOpen.setUTCHours(this.getMarketOpenHour(market), 0, 0, 0);

        if (nextOpen <= now) {
            nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
        }

        return nextOpen;
    }

    /**
     * Get market open hour in UTC
     */
    private getMarketOpenHour(market: 'US' | 'EU' | 'ASIA'): number {
        switch (market) {
            case 'US': return 14; // 9:30 AM ET
            case 'EU': return 8;  // 8:00 AM GMT
            case 'ASIA': return 0; // 9:00 AM JST
            default: return 0;
        }
    }
}

// Export singleton instance for immediate use
export const timeManager = TimeManager.getInstance();

// Export utility functions for convenience
export const now = () => timeManager.now();
export const nowMs = () => timeManager.nowMs();
export const nowSeconds = () => timeManager.nowSeconds();
export const nanoseconds = () => timeManager.nanoseconds();
export const performanceMs = () => timeManager.performanceMs();
export const createTimestamp = (date?: Date, timezone?: string) =>
    timeManager.createTimestamp(date, timezone);

// Benchmark utilities
export class BenchmarkTimer {
    private measurements: TimingMeasurement[] = [];

    constructor(private label: string = 'benchmark') { }

    start(): void {
        timeManager.startTiming(this.label, 'nanoseconds');
    }

    stop(): number {
        const duration = timeManager.endTiming(this.label);
        if (duration !== null) {
            const measurement = timeManager.getTiming(this.label);
            if (measurement) {
                this.measurements.push(measurement);
            }
        }
        return duration || 0;
    }

    lap(name?: string): number {
        const lapLabel = name || `${this.label}_lap_${this.measurements.length}`;
        timeManager.startTiming(lapLabel, 'nanoseconds');
        return this.stop();
    }

    getResults(): TimingMeasurement[] {
        return [...this.measurements];
    }

    getAverageDuration(): number {
        if (this.measurements.length === 0) return 0;
        const total = this.measurements.reduce((sum, m) => sum + (m.duration || 0), 0);
        return total / this.measurements.length;
    }

    reset(): void {
        this.measurements = [];
        timeManager.clearTiming(this.label);
    }
}
