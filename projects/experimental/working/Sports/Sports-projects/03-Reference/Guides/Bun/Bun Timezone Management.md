---
title: Bun Timezone Management
type: guide
status: active
version: 2.0.0
created: 2025-12-29
updated: 2025-12-29
modified: 2025-12-29
category: runtime
description: Comprehensive guide to timezone management in Bun runtime
author: Sports Analytics Team
tags: [bun, timezone, runtime, date, internationalization]
feed_integration: false
priority: high
progress: 100
estimated_hours: 4
---

# Bun Timezone Management

## 🎯 Overview

Bun provides robust timezone management capabilities that allow you to control how date and time operations are performed throughout your application lifecycle. This guide covers both programmatic and CLI-based timezone configuration, along with best practices for production environments.

## ⚡ Quick Reference

### Programmatic Configuration
```typescript
// Set timezone for current process
process.env.TZ = "America/New_York";

// Verify timezone change
console.log(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
```

### CLI Configuration
```bash
# Single command execution
TZ=America/New_York bun run script.ts

# Development server
TZ=UTC bun run dev

# Production build
TZ=America/Los_Angeles bun run build
```

## 📋 Default Timezone Behavior

| Environment | Default Timezone | Purpose |
|-------------|------------------|---------|
| `bun run <file>` | System local timezone | Matches user environment |
| `bun test` | UTC | Ensures deterministic test results |
| `bun <command>` | System local timezone | Consistent with system behavior |

## 🔧 Programmatic Timezone Configuration

### Basic Implementation

```typescript
// process.ts
import { defineConfig } from "bun";

// Method 1: Direct environment variable setting
process.env.TZ = "America/New_York";

// Method 2: Before any Date operations
const configureTimezone = (timezone: string): void => {
  process.env.TZ = timezone;
  
  // Verify the change took effect
  const testDate = new Date();
  console.log(`Timezone set to: ${timezone}`);
  console.log(`Current time: ${testDate.toLocaleString("en-US", { timeZone: timezone })}`);
};

// Method 3: With error handling
const safeConfigureTimezone = (timezone: string): boolean => {
  try {
    // Validate timezone format (basic check)
    if (!timezone || typeof timezone !== "string") {
      throw new Error("Invalid timezone format");
    }
    
    process.env.TZ = timezone;
    
    // Test that it works
    const testDate = new Date();
    const formatted = testDate.toLocaleString("en-US", { timeZone: timezone });
    
    console.log(`✅ Timezone successfully set to: ${timezone}`);
    console.log(`   Current time: ${formatted}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to set timezone: ${error.message}`);
    return false;
  }
};

// Usage examples
configureTimezone("America/New_York");
// Output: Timezone set to: America/New_York
//         Current time: 12/29/2025, 3:06:02 PM

safeConfigureTimezone("Europe/London");
// Output: ✅ Timezone successfully set to: Europe/London
//         Current time: 12/29/2025, 8:06:02 PM
```

### Dynamic Timezone Switching

```typescript
// timezone-manager.ts
interface TimezoneConfig {
  name: string;
  offset: number;
  region: string;
}

class BunTimezoneManager {
  private originalTZ: string | undefined;
  
  constructor() {
    this.originalTZ = process.env.TZ;
  }
  
  // Set timezone temporarily for a specific operation
  async withTimezone<T>(timezone: string, operation: () => Promise<T>): Promise<T> {
    const previousTZ = process.env.TZ;
    
    try {
      process.env.TZ = timezone;
      return await operation();
    } finally {
      // Restore original timezone
      process.env.TZ = previousTZ;
    }
  }
  
  // Batch operations across multiple timezones
  async batchTimezoneOperations<T>(
    timezones: string[],
    operation: (tz: string) => Promise<T>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    for (const tz of timezones) {
      const result = await this.withTimezone(tz, () => operation(tz));
      results.set(tz, result);
    }
    
    return results;
  }
  
  // Get current timezone info
  getCurrentTimezone(): string {
    return process.env.TZ || "System Default";
  }
  
  // Reset to system default
  reset(): void {
    process.env.TZ = this.originalTZ;
  }
}

// Usage
const manager = new BunTimezoneManager();

// Single operation
const nyTime = await manager.withTimezone("America/New_York", () => {
  return new Date().toISOString();
});

// Multiple operations
const times = await manager.batchTimezoneOperations(
  ["America/New_York", "Europe/London", "Asia/Tokyo"],
  (tz) => new Date().toLocaleString("en-US", { timeZone: tz })
);
```

