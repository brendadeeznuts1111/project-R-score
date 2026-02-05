/**
 * Time Testing and Mocking Utilities for Bun Applications
 * 
 * This module provides comprehensive time mocking and testing capabilities:
 * - Deterministic time control for tests
 * - Fake timers with Bun's setSystemTime
 * - Time progression utilities
 * - Test-specific time management
 */

import { TimeManager, timeManager } from './time-manager';

// Test time configuration
export interface TestTimeConfig {
    fixedTime?: Date;
    timezone?: string;
    autoAdvance?: boolean;
    advanceInterval?: number; // milliseconds
}

// Time progression scenario
export interface TimeScenario {
    name: string;
    startTime: Date;
    events: TimeEvent[];
}

export interface TimeEvent {
    timestamp: Date;
    description: string;
    callback?: () => void;
}

/**
 * Time Testing Manager
 */
export class TimeTestManager {
    private static instance: TimeTestManager;
    private originalDate: typeof Date;
    private originalNow: () => number;
    private config: TestTimeConfig = {};
    private currentTime: Date;
    private isMocked: boolean = false;
    private autoAdvanceTimer?: NodeJS.Timeout;
    private scenarios: Map<string, TimeScenario> = new Map();

    private constructor() {
        this.originalDate = Date;
        this.originalNow = Date.now;
        this.currentTime = new Date();
    }

    static getInstance(): TimeTestManager {
        if (!TimeTestManager.instance) {
            TimeTestManager.instance = new TimeTestManager();
        }
        return TimeTestManager.instance;
    }

    /**
     * Setup fake time with Bun's setSystemTime
     */
    setupFakeTime(config: TestTimeConfig = {}): void {
        this.config = {
            timezone: 'UTC',
            autoAdvance: false,
            advanceInterval: 1000,
            ...config
        };

        // Set fixed time if provided
        if (this.config.fixedTime) {
            this.currentTime = new Date(this.config.fixedTime);
            this.setSystemTime(this.currentTime);
        } else {
            this.currentTime = new Date();
        }

        // Set timezone
        if (this.config.timezone) {
            process.env.TZ = this.config.timezone;
        }

        this.isMocked = true;

        // Setup auto advance if enabled
        if (this.config.autoAdvance && this.config.advanceInterval) {
            this.startAutoAdvance();
        }
    }

    /**
     * Reset to real time
     */
    resetRealTime(): void {
        this.stopAutoAdvance();
        this.setSystemTime(); // Reset to real time
        this.isMocked = false;
        this.config = {};
    }

    /**
     * Set system time using Bun's setSystemTime
     */
    private setSystemTime(date?: Date): void {
        // Use Bun's setSystemTime if available
        if (typeof setSystemTime !== 'undefined') {
            setSystemTime(date);
        }
    }

    /**
     * Advance time by specified amount
     */
    advanceTime(milliseconds: number): void {
        if (!this.isMocked) {
            throw new Error('Time mocking is not active. Call setupFakeTime() first.');
        }

        this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
        this.setSystemTime(this.currentTime);
    }

    /**
     * Advance time to specific timestamp
     */
    advanceTo(targetTime: Date): void {
        if (!this.isMocked) {
            throw new Error('Time mocking is not active. Call setupFakeTime() first.');
        }

        this.currentTime = new Date(targetTime);
        this.setSystemTime(this.currentTime);
    }

    /**
     * Get current mocked time
     */
    getCurrentTime(): Date {
        return this.isMocked ? new Date(this.currentTime) : new Date();
    }

    /**
     * Check if time mocking is active
     */
    isTimeMocked(): boolean {
        return this.isMocked;
    }

    /**
     * Start auto time advancement
     */
    private startAutoAdvance(): void {
        if (this.config.advanceInterval) {
            this.autoAdvanceTimer = setInterval(() => {
                this.advanceTime(this.config.advanceInterval!);
            }, this.config.advanceInterval);
        }
    }

    /**
     * Stop auto time advancement
     */
    private stopAutoAdvance(): void {
        if (this.autoAdvanceTimer) {
            clearInterval(this.autoAdvanceTimer);
            this.autoAdvanceTimer = undefined;
        }
    }

