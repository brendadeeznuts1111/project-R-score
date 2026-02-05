/**
 * Comprehensive Time Management Benchmarks and Tests
 * 
 * This test suite validates and benchmarks the enhanced time management utilities:
 * - Bun.nanoseconds() performance testing
 * - Time zone handling validation
 * - Market hours calculation accuracy
 * - High-precision timing measurements
 * - Time mocking and scenario testing
 */

import { describe, test, expect, beforeAll, afterAll, setSystemTime } from "bun:test";
import {
    TimeManager,
    timeManager,
    BenchmarkTimer,
    now,
    nowMs,
    nowSeconds,
    nanoseconds,
    performanceMs,
    createTimestamp
} from "./time-manager";
import {
    TimeTestManager,
    TimeTestUtils,
    setupFakeTime,
    performanceBenchmark
} from "./time-testing";

describe("🕐 Time Management Core", () => {
    let tm: TimeManager;

    beforeAll(() => {
        tm = TimeManager.getInstance({
            timezone: 'UTC',
            enableHighPrecision: true,
            benchmarkMode: false
        });
    });

    test("TimeManager singleton pattern", () => {
        const instance1 = TimeManager.getInstance();
        const instance2 = TimeManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    test("Basic time functions", () => {
        const date = now();
        const ms = nowMs();
        const seconds = nowSeconds();
        const ns = nanoseconds();
        const perfMs = performanceMs();

        expect(date).toBeInstanceOf(Date);
        expect(typeof ms).toBe('number');
        expect(typeof seconds).toBe('number');
        expect(typeof ns).toBe('number');
        expect(typeof perfMs).toBe('number');

        // Validate relationships
        expect(ms).toBeGreaterThan(0);
        expect(seconds).toBeGreaterThan(0);
        expect(ns).toBeGreaterThanOrEqual(0);
        expect(perfMs).toBeGreaterThanOrEqual(0);

        // Validate precision
        expect(ms).toBeLessThan(date.getTime() + 100);
        expect(seconds * 1000).toBeLessThanOrEqual(ms);
    });

    test("Timestamp creation with timezone", () => {
        const baseDate = new Date('2024-01-01T12:00:00.000Z');
        const utcTimestamp = createTimestamp(baseDate, 'UTC');
        const estTimestamp = createTimestamp(baseDate, 'America/New_York');

        expect(utcTimestamp.toISOString()).toBe(baseDate.toISOString());
        expect(estTimestamp.getTime()).toBe(baseDate.getTime());
    });

    test("Timezone information", () => {
        const utcInfo = tm.getTimezoneInfo('UTC');
        const estInfo = tm.getTimezoneInfo('America/New_York');

        expect(utcInfo.name).toBe('UTC');
        expect(utcInfo.offset).toBe(0);
        expect(estInfo.name).toBe('America/New_York');
        expect(typeof estInfo.offset).toBe('number');
    });

    test("Market hours calculation", () => {
        // Test US market hours (9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC)
        const marketOpen = tm.createTestTimestamp(2024, 1, 1, 14, 30, 0);
        const marketClose = tm.createTestTimestamp(2024, 1, 1, 20, 59, 59); // Just before close
        const afterHours = tm.createTestTimestamp(2024, 1, 1, 21, 0, 0);

        expect(tm.isMarketOpen('US', marketOpen)).toBe(true);
        expect(tm.isMarketOpen('US', marketClose)).toBe(true); // Just before close
        expect(tm.isMarketOpen('US', afterHours)).toBe(false);
    });

    test("Duration formatting", () => {
        expect(tm.formatDuration(500, 'milliseconds')).toBe('500.00ms');
        expect(tm.formatDuration(1500, 'milliseconds')).toBe('1.50s');
        expect(tm.formatDuration(65000, 'milliseconds')).toBe('1.08m');

        expect(tm.formatDuration(1000, 'nanoseconds')).toBe('1.00μs');
        expect(tm.formatDuration(1000000, 'nanoseconds')).toBe('1.00ms');
        expect(tm.formatDuration(1000000000, 'nanoseconds')).toBe('1.00s');
    });
});

describe("⏱️ High-Precision Timing", () => {
    test("BenchmarkTimer functionality", () => {
        const timer = new BenchmarkTimer('test-operation');

        timer.start();

        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }

        const duration = timer.stop();

        expect(duration).toBeGreaterThan(0);
        expect(timer.getResults()).toHaveLength(1);
        expect(timer.getAverageDuration()).toBeGreaterThan(0);

        timer.reset();
        expect(timer.getResults()).toHaveLength(0);
    });

    test("Timing measurement precision", () => {
        // Test nanosecond precision
        timeManager.startTiming('ns-test', 'nanoseconds');
        const startNs = nanoseconds();

        // Small delay
        for (let i = 0; i < 1000; i++) {
            Math.random();
        }

        const endNs = nanoseconds();
        const measuredNs = timeManager.endTiming('ns-test');

        expect(measuredNs).toBeGreaterThan(0);
        expect(measuredNs).toBeLessThan(endNs - startNs + 1000000); // Allow some tolerance
    });

    test("Performance timing vs Date.now()", () => {
        const iterations = 10000;

        // Benchmark Date.now()
        const dateNowStart = Bun.nanoseconds();
        for (let i = 0; i < iterations; i++) {
            Date.now();
        }
        const dateNowEnd = Bun.nanoseconds();
        const dateNowDuration = dateNowEnd - dateNowStart;

        // Benchmark performance.now()
        const perfNowStart = Bun.nanoseconds();
        for (let i = 0; i < iterations; i++) {
            performance.now();
        }
        const perfNowEnd = Bun.nanoseconds();
        const perfNowDuration = perfNowEnd - perfNowStart;

        // Benchmark Bun.nanoseconds()
        const bunNsStart = Bun.nanoseconds();
        for (let i = 0; i < iterations; i++) {
            Bun.nanoseconds();
        }
        const bunNsEnd = Bun.nanoseconds();
        const bunNsDuration = bunNsEnd - bunNsStart;

        console.log(`Date.now(): ${timeManager.formatDuration(dateNowDuration, 'nanoseconds')}`);
        console.log(`performance.now(): ${timeManager.formatDuration(perfNowDuration, 'nanoseconds')}`);
        console.log(`Bun.nanoseconds(): ${timeManager.formatDuration(bunNsDuration, 'nanoseconds')}`);

        // All should complete in reasonable time
        expect(dateNowDuration).toBeGreaterThan(0);
        expect(perfNowDuration).toBeGreaterThan(0);
        expect(bunNsDuration).toBeGreaterThan(0);
    });
});

describe("🎭 Time Mocking and Testing", () => {
    let testManager: TimeTestManager;
    let testUtils: TimeTestUtils;

    beforeAll(() => {
        testManager = TimeTestManager.getInstance();
        testUtils = new TimeTestUtils();
    });

    afterAll(() => {
        testManager.resetRealTime();
    });

    test("Fake time setup and manipulation", () => {
        const fixedTime = new Date('2024-01-01T12:00:00.000Z');

        testUtils.setupFakeTime(fixedTime);
        expect(testUtils.now().getTime()).toBe(fixedTime.getTime());

        testUtils.advanceTime(1000);
        expect(testUtils.now().getTime()).toBe(fixedTime.getTime() + 1000);

        // Use the test manager directly for advanceTo
        testManager.advanceTo(new Date('2024-01-01T13:00:00.000Z'));
        expect(testUtils.now().getTime()).toBe(new Date('2024-01-01T13:00:00.000Z').getTime());

        testUtils.resetTime();
        expect(testUtils.now().getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
    });

    test("Deterministic timestamp generation", () => {
        const timestamps = TimeTestManager.createTestTimestamps(5, 1000);

        expect(timestamps).toHaveLength(5);
        expect(timestamps[0].getTime()).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
        expect(timestamps[1].getTime()).toBe(new Date('2024-01-01T00:00:01.000Z').getTime());
        expect(timestamps[4].getTime()).toBe(new Date('2024-01-01T00:00:04.000Z').getTime());
    });

    test("Market hours test data generation", () => {
        const { timestamps, marketStates } = TimeTestManager.createMarketHoursTestData();

        expect(timestamps).toHaveLength(24);
        expect(marketStates).toHaveLength(24);

        // Validate that at least one hour has US market open
        const usMarketOpen = marketStates.some(state => state.US);
        expect(usMarketOpen).toBe(true);
    });

    test("Time scenario execution", async () => {
        const scenario = {
            name: 'test-scenario',
            startTime: new Date('2024-01-01T12:00:00.000Z'),
            events: [
                {
                    timestamp: new Date('2024-01-01T12:01:00.000Z'),
                    description: 'Test event 1',
                    callback: () => console.log('Event 1 executed')
                },
                {
                    timestamp: new Date('2024-01-01T12:02:00.000Z'),
                    description: 'Test event 2',
                    callback: () => console.log('Event 2 executed')
                }
            ]
        };

        testManager.createScenario('test-scenario', scenario.startTime, scenario.events);

        const executedEvents: string[] = [];

        // Override console.log for testing
        const originalLog = console.log;
        console.log = (message: string) => {
            if (message.includes('Event')) {
                executedEvents.push(message);
            }
        };

        await testManager.runScenario('test-scenario');

        console.log = originalLog;

        expect(executedEvents).toHaveLength(2);
        expect(executedEvents[0]).toBe('Event 1 executed');
        expect(executedEvents[1]).toBe('Event 2 executed');

        testManager.clearScenarios();
    });
});

describe("📊 Performance Benchmarks", () => {
    test("Time function performance comparison", async () => {
        const results = await performanceBenchmark.compare('time_functions', [
            {
                name: 'Date.now',
                fn: () => Date.now()
            },
            {
                name: 'timeManager.nowMs',
                fn: () => timeManager.nowMs()
            },
            {
                name: 'performance.now',
                fn: () => performance.now()
            },
            {
                name: 'Bun.nanoseconds',
                fn: () => Bun.nanoseconds()
            },
            {
                name: 'timeManager.nanoseconds',
                fn: () => timeManager.nanoseconds()
            }
        ], { iterations: 10000 });

        expect(results).toHaveLength(5);

        // All functions should complete
        results.forEach(result => {
            expect(result.duration).toBeGreaterThan(0);
            expect(result.iterations).toBe(10000);
        });

        console.log(performanceBenchmark.formatResults());
    });

    test("WebSocket message creation performance", async () => {
        const mockOdds = {
            exchange: 'test-exchange',
            gameId: 'test-game-123',
            line: 7.5,
            juice: -110,
            timestamp: new Date(),
            price: 1.85,
            size: 1000
        };

        const results = await performanceBenchmark.compare('message_creation', [
            {
                name: 'without_time_manager',
                fn: () => ({
                    type: 'odds',
                    timestamp: new Date(),
                    data: mockOdds
                })
            },
            {
                name: 'with_time_manager',
                fn: () => ({
                    type: 'odds',
                    timestamp: timeManager.now(),
                    data: mockOdds
                })
            }
        ], { iterations: 50000 });

        expect(results).toHaveLength(2);

        // Time manager version should not be significantly slower
        const timeManagerDuration = results.find(r => r.name.includes('time_manager'))?.duration || 0;
        const standardDuration = results.find(r => r.name.includes('without'))?.duration || 0;

        // Time manager overhead should be less than 50% (generous allowance)
        expect(timeManagerDuration).toBeLessThan(standardDuration * 1.5);

        console.log(performanceBenchmark.formatResults());
    });

    test("High-frequency timing measurements", async () => {
        const timer = new BenchmarkTimer('high-frequency-test');
        const measurements: number[] = [];

        for (let i = 0; i < 100; i++) {
            timer.start();

            // Simulate variable work
            const work = Math.random() * 1000;
            for (let j = 0; j < work; j++) {
                Math.sqrt(j);
            }

            const duration = timer.stop();
            measurements.push(duration);
        }

        const results = timer.getResults();
        const avgDuration = timer.getAverageDuration();

        expect(results).toHaveLength(100);
        expect(avgDuration).toBeGreaterThan(0);

        // Calculate statistics
        const min = Math.min(...measurements);
        const max = Math.max(...measurements);
        const variance = measurements.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / measurements.length;

        console.log(`High-frequency timing stats:`);
        console.log(`  Average: ${timeManager.formatDuration(avgDuration, 'nanoseconds')}`);
        console.log(`  Min: ${timeManager.formatDuration(min, 'nanoseconds')}`);
        console.log(`  Max: ${timeManager.formatDuration(max, 'nanoseconds')}`);
        console.log(`  Variance: ${variance.toFixed(2)} ns²`);

        // Variance should be reasonable (not too erratic)
        expect(variance).toBeLessThan(avgDuration * avgDuration * 50); // Allow up to 5000% relative variance for system variability
    });
});

describe("🌍 International Time Handling", () => {
    test("Multiple timezone support", () => {
        const timezones = [
            'UTC',
            'America/New_York',
            'Europe/London',
            'Asia/Tokyo',
            'Australia/Sydney'
        ];

        const baseTime = new Date('2024-01-01T12:00:00.000Z');

        timezones.forEach(tz => {
            const timestamp = createTimestamp(baseTime, tz);
            const tzInfo = timeManager.getTimezoneInfo(tz);

            expect(timestamp).toBeInstanceOf(Date);
            expect(tzInfo.name).toBe(tz);
            expect(typeof tzInfo.offset).toBe('number');

            console.log(`${tz}: offset=${tzInfo.offset}min, DST=${tzInfo.isDST}`);
        });
    });

    test("Market-specific timestamps", () => {
        const usTimestamp = timeManager.getMarketTimestamp('US');
        const euTimestamp = timeManager.getMarketTimestamp('EU');
        const asiaTimestamp = timeManager.getMarketTimestamp('ASIA');

        expect(usTimestamp).toBeInstanceOf(Date);
        expect(euTimestamp).toBeInstanceOf(Date);
        expect(asiaTimestamp).toBeInstanceOf(Date);

        // All should be recent (within last minute)
        const now = timeManager.now();
        const oneMinuteAgo = new Date(now.getTime() - 60000);

        expect(usTimestamp.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
        expect(euTimestamp.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
        expect(asiaTimestamp.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    });

    test("Next market open calculation", () => {
        const nextUSOpen = timeManager.getNextMarketOpen('US');
        const nextEUOpen = timeManager.getNextMarketOpen('EU');
        const nextAsiaOpen = timeManager.getNextMarketOpen('ASIA');

        expect(nextUSOpen).toBeInstanceOf(Date);
        expect(nextEUOpen).toBeInstanceOf(Date);
        expect(nextAsiaOpen).toBeInstanceOf(Date);

        // All should be in the future
        const now = timeManager.now();
        expect(nextUSOpen.getTime()).toBeGreaterThan(now.getTime());
        expect(nextEUOpen.getTime()).toBeGreaterThan(now.getTime());
        expect(nextAsiaOpen.getTime()).toBeGreaterThan(now.getTime());

        console.log(`Next US market open: ${nextUSOpen.toISOString()}`);
        console.log(`Next EU market open: ${nextEUOpen.toISOString()}`);
        console.log(`Next Asia market open: ${nextAsiaOpen.toISOString()}`);
    });
});
describe("🔧 Edge Cases and Error Handling", () => {
    test("Invalid timestamp validation", () => {
        const validTimestamp = timeManager.now();
        const futureTimestamp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        const pastTimestamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        const tooFutureTimestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years from now
        const tooPastTimestamp = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

        expect(timeManager.isValidTimestamp(validTimestamp)).toBe(true);
        expect(timeManager.isValidTimestamp(futureTimestamp)).toBe(true);
        expect(timeManager.isValidTimestamp(pastTimestamp)).toBe(true);
        expect(timeManager.isValidTimestamp(tooFutureTimestamp)).toBe(false);
        expect(timeManager.isValidTimestamp(tooPastTimestamp)).toBe(false);
    });

    test("Timestamp parsing robustness", () => {
        const dateObject = new Date('2024-01-01T12:00:00.000Z');
        const timestampNumber = dateObject.getTime();
        const timestampString = dateObject.toISOString();
        const invalidString = 'invalid-date';

        expect(timeManager.parseTimestamp(dateObject)).toEqual(dateObject);
        expect(timeManager.parseTimestamp(timestampNumber)).toEqual(dateObject);
        expect(timeManager.parseTimestamp(timestampString)).toEqual(dateObject);
        expect(timeManager.parseTimestamp(invalidString)).toBeInstanceOf(Date);
        expect(timeManager.parseTimestamp(invalidString).getTime()).toBeNaN();
    });

    test("Time manager configuration validation", () => {
        // Test with various configurations
        const configs = [
            { timezone: 'UTC', enableHighPrecision: true, benchmarkMode: false },
            { timezone: 'America/New_York', enableHighPrecision: false, benchmarkMode: true },
            { timezone: undefined, enableHighPrecision: true, benchmarkMode: undefined }
        ];

        configs.forEach(config => {
            const manager = TimeManager.getInstance(config);
            expect(manager.now()).toBeInstanceOf(Date);
            expect(manager.nanoseconds()).toBeGreaterThanOrEqual(0);
        });
    });
});