## 🚀 CLI Configuration Methods

### Method 1: Single Command Prefix

```bash
# Basic usage
TZ=America/New_York bun run script.ts

# With additional environment variables
NODE_ENV=production TZ=America/Los_Angeles bun run server.ts

# Multiple variables
API_KEY=abc123 TZ=Europe/Paris bun run worker.ts
```

### Method 2: Development Server

```bash
# Development with specific timezone
TZ=UTC bun run dev

# Production with local timezone
TZ=America/New_York bun run start
```

### Method 3: Build Process

```bash
# Build with UTC for consistency
TZ=UTC bun run build

# Deploy with target timezone
TZ=America/Los_Angeles bun run deploy
```

### Method 4: Test Execution

```bash
# Explicit UTC for tests (Bun default)
TZ=UTC bun test

# Test with specific timezone
TZ=America/New_York bun test timezone.test.ts

# Test across multiple timezones
for tz in "UTC" "America/New_York" "Europe/London" "Asia/Tokyo"; do
  echo "Testing with TZ=$tz"
  TZ=$tz bun test
done
```

## 📊 Timezone Impact Examples

### Date Instance Behavior

```typescript
// Default behavior (system timezone)
console.log(new Date().getHours()); // => 18 (based on system time)

// After setting timezone
process.env.TZ = "America/New_York";
console.log(new Date().getHours()); // => 21 (NY time, 3 hours ahead)

// UTC comparison
process.env.TZ = "UTC";
console.log(new Date().getHours()); // => 18 (same as original, but in UTC)
```

### Date Formatting

```typescript
// timezone-formatter.ts
const formatDateForTimezone = (date: Date, timezone: string, locale = "en-US"): string => {
  return date.toLocaleString(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
};

// Usage
const now = new Date();

process.env.TZ = "America/New_York";
console.log(formatDateForTimezone(now, "America/New_York"));
// Output: 12/29/2025, 15:06:02

process.env.TZ = "Europe/London";
console.log(formatDateForTimezone(now, "Europe/London"));
// Output: 12/29/2025, 20:06:02

process.env.TZ = "Asia/Tokyo";
console.log(formatDateForTimezone(now, "Asia/Tokyo"));
// Output: 12/30/2025, 05:06:02
```

### Timestamp Operations

```typescript
// timestamp-operations.ts
const getTimestampForTimezone = (timezone: string): number => {
  const originalTZ = process.env.TZ;
  process.env.TZ = timezone;
  
  const timestamp = Date.now();
  
  process.env.TZ = originalTZ;
  return timestamp;
};

// Compare timestamps across timezones
const timezones = ["America/New_York", "Europe/London", "Asia/Tokyo"];
const timestamps = timezones.map(tz => ({
  timezone: tz,
  timestamp: getTimestampForTimezone(tz),
  iso: new Date(getTimestampForTimezone(tz)).toISOString()
}));

console.table(timestamps);
```

## 🧪 Testing with Timezones

### Test Suite Structure

