# Date/Time Standardization Guide

This document outlines the standardized approach to handling dates, times, and timezones throughout the Foxy Proxy codebase.

## 🎯 Objectives

- **Consistency**: Uniform date/time handling across all components
- **Timezone Awareness**: Proper timezone management for global applications
- **Type Safety**: TypeScript interfaces for all date/time operations
- **Performance**: Efficient date/time calculations and formatting
- **Maintainability**: Centralized date/time logic

## 📋 Standards

### 🌍 Timezone Standards

1. **Storage Format**: All dates stored in UTC as ISO 8601 strings
2. **Display Format**: User's local timezone for UI display
3. **API Communication**: UTC timestamps in ISO format
4. **File Naming**: UTC with URL-safe characters

### 📅 Date Formats

| Purpose              | Format    | Example                    | Usage           |
| -------------------- | --------- | -------------------------- | --------------- |
| **Storage/API**      | ISO 8601  | `2024-01-15T10:30:00.000Z` | Database, APIs  |
| **Display Date**     | Localized | `Jan 15, 2024`             | UI components   |
| **Display DateTime** | Localized | `Jan 15, 2024 10:30`       | Lists, tables   |
| **File Timestamp**   | URL-safe  | `2024-01-15_10-30-00`      | File names      |
| **Log Format**       | Standard  | `2024-01-15 10:30:00.123`  | Logs, debugging |

### ⏰ Time Standards

- **Timestamps**: Milliseconds since epoch for calculations
- **Unix Time**: Seconds since epoch for APIs
- **Performance**: High-precision timing with PerformanceTimer
- **Relative Time**: Human-readable "2 hours ago" format

## 🛠️ Implementation

### Core Classes

#### `StandardDate`

Extended Date class with timezone awareness and formatting:

```typescript
import { StandardDate, DateUtils } from "../utils/date-utils";

// Create current date
const now = new StandardDate();

// Create from ISO string
const date = new StandardDate("2024-01-15T10:30:00.000Z");

// Format for display
const display = date.format("DISPLAY_DATETIME"); // "Jan 15, 2024 10:30"

// Get UTC timestamp
const utc = date.toUTC(); // "2024-01-15T10:30:00.000Z"

// Add time
const future = date.add(2, "hours");
```

#### `DateUtils`

Static utility functions for common operations:

```typescript
import { DateUtils } from "../utils/date-utils";

// Current timestamp
const timestamp = DateUtils.timestamp();

// File-safe timestamp
const fileTimestamp = DateUtils.fileTimestamp(); // "2024-01-15_10-30-00"

// Parse and validate
const date = DateUtils.parse("2024-01-15T10:30:00.000Z");

// Format duration
const duration = DateUtils.formatDuration(3661000); // "1h 1m 1s"

// Get timezone offset
const offset = DateUtils.getTimezoneOffset(); // "UTC-05:00"
```

#### `PerformanceTimer`

High-precision timing for performance monitoring:

```typescript
import { PerformanceTimer } from "../utils/date-utils";

const timer = new PerformanceTimer();

// ... perform operation

const duration = timer.stop(); // milliseconds
const formatted = timer.getFormattedDuration(); // "2.5s"
```

## 📖 Usage Patterns

### 1. Display Dates in UI

```typescript
// ❌ Before
const display = new Date(dateString).toLocaleDateString();

// ✅ After
const display = DateUtils.from(dateString).format("DISPLAY_DATE");
```

### 2. File Naming

```typescript
// ❌ Before
const filename = `file-${Date.now()}.txt`;

// ✅ After
const filename = `file-${DateUtils.fileTimestamp()}.txt`;
```

### 3. API Timestamps

```typescript
// ❌ Before
const apiData = {
  created: new Date().toISOString(),
  updated: Date.now()
};

// ✅ After
const apiData = {
  created: DateUtils.now().format("ISO"),
  updated: DateUtils.timestamp()
};
```

### 4. Performance Timing

```typescript
// ❌ Before
const start = Date.now();
// ... operation
const duration = Date.now() - start;

// ✅ After
const timer = new PerformanceTimer();
// ... operation
const duration = timer.getDuration();
```

