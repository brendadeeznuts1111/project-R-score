# Bun Utilities - Complete Guide

## Overview

A comprehensive suite of Bun-native utilities organized into a unified namespace for easy access to all functionality.

## Quick Start

```typescript
import { BunUtilities } from './src/utils/bun-utilities';

// Generate UUID
const id = BunUtilities.uuid();

// Measure string width
const width = BunUtilities.stringWidth('Hello 🌍');

// Create progress bar
const bar = BunUtilities.createProgressBar(75, 100, 30);

// Format table
const table = BunUtilities.formatTable(data);
```

## Available Utilities

### 📦 UUID Generation

```typescript
// Generate UUID v7
const uuid = BunUtilities.uuid();

// Generate batch
const uuids = BunUtilities.uuidBatch(100);

// Parse UUID
const parsed = BunUtilities.parseUUID(uuid);
// { timestamp: 1234567890, version: 7, variant: 'RFC4122', bytes: Buffer }

// Sort UUIDs by timestamp
const sorted = BunUtilities.sortUUIDs(uuids);
```

### 📏 String Measurement

```typescript
// Measure string width (handles ANSI codes and emojis)
const width = BunUtilities.stringWidth('Hello \x1b[31mworld\x1b[0m! 🌍');

// Strip ANSI codes
const clean = BunUtilities.stripANSI(text);

// Measure and wrap text
const result = BunUtilities.measureText('Long text...', 40);
// { lines: [...], width: 40, height: 3, fits: true }

// Create progress bar
const bar = BunUtilities.createProgressBar(75, 100, 30, {
  color: 'cyan',
  showPercentage: true,
  showNumbers: true
});

// Create text table
const table = BunUtilities.createTextTable([
  ['Name', 'Age'],
  ['Alice', '30'],
  ['Bob', '25']
], { border: true, header: true });
```

### 🌐 HTML Utilities

```typescript
// Escape HTML
const escaped = BunUtilities.escapeHTML('<script>alert("XSS")</script>');

// Sanitize HTML
const safe = BunUtilities.sanitizeHTML(userInput, {
  allowedTags: ['b', 'i', 'a'],
  allowedAttributes: { a: ['href'] }
});

// Create template
const html = BunUtilities.createTemplate(
  '<h1>{{title}}</h1><p>{{content}}</p>',
  { title: 'Hello', content: 'World' }
);

// Highlight syntax
const highlighted = BunUtilities.highlightSyntax(code, 'javascript');
```

### 🎨 Color Utilities

```typescript
// Convert HEX to RGB
const rgb = BunUtilities.hexToRGB('#FF5733');
// { r: 255, g: 87, b: 51 }

// Convert RGB to HEX
const hex = BunUtilities.rgbToHex({ r: 255, g: 87, b: 51 });
// '#ff5733'

// Convert RGB to HSL
const hsl = BunUtilities.rgbToHSL({ r: 255, g: 87, b: 51 });
// { h: 11, s: 100, l: 60 }

// Convert HSL to RGB
const rgb2 = BunUtilities.hslToRGB({ h: 11, s: 100, l: 60 });

// Create gradient text
const gradient = BunUtilities.createGradient(
  'Hello, World!',
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 0, b: 255 }
);

// Generate color palette
const palette = BunUtilities.generatePalette('#3498db', 5);
```

### 📊 Tables & Data

```typescript
// Format table
const table = BunUtilities.formatTable(data, columns);

// Create heatmap
const heatmap = BunUtilities.createHeatmap(data, 'value', {
  minColor: 'green',
  maxColor: 'red'
});

// Inspect array
const formatted = BunUtilities.inspectArray([1, 2, 3], {
  maxItems: 10,
  separator: ', '
});

// Compare arrays
const comparison = BunUtilities.compareArrays([1, 2, 3], [2, 3, 4]);
// { equal: false, onlyInFirst: [1], onlyInSecond: [4], common: [2, 3] }
```

### ⚡ Performance

```typescript
// Benchmark functions
const results = BunUtilities.benchmark([
  { name: 'Function A', fn: () => doSomething() },
  { name: 'Function B', fn: () => doSomethingElse() }
], 1000);

// Create benchmark instance
const bench = BunUtilities.createBenchmark();
const result = bench.run(() => expensiveOperation(), 1000);

// Performance monitor
const monitor = BunUtilities.createMonitor();
monitor.measure('operation', () => {
  // Your code here
});
const metrics = monitor.getMetrics('operation');
console.log(monitor.formatMetrics());
```

## Direct Imports

You can also import individual utilities directly:

```typescript
import {
  StringMeasurement,
  HTMLUtils,
  Color,
  PerformanceMonitor,
  DistributedID,
  ArrayInspector,
  AdvancedTable,
  Benchmark
} from './src/utils/bun-utilities';

// Use directly
const width = StringMeasurement.width('Hello');
const rgb = Color.hexToRGB('#FF5733');
```

## File Structure

```text
src/utils/
├── bun-utilities.ts          # Unified namespace export
├── string-measurement.ts     # String width, alignment, truncation, progress bars
├── html-utils.ts            # HTML escaping, sanitization, templating
├── color-utils.ts           # Color conversion (RGB, HSL, HEX)
├── distributed-id.ts         # Distributed ID generation with node/sequence
├── performance-monitor.ts    # Performance monitoring with decorators
├── array-inspection.ts       # Array formatting and comparison
├── table-configuration.ts    # Advanced table formatting
└── benchmarking-suite.ts    # Benchmarking utilities
```

## Examples

See `examples/` directory for complete working examples:

- `bun-utilities-demo.ts` - Unified namespace demo
- `utils-demo.ts` - Individual utilities demo
- `distributed-id-demo.ts` - Distributed ID demo
- `performance-monitor-demo.ts` - Performance monitoring demo

## Built-in Bun APIs

The namespace also includes direct access to Bun's built-in APIs:

```typescript
BunUtilities.inspect(value, options);
BunUtilities.nanoseconds();
BunUtilities.randomUUIDv7();
BunUtilities.escapeHTMLBuiltIn(value);
BunUtilities.stringWidthBuiltIn(str);
```

## Type Exports

```typescript
import type { RGB, HSL } from './src/utils/bun-utilities';
```

## Best Practices

1. **Use BunUtilities namespace** for convenience and consistency
2. **Import individual classes** when you need advanced features
3. **Use PerformanceMonitor** for production performance tracking
4. **Use DistributedID** for distributed systems requiring node identification
5. **Use Color utilities** for terminal output and UI theming

## Integration

All utilities are exported from `src/utils/index.ts`:

```typescript
import {
  BunUtilities,
  StringMeasurement,
  HTMLUtils,
  Color,
  PerformanceMonitor,
  DistributedID
} from './src/utils';
```