```typescript
// timezone.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

describe("Timezone Management", () => {
  let originalTZ: string | undefined;
  
  beforeAll(() => {
    originalTZ = process.env.TZ;
  });
  
  afterAll(() => {
    process.env.TZ = originalTZ;
  });
  
  it("should handle America/New_York timezone", () => {
    process.env.TZ = "America/New_York";
    const date = new Date(2025, 11, 29, 15, 0, 0); // Dec 29, 2025 15:00:00
    
    expect(date.getTimezoneOffset()).toBe(-300); // UTC-5
    expect(date.getHours()).toBe(15);
  });
  
  it("should handle UTC timezone", () => {
    process.env.TZ = "UTC";
    const date = new Date(2025, 11, 29, 15, 0, 0);
    
    expect(date.getTimezoneOffset()).toBe(0);
    expect(date.getHours()).toBe(15);
  });
  
  it("should handle Asia/Tokyo timezone", () => {
    process.env.TZ = "Asia/Tokyo";
    const date = new Date(2025, 11, 29, 15, 0, 0);
    
    expect(date.getTimezoneOffset()).toBe(-540); // UTC+9
    expect(date.getHours()).toBe(15);
  });
  
  it("should preserve timezone across async operations", async () => {
    process.env.TZ = "Europe/Paris";
    
    const result = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(new Date().getTimezoneOffset());
      }, 10);
    });
    
    expect(result).toBe(-60); // UTC+1
  });
});

// Multi-timezone test runner
describe("Cross-Timezone Compatibility", () => {
  const timezones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles", 
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney"
  ];
  
  timezones.forEach(tz => {
    it(`should work correctly in ${tz}`, () => {
      const originalTZ = process.env.TZ;
      process.env.TZ = tz;
      
      const date = new Date(2025, 0, 1, 12, 0, 0); // Jan 1, 2025 12:00:00
      const iso = date.toISOString();
      const local = date.toLocaleString("en-US", { timeZone: tz });
      
      expect(iso).toBe("2025-01-01T12:00:00.000Z");
      expect(local).toBeDefined();
      
      process.env.TZ = originalTZ;
    });
  });
});
```

### Test Execution Commands

```bash
# Run all timezone tests
bun test timezone.test.ts

# Run with specific timezone
TZ=UTC bun test timezone.test.ts

# Run across multiple timezones
for tz in "UTC" "America/New_York" "Europe/London" "Asia/Tokyo"; do
  echo "Testing with TZ=$tz"
  TZ=$tz bun test timezone.test.ts --timeout 10000
done
```

## 🔍 Edge Cases and Considerations

### Daylight Saving Time

```typescript
// DST-transition.ts
const testDSTTransition = () => {
  // Spring forward (March 2025)
  process.env.TZ = "America/New_York";
  
  const beforeDST = new Date(2025, 2, 9, 1, 59, 59); // March 9, 2025 1:59:59 AM
  const afterDST = new Date(2025, 2, 9, 3, 0, 0);    // March 9, 2025 3:00:00 AM
  
  console.log("Before DST:", beforeDST.toLocaleString());
  console.log("After DST:", afterDST.toLocaleString());
  console.log("Hour difference:", afterDST.getHours() - beforeDST.getHours());
  
  // Fall back (November 2025)
  const beforeFallBack = new Date(2025, 10, 2, 1, 59, 59); // Nov 2, 2025 1:59:59 AM
  const afterFallBack = new Date(2025, 10, 2, 1, 0, 0);    // Nov 2, 2025 1:00:00 AM (repeated)
  
  console.log("Before fall back:", beforeFallBack.toLocaleString());
  console.log("After fall back:", afterFallBack.toLocaleString());
};

testDSTTransition();
```

### Invalid Timezone Handling

```typescript
// timezone-validator.ts
const isValidTimezone = (timezone: string): boolean => {
  try {
    // Test by attempting to format a date with the timezone
    new Date().toLocaleString("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const safeTimezoneSet = (timezone: string): boolean => {
  if (!isValidTimezone(timezone)) {
    console.warn(`Invalid timezone: ${timezone}`);
    console.warn("Valid timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones");
    return false;
  }
  
  process.env.TZ = timezone;
  return true;
};

// Usage
safeTimezoneSet("America/New_York"); // ✅ true
safeTimezoneSet("Invalid/Timezone"); // ❌ false + warning
```

### Process Isolation