### 5. Relative Time Display

```typescript
// ❌ Before
const timeAgo = (date: Date) => {
  const diff = Date.now() - date.getTime();
  // manual calculation...
};

// ✅ After
const timeAgo = DateUtils.from(dateString).getRelativeTime();
```

## 🔄 Migration Guide

### Step 1: Update Imports

```typescript
// Add to imports
import { DateUtils, StandardDate, PerformanceTimer } from "../utils/date-utils";
```

### Step 2: Replace Date.now()

```typescript
// Find all instances of:
Date.now();

// Replace with:
DateUtils.timestamp();
```

### Step 3: Replace new Date()

```typescript
// Find all instances of:
new Date();
new Date(timestamp);
new Date(isoString);

// Replace with:
DateUtils.now().toDate();
DateUtils.from(timestamp).toDate();
DateUtils.from(isoString).toDate();
```

### Step 4: Replace Formatting

```typescript
// Find all instances of:
.toISOString()
.toLocaleDateString()
.toLocaleString()

// Replace with:
.format('ISO')
.format('DISPLAY_DATE')
.format('DISPLAY_DATETIME')
```

### Step 5: Update Performance Timing

```typescript
// Find patterns like:
const start = Date.now();
// ... code
const duration = Date.now() - start;

// Replace with:
const timer = new PerformanceTimer();
// ... code
const duration = timer.getDuration();
```

## 📊 File Migration Status

### ✅ Completed

- `packages/dashboard/src/components/FileUpload.tsx`
- `packages/dashboard/src/utils/date-utils.ts`
- `packages/dashboard/src/utils/date-migration.ts`

### 🔄 In Progress

- `packages/dashboard/src/components/ADBCommandPanel.tsx`
- `packages/dashboard/src/utils/fileHandler.ts`
- `packages/dashboard/src/utils/enhanced/unified-manager.ts`

### ⏳ Pending

- `packages/dashboard/src/pages/OverviewPage/index.tsx`
- `packages/dashboard/src/pages/ProxiesPage/index.tsx`
- `packages/dashboard/src/components/IPFoxyConfigPanel.tsx`
- `packages/dashboard/src/utils/ipfoxy/manager.ts`
- `packages/dashboard/src/utils/duoplus/duoplus.ts`
- `packages/dashboard/src/components/BucketVisualizer.tsx`
- `packages/dashboard/src/utils/unified/manager.ts`
- `packages/dashboard/src/components/BunFileUpload.tsx`
- All scaling utility files

## 🧪 Testing

### Unit Tests

```typescript
import { DateUtils, StandardDate, PerformanceTimer } from "../utils/date-utils";

describe("DateUtils", () => {
  it("should create file-safe timestamp", () => {
    const timestamp = DateUtils.fileTimestamp();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });

  it("should format duration correctly", () => {
    const duration = DateUtils.formatDuration(3661000);
    expect(duration).toBe("1h 1m 1s");
  });
});

describe("PerformanceTimer", () => {
  it("should measure elapsed time", () => {
    const timer = new PerformanceTimer();
    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 100) {
      /* wait */
    }

    const duration = timer.stop();
    expect(duration).toBeGreaterThan(90);
    expect(duration).toBeLessThan(200);
  });
});
```

### Integration Tests

```typescript
describe("Date Integration", () => {
  it("should handle timezone conversion", () => {
    const utcDate = new StandardDate("2024-01-15T10:30:00.000Z");
    const localDate = utcDate.format("DISPLAY_DATETIME");

    // Should display in user's local timezone
    expect(localDate).toContain("2024");
    expect(localDate).toContain("10:30");
  });
});
```

## 🔧 Configuration

### Bun Timezone Support

Bun provides built-in timezone support through the `TZ` environment variable. This is crucial for consistent date/time handling across different environments.

#### Setting Timezone Programmatically

```typescript
// Set timezone for the lifetime of the bun process
process.env.TZ = "America/New_York";

// All subsequent Date instances will use this timezone
const now = new Date();
console.log(now.getHours()); // Will reflect New York time
```

#### Setting Timezone from Command Line

