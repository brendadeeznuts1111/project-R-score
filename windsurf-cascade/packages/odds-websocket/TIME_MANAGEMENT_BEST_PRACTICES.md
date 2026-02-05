# 🕐 Time Management Best Practices for Bun Applications

This guide outlines comprehensive time management strategies for high-performance Bun applications, with specific focus on WebSocket servers, real-time data processing, and sports betting protocols.

## 📋 Table of Contents

- [Core Principles](#-core-principles)
- [Bun-Specific Time APIs](#-bun-specific-time-apis)
- [Time Management Architecture](#-time-management-architecture)
- [Performance Optimization](#-performance-optimization)
- [Testing and Mocking](#-testing-and-mocking)
- [International Markets](#-international-markets)
- [Benchmarking Guidelines](#-benchmarking-guidelines)
- [Common Pitfalls](#-common-pitfalls)
- [Migration Guide](#-migration-guide)
- [Performance Metrics](#-performance-metrics)
- [Conclusion](#-conclusion)
- [Additional Resources](#-additional-resources)

---

## 🎯 Core Principles

### 1. **Use Bun's Native Time APIs**

- `Bun.nanoseconds()` for highest precision timing
- `performance.now()` for web-standard compatibility
- `Date.now()` for general timestamping
- `setSystemTime()` for deterministic testing

### 2. **Prefer Date Objects Over Numbers**

- Use `Date` objects for application timestamps
- Convert to numbers only when necessary for serialization
- Maintain timezone awareness throughout the application

### 3. **Centralized Time Management**

- Single source of truth for all time operations
- Consistent timezone handling
- Unified performance monitoring

### 4. **High-Precision for Performance**

- Use nanosecond precision for benchmarking
- Microsecond precision for real-time operations
- Millisecond precision for user-facing features

---

## ⚡ Bun-Specific Time APIs

### **Bun.nanoseconds()**

```typescript
// High-precision timing since process start
const startTime = Bun.nanoseconds();
// ... perform operation
const duration = Bun.nanoseconds() - startTime;
console.log(`Operation took: ${duration}ns`);
```

**Best Practices:**

- Use for micro-benchmarks and performance profiling
- Not suitable for wall-clock time (process-relative)
- Ideal for measuring sub-millisecond operations

### **performance.now()**

```typescript
// Web-standard high-precision timing
const start = performance.now();
// ... perform operation
const duration = performance.now() - start;
console.log(`Operation took: ${duration}ms`);
```

**Best Practices:**

- Use for general performance measurement
- Compatible across browsers and Node.js
- Good for millisecond-precision timing

### **setSystemTime()** (Testing)

```typescript
import { setSystemTime } from "bun:test";

// Set deterministic time for tests
setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
expect(new Date().getFullYear()).toBe(2024);

// Reset to real time
setSystemTime();
```

**Best Practices:**

- Only use in test environments
- Always reset after tests complete
- Perfect for time-dependent test scenarios

---

## 🏗️ Time Management Architecture

### **Core Components**

```typescript
// Time Manager - Centralized time operations
export class TimeManager {
    // High-precision timing
    nanoseconds(): number;
    performanceMs(): number;
    
    // Application timestamps
    now(): Date;
    nowMs(): number;
    
    // Timezone handling
    createTimestamp(date?: Date, timezone?: string): Date;
    getTimezoneInfo(timezone?: string): TimeZoneInfo;
    
    // Performance tracking
    startTiming(label: string, precision: TimingPrecision): void;
    endTiming(label: string): number | null;
    formatDuration(duration: number, precision: TimingPrecision): string;
}

// Test Manager - Time mocking and scenarios
export class TimeTestManager {
    setupFakeTime(config: TestTimeConfig): void;
    advanceTime(milliseconds: number): void;
    runScenario(name: string): Promise<void>;
    resetRealTime(): void;
}

// Benchmark Timer - Performance measurement
export class BenchmarkTimer {
    start(): void;
    stop(): number;
    lap(name?: string): number;
    getAverageDuration(): number;
}
```

### **Integration Pattern**

```typescript
// In your application classes
class WebSocketServer {
    private timeManager: TimeManager;
    private performanceTimer: BenchmarkTimer;
    
    constructor() {
        this.timeManager = TimeManager.getInstance();
        this.performanceTimer = new BenchmarkTimer('websocket-server');
    }
    
    broadcastOdds(odds: OddsTick): void {
        const now = this.timeManager.now();
        const message = {
            type: "odds",
            timestamp: now,
            data: odds
        };
        
        this.server.publish("odds", JSON.stringify(message));
    }
}
```

---

## 🚀 Performance Optimization

### **Timing Precision Guidelines**

| Use Case | Recommended Precision | API |
|----------|---------------------|-----|
| Financial transactions | Nanoseconds | `Bun.nanoseconds()` |
| Real-time data feeds | Microseconds | `performance.now()` |
| User interfaces | Milliseconds | `Date.now()` |
| Logging & auditing | Seconds | `Date.now() / 1000` |

### **Memory Efficiency**

```typescript
// ❌ Avoid: Creating many Date objects
for (let i = 0; i < 10000; i++) {
    const timestamp = new Date(); // Creates new object each time
    processMessage(timestamp);
}

// ✅ Prefer: Reuse timestamp or use primitives
const batchTimestamp = timeManager.now();
for (let i = 0; i < 10000; i++) {
    processMessage(batchTimestamp); // Reuse same Date object
}

// Or use primitives when Date object not needed
for (let i = 0; i < 10000; i++) {
    processMessage(timeManager.nowMs()); // Use number timestamp
}
```

### **High-Frequency Operations**

```typescript
// For message processing in high-throughput systems
class HighFrequencyProcessor {
    private lastTimestamp = 0;
    private timestampCache = new Map<number, Date>();
    
    processMessage(message: any): void {
        const nowMs = timeManager.nowMs();
        
        // Cache Date objects to reduce GC pressure
        if (!this.timestampCache.has(nowMs)) {
            this.timestampCache.set(nowMs, new Date(nowMs));
        }
        
        const timestamp = this.timestampCache.get(nowMs)!;
        message.timestamp = timestamp;
        
        // Cleanup old cache entries periodically
        if (nowMs - this.lastTimestamp > 60000) { // 1 minute
            this.cleanupCache();
            this.lastTimestamp = nowMs;
        }
    }
    
    private cleanupCache(): void {
        const cutoff = timeManager.nowMs() - 60000;
        for (const [key] of this.timestampCache) {
            if (key < cutoff) {
                this.timestampCache.delete(key);
            }
        }
    }
}
```

---

## 🧪 Testing and Mocking

### **Deterministic Time Testing**

```typescript
import { setupFakeTime } from "./utils/time-testing";

test("market hours calculation", () => {
    const timeUtils = setupFakeTime("2024-01-01T14:30:00.000Z"); // US market open
    
    // Test market open logic
    expect(isMarketOpen('US')).toBe(true);
    
    // Advance time to market close
    timeUtils.advanceTime(6.5 * 60 * 60 * 1000); // 6.5 hours
    expect(isMarketOpen('US')).toBe(false);
    
    timeUtils.resetTime();
});
```

### **Time Scenarios for Complex Tests**

```typescript
test("arbitrage opportunity lifecycle", async () => {
    const timeManager = TimeTestManager.getInstance();
    
    // Create scenario with multiple events
    timeManager.createScenario('arbitrage-lifecycle', 
        new Date('2024-01-01T15:00:00.000Z'),
        [
            {
                timestamp: new Date('2024-01-01T15:00:01.000Z'),
                description: 'Price discrepancy detected',
                callback: () => detectArbitrage()
            },
            {
                timestamp: new Date('2024-01-01T15:00:05.000Z'),
                description: 'Arbitrage executed',
                callback: () => executeArbitrage()
            }
        ]
    );
    
    await timeManager.runScenario('arbitrage-lifecycle');
    
    expect(arbitrageDetected).toBe(true);
    expect(arbitrageExecuted).toBe(true);
});
```

### **Performance Testing with Mocked Time**

```typescript
test("message processing performance", async () => {
    const timeUtils = setupFakeTime("2024-01-01T12:00:00.000Z");
    const processor = new MessageProcessor();
    
    const benchmark = new PerformanceBenchmark();
    
    const result = await benchmark.benchmark('message_processing', () => {
        // Process 1000 messages with deterministic timing
        for (let i = 0; i < 1000; i++) {
            timeUtils.advanceTime(1); // 1ms between messages
            processor.processMessage(createMockMessage());
        }
    }, { iterations: 100 });
    
    expect(result.duration).toBeLessThan(1000000000); // Less than 1 second
    
    console.log(benchmark.formatResults());
});
```

---

## 🌍 International Markets

### **Timezone Handling Strategy**

```typescript
// Market-specific time management
class MarketTimeManager {
    private timeManager: TimeManager;
    
    constructor() {
        this.timeManager = TimeManager.getInstance({
            timezone: 'UTC', // Always store in UTC
            enableHighPrecision: true
        });
    }
    
    // Get market-local timestamp
    getMarketTimestamp(market: MarketType): Date {
        switch (market) {
            case 'US':
                return this.timeManager.createTimestamp(
                    this.timeManager.now(), 
                    'America/New_York'
                );
            case 'EU':
                return this.timeManager.createTimestamp(
                    this.timeManager.now(), 
                    'Europe/London'
                );
            case 'ASIA':
                return this.timeManager.createTimestamp(
                    this.timeManager.now(), 
                    'Asia/Tokyo'
                );
            default:
                return this.timeManager.now();
        }
    }
    
    // Check if market is open
    isMarketOpen(market: MarketType): boolean {
        const marketTime = this.getMarketTimestamp(market);
        const hours = marketTime.getUTCHours();
        
        const marketHours = {
            'US': { open: 14, close: 21 },    // 9:30 AM - 4:00 PM ET
            'EU': { open: 8, close: 16 },     // 8:00 AM - 4:00 PM GMT
            'ASIA': { open: 0, close: 6 }     // 9:00 AM - 3:00 PM JST
        };
        
        const hoursForMarket = marketHours[market];
        return hours >= hoursForMarket.open && hours < hoursForMarket.close;
    }
}
```

### **Handling Daylight Saving Time**

```typescript
// DST-aware scheduling
class DSTAwareScheduler {
    private timeManager: TimeManager;
    
    scheduleMarketOpenTask(market: MarketType, task: () => void): void {
        const nextOpen = this.getNextMarketOpen(market);
        const delay = nextOpen.getTime() - this.timeManager.nowMs();
        
        setTimeout(task, delay);
    }
    
    private getNextMarketOpen(market: MarketType): Date {
        const now = this.timeManager.now();
        const marketTimezone = this.getMarketTimezone(market);
        const marketInfo = this.timeManager.getTimezoneInfo(marketTimezone);
        
        // Calculate next market open considering DST
        let nextOpen = this.timeManager.createTimestamp(now, marketTimezone);
        nextOpen.setUTCHours(this.getMarketOpenHour(market), 0, 0, 0);
        
        // If today's market is closed, schedule for next business day
        if (nextOpen <= now || !this.timeManager.isMarketOpen(market, nextOpen)) {
            nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
        }
        
        return nextOpen;
    }
}
```

---

## 📊 Benchmarking Guidelines

### **Micro-benchmarking Best Practices**

```typescript
// Use Bun's built-in benchmarking tools
import { benchmark } from "bun:bench";

benchmark("timestamp creation", () => {
    // Test different timestamp methods
    timeManager.now();
}, {
    iterations: 1000000,
    time: 1000 // Run for max 1 second
});

benchmark("message serialization", () => {
    const message = {
        type: "odds",
        timestamp: timeManager.now(),
        data: mockOdds
    };
    JSON.stringify(message);
}, {
    iterations: 100000,
    baseline: "without_timestamp" // Compare against baseline
});
```

### **Performance Profiling**

```typescript
// Profile WebSocket message handling
class WebSocketProfiler {
    private profileData: Array<{
        operation: string;
        duration: number;
        timestamp: Date;
    }> = [];
    
    profileOperation<T>(operation: string, fn: () => T): T {
        const start = timeManager.nanoseconds();
        const result = fn();
        const duration = timeManager.nanoseconds() - start;
        
        this.profileData.push({
            operation,
            duration,
            timestamp: timeManager.now()
        });
        
        return result;
    }
    
    generateReport(): string {
        const report = this.profileData.reduce((acc, data) => {
            if (!acc[data.operation]) {
                acc[data.operation] = {
                    count: 0,
                    totalDuration: 0,
                    avgDuration: 0,
                    maxDuration: 0,
                    minDuration: Infinity
                };
            }
            
            const stats = acc[data.operation];
            stats.count++;
            stats.totalDuration += data.duration;
            stats.avgDuration = stats.totalDuration / stats.count;
            stats.maxDuration = Math.max(stats.maxDuration, data.duration);
            stats.minDuration = Math.min(stats.minDuration, data.duration);
            
            return acc;
        }, {} as Record<string, any>);
        
        return JSON.stringify(report, null, 2);
    }
}
```

---

## ⚠️ Common Pitfalls

### **1. Mixing Time APIs**

```typescript
// ❌ Avoid: Mixing different time APIs
const start = Date.now();
const duration = performance.now() - start; // Incompatible units

// ✅ Prefer: Use consistent API
const start = performance.now();
const duration = performance.now() - start;
```

### **2. Timezone Confusion**

```typescript
// ❌ Avoid: Hardcoding timezone offsets
const easternTime = new Date(now.getTime() - (5 * 60 * 60 * 1000)); // Wrong for DST

// ✅ Prefer: Use proper timezone handling
const easternTime = timeManager.createTimestamp(now, 'America/New_York');
```

### **3. Precision Loss**

```typescript
// ❌ Avoid: Losing precision in calculations
const preciseTime = Bun.nanoseconds();
const roundedTime = Math.round(preciseTime / 1000000) * 1000000; // Lost precision

// ✅ Prefer: Maintain precision throughout
const preciseTime = Bun.nanoseconds();
const formattedTime = timeManager.formatDuration(preciseTime, 'nanoseconds');
```

### **4. Memory Leaks in Time Caches**

```typescript
// ❌ Avoid: Unbounded time caches
const timeCache = new Map<number, Date>();
function getCachedTime(timestamp: number): Date {
    if (!timeCache.has(timestamp)) {
        timeCache.set(timestamp, new Date(timestamp)); // Never cleared!
    }
    return timeCache.get(timestamp)!;
}

// ✅ Prefer: Bounded caches with cleanup
const timeCache = new Map<number, Date>();
const MAX_CACHE_SIZE = 1000;

function getCachedTime(timestamp: number): Date {
    if (timeCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entries
        const oldestKey = timeCache.keys().next().value;
        timeCache.delete(oldestKey);
    }
    
    if (!timeCache.has(timestamp)) {
        timeCache.set(timestamp, new Date(timestamp));
    }
    return timeCache.get(timestamp)!;
}
```

---

## 🔄 Migration Guide

### **From Date.now() to Enhanced Time Management**

```typescript
// Step 1: Replace direct Date.now() usage
// Before
function createMessage(data: any): Message {
    return {
        timestamp: Date.now(),
        data
    };
}

// After
function createMessage(data: any): Message {
    return {
        timestamp: timeManager.now(),
        data
    };
}

// Step 2: Update performance measurements
// Before
const start = Date.now();
// ... operation
const duration = Date.now() - start;

// After
timeManager.startTiming('operation');
// ... operation
const duration = timeManager.endTiming('operation');

// Step 3: Add timezone awareness
// Before
function isMarketOpen(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 16;
}

// After
function isMarketOpen(market: MarketType): boolean {
    return timeManager.isMarketOpen(market);
}
```

### **Gradual Adoption Strategy**

1. **Phase 1**: Install time management utilities
2. **Phase 2**: Replace timestamp creation in new code
3. **Phase 3**: Migrate performance-critical paths
4. **Phase 4**: Update existing timestamp usage
5. **Phase 5**: Add timezone awareness
6. **Phase 6**: Implement comprehensive testing

---

## 📈 Performance Metrics

### **Expected Performance Characteristics**

| Operation | Target Performance | Measurement Method |
|-----------|-------------------|-------------------|
| `timeManager.now()` | < 100ns | `Bun.nanoseconds()` |
| `timeManager.nanoseconds()` | < 50ns | Direct measurement |
| Message timestamping | < 200ns | Benchmark suite |
| Timezone conversion | < 500ns | Performance test |
| Market hours check | < 1μs | Unit test timing |

### **Monitoring and Alerting**

```typescript
// Performance monitoring setup
class TimePerformanceMonitor {
    private alertThresholds = {
        timestampCreation: 1000, // 1μs
        timezoneConversion: 5000, // 5μs
        marketHoursCheck: 10000   // 10μs
    };
    
    monitorTimestampCreation(): void {
        const start = Bun.nanoseconds();
        const timestamp = timeManager.now();
        const duration = Bun.nanoseconds() - start;
        
        if (duration > this.alertThresholds.timestampCreation) {
            console.warn(`⚠️ Slow timestamp creation: ${duration}ns`);
        }
    }
}
```

---

## 🎉 Conclusion

By implementing these time management best practices, your Bun applications will achieve:

- **Consistent Performance**: Predictable timing behavior across all operations
- **Global Compatibility**: Proper timezone handling for international markets
- **Test Reliability**: Deterministic time behavior for comprehensive testing
- **Monitoring Excellence**: Built-in performance tracking and alerting
- **Maintainability**: Centralized time management reduces code duplication

The enhanced time management system provides a solid foundation for high-performance, globally-aware applications while maintaining the simplicity and speed that makes Bun exceptional.

---

## 📚 Additional Resources

- [Bun Documentation - Time APIs](https://bun.sh/docs/api/utils)
- [Bun Testing - Time Mocking](https://bun.sh/docs/test/dates-times)
- [Performance Benchmarking Guide](https://bun.com/docs/project/benchmarking)
- [WebSocket Performance Best Practices](./WEBSOCKET_LINT_FIXES.md)

---

*Last updated: January 2024*
*Version: 1.0.0*
*Compatible with Bun v1.0.18+*