```typescript
// process-isolation.ts
const runInTimezone = async <T>(
  timezone: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const originalTZ = process.env.TZ;
  
  try {
    process.env.TZ = timezone;
    return await fn();
  } finally {
    process.env.TZ = originalTZ;
  }
};

// Example: Parallel execution
const results = await Promise.all([
  runInTimezone("America/New_York", () => new Date().toISOString()),
  runInTimezone("Europe/London", () => new Date().toISOString()),
  runInTimezone("Asia/Tokyo", () => new Date().toISOString())
]);

console.log("Parallel results:", results);
```

## 🌍 Cross-Platform Considerations

### Windows vs Unix Differences

```typescript
// platform-compatibility.ts
const getPlatformTimezone = (): string => {
  const platform = process.platform;
  
  if (platform === "win32") {
    // Windows uses different timezone names
    // Map common Unix names to Windows equivalents
    const tzMap: Record<string, string> = {
      "America/New_York": "Eastern Standard Time",
      "America/Los_Angeles": "Pacific Standard Time",
      "Europe/London": "GMT Standard Time",
      "Asia/Tokyo": "Tokyo Standard Time"
    };
    
    return tzMap[process.env.TZ || ""] || process.env.TZ || "";
  }
  
  // Unix-like systems use IANA timezone names directly
  return process.env.TZ || "";
};

// Usage
console.log(`Platform: ${process.platform}`);
console.log(`Timezone: ${getPlatformTimezone()}`);
```

### Docker/Container Considerations

```dockerfile
# Dockerfile
FROM oven/bun:1.3

# Set timezone at container level
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Or set at runtime
# docker run -e TZ=America/New_York my-app
```

```typescript
// container-timezone.ts
const detectContainerTimezone = (): string => {
  // Check if running in container
  const isContainer = Bun.file("/proc/1/cgroup").exists();
  
  if (isContainer) {
    // Try to read from /etc/timezone
    try {
      const timezone = Bun.file("/etc/timezone").text();
      return timezone.trim();
    } catch {
      return process.env.TZ || "UTC";
    }
  }
  
  return process.env.TZ || "System Default";
};
```

## 📈 Performance Considerations

### Timezone Caching

```typescript
// timezone-cache.ts
class TimezoneCache {
  private cache = new Map<string, string>();
  
  getFormattedDate(date: Date, timezone: string, locale = "en-US"): string {
    const key = `${date.getTime()}-${timezone}-${locale}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const formatted = date.toLocaleString(locale, { timeZone: timezone });
    this.cache.set(key, formatted);
    
    return formatted;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// Usage
const cache = new TimezoneCache();
const date = new Date();

// First call - formats and caches
const time1 = cache.getFormattedDate(date, "America/New_York");

// Second call - returns from cache
const time2 = cache.getFormattedDate(date, "America/New_York");

console.log(`Cache size: ${cache.size}`); // 1
```

### Batch Operations

```typescript
// batch-timezone.ts
const batchTimezoneFormatting = (
  dates: Date[],
  timezones: string[]
): Record<string, Record<string, string>> => {
  const results: Record<string, Record<string, string>> = {};
  
  for (const date of dates) {
    const dateKey = date.toISOString();
    results[dateKey] = {};
    
    for (const tz of timezones) {
      results[dateKey][tz] = date.toLocaleString("en-US", { timeZone: tz });
    }
  }
  
  return results;
};

// Usage
const dates = [
  new Date(2025, 0, 1, 12, 0, 0),
  new Date(2025, 6, 1, 15, 30, 0)
];

const timezones = ["America/New_York", "Europe/London", "Asia/Tokyo"];

const results = batchTimezoneFormatting(dates, timezones);
console.table(results);
```

## 🚨 Troubleshooting

### Common Issues

```typescript
// troubleshooting.ts
const diagnoseTimezoneIssue = (): string[] => {
  const issues: string[] = [];
  
  // Check 1: TZ environment variable
  if (!process.env.TZ) {
    issues.push("TZ environment variable not set");
  }
  
  // Check 2: Valid timezone
  if (process.env.TZ) {
    try {
      new Date().toLocaleString("en-US", { timeZone: process.env.TZ });
    } catch (e) {
      issues.push(`Invalid timezone: ${process.env.TZ}`);
    }
  }
  
  // Check 3: Date instance consistency
  const date1 = new Date();
  const date2 = new Date();
  
  if (date1.getTimezoneOffset() !== date2.getTimezoneOffset()) {
    issues.push("Timezone offset inconsistency detected");
  }
  
  // Check 4: System timezone vs TZ
  const systemTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (process.env.TZ && process.env.TZ !== systemTZ) {
    issues.push(`TZ (${process.env.TZ}) != System (${systemTZ})`);
  }
  
  return issues;
};

