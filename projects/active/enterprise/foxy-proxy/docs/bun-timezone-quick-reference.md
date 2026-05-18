# Bun Timezone Quick Reference

## 🚀 Quick Start

### Run the Demo

```bash
# Interactive demo showing all timezone features
bun run packages/dashboard/src/utils/bun-timezone-demo.ts

# With specific timezone
TZ=Europe/London bun run packages/dashboard/src/utils/bun-timezone-demo.ts
```

### Programmatic Setup

```typescript
// Set timezone for the entire process
process.env.TZ = "America/New_York";

// All subsequent Date instances use this timezone
const now = new Date();
console.log(now.getHours()); // New York time
```

### Command Line Setup

```bash
# Set timezone for single command
TZ=America/New_York bun run dev
TZ=UTC bun test
TZ=Europe/London bun build

# Set timezone for session
export TZ=America/New_York
bun run dev
```

## 📋 Common Timezone Patterns

### Development Environment

```typescript
// Use system timezone (default)
// No TZ setting needed
const devTime = new Date();
```

### Testing Environment

```typescript
// Force UTC for deterministic tests
process.env.TZ = "UTC";
const testTime = new Date();
```

### Production Environment

```typescript
// Use configured timezone
process.env.TZ = process.env.TZ || "America/New_York";
const prodTime = new Date();
```

## 🔧 Integration with DateUtils

```typescript
import { DateUtils } from "./utils/date-utils";

// Set timezone
DateUtils.setBunTimezone("America/New_York");

// Get timezone info
console.log("Current TZ:", DateUtils.getBunTimezone());
console.log("Effective TZ:", DateUtils.getEffectiveTimezone());

// Standardized formatting
const now = DateUtils.now();
console.log("UTC storage:", now.format("ISO"));
console.log("Local display:", now.format("DISPLAY_DATETIME"));
```

## 🌍 Supported Timezones

```typescript
// Common timezones
"UTC";
"America/New_York";
"America/Los_Angeles";
"America/Chicago";
"Europe/London";
"Europe/Paris";
"Asia/Tokyo";
"Asia/Shanghai";
"Australia/Sydney";

// Check if supported
if (DateUtils.isTimezoneSupported("America/New_York")) {
  DateUtils.setBunTimezone("America/New_York");
}
```

## 📁 File Naming (Always UTC)

```typescript
// File timestamps are always UTC-based for consistency
const filename = `backup-${DateUtils.fileTimestamp()}.json`;
// Result: backup-2026-01-09_21-46-10.json (UTC)
```

## 🌐 API Pattern

```typescript
// API: Always return UTC
const apiResponse = {
  timestamp: DateUtils.now().format("ISO"),
  data: "..."
};

// Client: Display in local timezone
const localTime = DateUtils.from(apiResponse.timestamp).format("DISPLAY_DATETIME");
```

## ⚡ Performance Considerations

- Timezone changes affect the entire process
- File timestamps remain UTC-based for consistency
- Performance timing is unaffected by timezone
- Use UTC for storage, local for display

## 🧪 Testing with Timezones

```typescript
// Test setup - force UTC
beforeAll(() => {
  process.env.TZ = "UTC";
});

// Test deterministic dates
test("date formatting", () => {
  const date = new Date("2026-01-09T21:46:00.000Z");
  expect(date.getHours()).toBe(21); // Always UTC in tests
});
```

## 🔍 Debugging

```typescript
// Check current timezone state
console.log("TZ env:", process.env.TZ);
console.log("Date hours:", new Date().getHours());
console.log("DateUtils TZ:", DateUtils.getBunTimezone());
console.log("Effective TZ:", DateUtils.getEffectiveTimezone());
console.log("Offset:", DateUtils.getCurrentTimezoneOffset());
```

## 📝 Environment Variables

```bash
# .env file
TZ=America/New_York
NODE_ENV=production

# package.json scripts
{
  "scripts": {
    "dev": "bun run dev",
    "dev:ny": "TZ=America/New_York bun run dev",
    "test": "TZ=UTC bun test",
    "build": "TZ=UTC bun build"
  }
}
```

## 🎯 Best Practices

1. **Storage**: Always use UTC ISO strings
2. **Display**: Convert to user's local timezone
3. **Files**: Use UTC timestamps for consistency
4. **Tests**: Force UTC for determinism
5. **APIs**: Return UTC, let clients handle display
6. **Performance**: Timezone doesn't affect timing measurements

## 🚨 Common Pitfalls

- ❌ Mixing timezones in the same process
- ❌ Using local timestamps for file names
- ❌ Storing local time in databases
- ❌ Not setting timezone in tests
- ❌ Assuming client timezone matches server

✅ **Do**: Use UTC for storage, local for display
✅ **Do**: Set timezone explicitly in tests
✅ **Do**: Use DateUtils for consistent formatting
✅ **Do**: Document timezone requirements
✅ **Do**: Test timezone changes in your app