    /**
     * Create a time scenario for testing
     */
    createScenario(name: string, startTime: Date, events: TimeEvent[] = []): void {
        this.scenarios.set(name, {
            name,
            startTime: new Date(startTime),
            events: events.map(event => ({
                ...event,
                timestamp: new Date(event.timestamp)
            }))
        });
    }

    /**
     * Run a time scenario
     */
    async runScenario(name: string): Promise<void> {
        const scenario = this.scenarios.get(name);
        if (!scenario) {
            throw new Error(`Scenario '${name}' not found`);
        }

        // Setup start time
        this.setupFakeTime({ fixedTime: scenario.startTime });

        // Execute events in chronological order
        const sortedEvents = scenario.events.sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );

        for (const event of sortedEvents) {
            // Advance to event time
            this.advanceTo(event.timestamp);

            // Execute callback if provided
            if (event.callback) {
                await event.callback();
            }
        }
    }

    /**
     * Get all scenarios
     */
    getScenarios(): Map<string, TimeScenario> {
        return new Map(this.scenarios);
    }

    /**
     * Clear all scenarios
     */
    clearScenarios(): void {
        this.scenarios.clear();
    }

    /**
     * Create deterministic timestamps for testing
     */
    static createTestTimestamps(count: number, intervalMs: number = 1000, startTime?: Date): Date[] {
        const start = startTime || new Date('2024-01-01T00:00:00.000Z');
        const timestamps: Date[] = [];

        for (let i = 0; i < count; i++) {
            timestamps.push(new Date(start.getTime() + (i * intervalMs)));
        }

        return timestamps;
    }

    /**
     * Create market hours test data
     */
    static createMarketHoursTestData(): {
        timestamps: Date[];
        marketStates: { US: boolean; EU: boolean; ASIA: boolean }[];
    } {
        const timestamps = this.createTestTimestamps(24, 60 * 60 * 1000); // Hourly for 24 hours
        const marketStates = timestamps.map(timestamp => ({
            US: this.isMarketOpenAtTime(timestamp, 'US'),
            EU: this.isMarketOpenAtTime(timestamp, 'EU'),
            ASIA: this.isMarketOpenAtTime(timestamp, 'ASIA')
        }));

        return { timestamps, marketStates };
    }

    /**
     * Check if market is open at specific time
     */
    private static isMarketOpenAtTime(timestamp: Date, market: 'US' | 'EU' | 'ASIA'): boolean {
        const hours = timestamp.getUTCHours();

        switch (market) {
            case 'US':
                return hours >= 14 && hours < 21;
            case 'EU':
                return hours >= 8 && hours < 16;
            case 'ASIA':
                return hours >= 0 && hours < 6;
            default:
                return false;
        }
    }
}

/**
 * Time testing utilities for Jest/Bun test compatibility
 */
export class TimeTestUtils {
    private testManager: TimeTestManager;

    constructor() {
        this.testManager = TimeTestManager.getInstance();
    }

    /**
     * Setup fake time for a test
     */
    setupFakeTime(time: string | Date, timezone = 'UTC'): void {
        const fixedTime = typeof time === 'string' ? new Date(time) : time;
        this.testManager.setupFakeTime({ fixedTime, timezone });
    }

    /**
     * Reset time after test
     */
    resetTime(): void {
        this.testManager.resetRealTime();
    }

    /**
     * Advance time in test
     */
    advanceTime(milliseconds: number): void {
        this.testManager.advanceTime(milliseconds);
    }

    /**
     * Get current time in test
     */
    now(): Date {
        return this.testManager.getCurrentTime();
    }