```bash
# Set timezone when running bun commands
TZ=America/New_York bun run dev
TZ=UTC bun test
TZ=Europe/London bun build
```

#### Timezone in Different Environments

```typescript
// Development - uses system timezone
new Date().getHours(); // => System local time

// Testing - Bun defaults to UTC for determinism
process.env.TZ = "UTC";
new Date().getHours(); // => UTC time

// Production - explicit timezone setting
process.env.TZ = "America/New_York";
new Date().getHours(); // => New York time
```

#### Integration with DateUtils

```typescript
import { DateUtils } from "../utils/date-utils";

// Set timezone before using date utilities
process.env.TZ = "America/New_York";

// DateUtils will respect the timezone setting
const localTime = DateUtils.now().format("DISPLAY_DATETIME");
const utcTime = DateUtils.now().format("ISO");

// Get current timezone info
console.log("Current TZ:", process.env.TZ);
console.log("Local display:", localTime);
console.log("UTC storage:", utcTime);
```

### Environment Variables

```bash
# Default timezone for operations
DEFAULT_TIMEZONE=UTC

# Display timezone (user's local)
DISPLAY_TIMEZONE=local

# Bun process timezone
TZ=America/New_York

# Date format override
DATE_FORMAT_OVERRIDE=MM/DD/YYYY
```

### TypeScript Configuration

```typescript
// types/date.d.ts
export interface StandardDateConfig {
  timezone: string;
  locale: string;
  format: string;
}

// Extend Process interface for TZ
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TZ?: string;
      DEFAULT_TIMEZONE?: string;
      DISPLAY_TIMEZONE?: string;
    }
  }
}
```

## 📈 Performance Considerations

### Optimization Tips

1. **Reuse Date Objects**: Create once, reuse multiple times
2. **Cache Formatted Dates**: Format once, cache for display
3. **Use PerformanceTimer**: For accurate timing measurements
4. **Avoid Timezone Conversion**: Store in UTC, convert only for display

### Memory Management

```typescript
// ✅ Good - Reuse date utilities
const dateUtils = DateUtils;
const formatted = dateUtils.now().format("DISPLAY_DATE");

// ❌ Avoid - Creating many Date objects
for (let i = 0; i < 1000; i++) {
  new Date().toISOString(); // Inefficient
}
```

## 🚨 Common Pitfalls

### 1. Timezone Confusion

```typescript
// ❌ Wrong - Mixing timezones
const local = new Date();
const utc = local.toISOString(); // May not represent intended time

// ✅ Correct - Explicit timezone handling
const utc = DateUtils.now().format("ISO");
const local = DateUtils.now().format("DISPLAY_DATETIME");
```

### 2. Date Parsing

```typescript
// ❌ Wrong - Ambiguous date parsing
const date = new Date("01/02/2024"); // Could be Jan 2 or Feb 1

// ✅ Correct - Explicit ISO format
const date = DateUtils.from("2024-01-02T00:00:00.000Z");
```

### 3. Performance Timing

```typescript
// ❌ Wrong - Inaccurate timing
const start = new Date().getTime();
// ... operation
const duration = new Date().getTime() - start;

// ✅ Correct - High-precision timing
const timer = new PerformanceTimer();
// ... operation
const duration = timer.getDuration();
```

## 🔍 Debugging

### Common Issues

1. **Invalid Date Strings**: Use `DateUtils.parse()` for validation
2. **Timezone Issues**: Check `DateUtils.getTimezoneOffset()`
3. **Performance Problems**: Use `PerformanceTimer` for accurate measurement

### Debug Utilities

```typescript
// Debug date parsing
const debug = (dateString: string) => {
  const parsed = DateUtils.parse(dateString);
  console.log("Input:", dateString);
  console.log("Valid:", parsed !== null);
  console.log("UTC:", parsed?.toUTC());
  console.log("Local:", parsed?.format("DISPLAY_DATETIME"));
};
```

## 📚 References

- [MDN Date Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [ISO 8601 Standard](https://en.wikipedia.org/wiki/ISO_8601)
- [Timezone Database](https://en.wikipedia.org/wiki/Tz_database)

---

This standardization ensures consistent, reliable date/time handling across the entire Foxy Proxy application.