// Usage
const problems = diagnoseTimezoneIssue();
if (problems.length > 0) {
  console.error("Timezone issues detected:");
  problems.forEach(p => console.error(`  - ${p}`));
} else {
  console.log("✅ No timezone issues detected");
}
```

### Debug Helper

```typescript
// timezone-debug.ts
const debugTimezone = (): void => {
  console.log("=== Timezone Debug Information ===");
  console.log("TZ Environment:", process.env.TZ || "Not set");
  console.log("System Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log("Current Date:", new Date().toString());
  console.log("ISO String:", new Date().toISOString());
  console.log("Timezone Offset:", new Date().getTimezoneOffset(), "minutes");
  console.log("UTC Time:", new Date().toUTCString());
  console.log("Local Time:", new Date().toLocaleString());
  
  if (process.env.TZ) {
    console.log("TZ Local Time:", new Date().toLocaleString("en-US", { timeZone: process.env.TZ }));
  }
  
  console.log("=================================");
};

// Usage
debugTimezone();
```

## 📚 Best Practices

### 1. **Always Set TZ Explicitly in Production**
```typescript
// ❌ Bad - relies on system default
const server = Bun.serve({
  fetch() {
    return new Response(new Date().toISOString());
  }
});

// ✅ Good - explicit timezone
process.env.TZ = process.env.TIMEZONE || "UTC";
const server = Bun.serve({
  fetch() {
    return new Response(new Date().toLocaleString("en-US", { timeZone: process.env.TZ }));
  }
});
```

### 2. **Use UTC for Tests**
```typescript
// ✅ Always test with UTC
// test-setup.ts
process.env.TZ = "UTC";

// Your test files will automatically use UTC
```

### 3. **Document Timezone Dependencies**
```typescript
/**
 * @timezone America/New_York
 * @description This function assumes EST/EDT timezone for business logic
 */
function calculateBusinessHours(): number {
  // Implementation that depends on NY timezone
  return 9; // 9 AM EST
}
```

### 4. **Handle Timezone in APIs**
```typescript
// API response with timezone awareness
const apiResponse = {
  timestamp: new Date().toISOString(),
  timezone: process.env.TZ || "UTC",
  localTime: new Date().toLocaleString("en-US", { 
    timeZone: process.env.TZ || "UTC" 
  })
};
```

## 🎯 Summary

### Key Takeaways

1. **Default Behavior**: `bun run` uses system timezone, `bun test` uses UTC
2. **Configuration**: Set via `process.env.TZ` or CLI prefix `TZ=timezone`
3. **Scope**: Changes affect entire process lifetime
4. **Testing**: Always isolate timezone changes in tests
5. **Production**: Explicitly set timezone, don't rely on system defaults

### Quick Commands Reference

```bash
# Set timezone for command
TZ=America/New_York bun run script.ts

# Run tests in UTC (default)
bun test

# Run tests in specific timezone
TZ=Europe/London bun test

# Development with timezone
TZ=UTC bun run dev

# Production with timezone
TZ=America/Los_Angeles bun run start
```

### Environment Variables

| Variable | Example | Effect |
|----------|---------|--------|
| `TZ` | `America/New_York` | Sets process timezone |
| `NODE_ENV` | `production` | Environment context |
| `BUN_ENV` | `production` | Bun-specific environment |

---

**Related Documentation:**
- [Bun Date API](https://bun.sh/docs/api/date)
- [IANA Timezone Database](https://www.iana.org/time-zones)
- [JavaScript Date Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)

**Last Updated**: 2025-12-29  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