    /**
     * Create common test scenarios
     */
    static createCommonScenarios(): Map<string, TimeScenario> {
        const scenarios = new Map<string, TimeScenario>();

        // Market opening scenario
        scenarios.set('market_opening', {
            name: 'Market Opening',
            startTime: new Date('2024-01-01T13:30:00.000Z'), // Before US market open
            events: [
                {
                    timestamp: new Date('2024-01-01T14:30:00.000Z'), // US market opens
                    description: 'US Market Opens',
                    callback: () => console.log('US Market opened')
                },
                {
                    timestamp: new Date('2024-01-01T21:00:00.000Z'), // US market closes
                    description: 'US Market Closes',
                    callback: () => console.log('US Market closed')
                }
            ]
        });

        // Arbitrage opportunity scenario
        scenarios.set('arbitrage_opportunity', {
            name: 'Arbitrage Opportunity',
            startTime: new Date('2024-01-01T15:00:00.000Z'),
            events: [
                {
                    timestamp: new Date('2024-01-01T15:00:01.000Z'),
                    description: 'Price discrepancy detected',
                    callback: () => console.log('Arbitrage opportunity detected')
                },
                {
                    timestamp: new Date('2024-01-01T15:00:05.000Z'),
                    description: 'Arbitrage executed',
                    callback: () => console.log('Arbitrage executed')
                }
            ]
        });

        return scenarios;
    }
}

// Export singleton instance
export const timeTestManager = TimeTestManager.getInstance();

// Export convenience functions for tests
export const setupFakeTime = (time: string | Date, timezone = 'UTC') => {
    const utils = new TimeTestUtils();
    utils.setupFakeTime(time, timezone);
    return utils;
};

/**
 * Performance benchmark utilities
 */
export class PerformanceBenchmark {
    private results: Array<{ name: string; duration: number; iterations: number }> = [];

    /**
     * Benchmark a function with high precision timing
     */
    async benchmark<T>(
        name: string,
        fn: () => T | Promise<T>,
        options: {
            iterations?: number;
            warmupIterations?: number;
            timeout?: number;
        } = {}
    ): Promise<{ name: string; duration: number; iterations: number; result: T }> {
        const {
            iterations = 1000,
            warmupIterations = 100,
            timeout = 30000
        } = options;

        // Warmup
        for (let i = 0; i < warmupIterations; i++) {
            await fn();
        }

        // Actual benchmark
        const startTime = Bun.nanoseconds();
        let result: T;

        for (let i = 0; i < iterations; i++) {
            result = await fn();

            // Check timeout
            if (Bun.nanoseconds() - startTime > timeout * 1_000_000) {
                throw new Error(`Benchmark '${name}' timed out after ${timeout}ms`);
            }
        }

        const endTime = Bun.nanoseconds();
        const duration = endTime - startTime;

        const benchmarkResult = {
            name,
            duration,
            iterations,
            result: result!
        };

        this.results.push(benchmarkResult);
        return benchmarkResult;
    }

    /**
     * Compare multiple functions
     */
    async compare<T>(
        name: string,
        functions: Array<{ name: string; fn: () => T | Promise<T> }>,
        options: { iterations?: number } = {}
    ): Promise<Array<{ name: string; duration: number; iterations: number; result: T }>> {
        const results = [];

        for (const { name: fnName, fn } of functions) {
            const result = await this.benchmark(`${name}_${fnName}`, fn, options);
            results.push(result);
        }

        return results;
    }

    /**
     * Get benchmark results
     */
    getResults(): Array<{ name: string; duration: number; iterations: number }> {
        return [...this.results];
    }

    /**
     * Clear results
     */
    clearResults(): void {
        this.results = [];
    }

    /**
     * Format benchmark results
     */
    formatResults(): string {
        if (this.results.length === 0) return 'No benchmark results available';

        let output = '\n📊 Benchmark Results:\n';
        output += '='.repeat(50) + '\n';

        for (const result of this.results) {
            const avgDuration = result.duration / result.iterations;
            const opsPerSecond = (1_000_000_000 / avgDuration).toFixed(0);

            output += `${result.name}:\n`;
            output += `  Total: ${TimeManager.getInstance().formatDuration(result.duration, 'nanoseconds')}\n`;
            output += `  Average: ${TimeManager.getInstance().formatDuration(avgDuration, 'nanoseconds')}\n`;
            output += `  Ops/sec: ${opsPerSecond}\n`;
            output += `  Iterations: ${result.iterations}\n\n`;
        }

        return output;
    }
}

// Export benchmark instance
export const performanceBenchmark = new PerformanceBenchmark();
