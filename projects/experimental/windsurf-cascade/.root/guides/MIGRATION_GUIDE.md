# Migration Guide: Streamlined Synthetic Arbitrage Platform

## Overview

This guide helps you migrate from the overlapping, distributed codebase to the streamlined, focused synthetic arbitrage platform.

## 🎯 Migration Goals

- **Remove Overlap**: Consolidate duplicate functionality
- **Focus on Core**: Emphasize synthetic arbitrage capabilities
- **Streamline Dependencies**: Reduce external package requirements
- **Improve Performance**: Leverage Bun v1.3 optimizations
- **Simplify Structure**: Clear separation of concerns

## 📁 New Structure

### Core Package (`packages/odds-core/`)

```
src/
├── index-consolidated.ts          # Main export point
├── types.ts                       # Core type definitions
├── constants.ts                   # Configuration constants
├── utils/
│   └── index-streamlined.ts       # Streamlined utilities
├── detectors/
│   └── synthetic-arbitrage-detector.ts
├── processors/
│   └── multi-period-stream-processor.ts
├── trackers/
│   └── synthetic-position-tracker.ts
└── examples/
    └── synthetic-arbitrage-unified.ts
```

### WebSocket Package (`packages/odds-websocket/`)

```
src/
├── server-v13.ts                  # Main WebSocket server
└── examples/
    └── websocket-server-examples.ts
```

## 🔄 Import Changes

### Before (Overlapping Structure)
```typescript
// Multiple imports from different locations
import { SyntheticArbitrageDetector } from '@odds-core/detectors';
import { MultiPeriodStreamProcessor } from '@odds-core/processors';
import { SyntheticPositionTracker } from '@odds-core/trackers';
import { MetadataValidator } from '@odds-core/utils/metadata';
```

### After (Streamlined Structure)
```typescript
// Single unified import
import {
    SyntheticArbitrageDetector,
    MultiPeriodStreamProcessor,
    SyntheticPositionTracker,
    MetadataValidator
} from 'odds-core';
```

## 📦 Package Changes

### odds-core Package

#### Dependencies Removed
- `date-fns` → Use Bun's native Date utilities
- `lodash` → Use native JavaScript functions
- `uuid` → Use Bun's `crypto.randomUUID()`
- `debug` → Use `console.log` or Bun's logging
- `@types/node` → Use Bun's built-in types

#### Dependencies Kept
- `@types/bun` → Bun-specific types
- `zod` → Runtime validation (minimal)

#### New Scripts
```json
{
  "examples": "bun run src/examples/synthetic-arbitrage-unified.ts",
  "test:synthetic": "bun test src/__tests__/synthetic-arbitrage/"
}
```

### odds-websocket Package

#### Dependencies Removed
- `uWebSockets.js` → Use Bun's native WebSocket
- `ws` → Use Bun's native WebSocket
- `socket.io` → Use Bun's native WebSocket
- `@types/ws` → Use Bun's WebSocket types
- `uuid` → Use Bun's `crypto.randomUUID()`
- `debug` → Use `console.log` or Bun's logging

#### Dependencies Kept
- `odds-core` → Core synthetic arbitrage functionality
- `@types/bun` → Bun-specific types

#### New Scripts
```json
{
  "start:hft": "WS_PORT=3001 WORKER_COUNT=8 ENABLE_SYNTHETIC_ARBITRAGE=true bun run src/server-v13.ts",
  "start:monitoring": "WS_PORT=3002 WORKER_COUNT=2 ENABLE_SYNTHETIC_ARBITRAGE=true bun run src/server-v13.ts",
  "examples": "bun run src/examples/websocket-server-examples.ts"
}
```

## 🏗️ Component Migration

### 1. Synthetic Arbitrage Detection

#### Before
```typescript
import { SyntheticArbitrageDetector } from '@odds-core/detectors/synthetic-arbitrage-detector';
import { SyntheticArbitrageDetectorFactory } from '@odds-core/detectors/synthetic-arbitrage-detector';
```

#### After
```typescript
import { SyntheticArbitrageDetector, SyntheticArbitrageDetectorFactory } from 'odds-core';
```

### 2. Multi-Period Processing

#### Before
```typescript
import { MultiPeriodStreamProcessor } from '@odds-core/processors/multi-period-stream-processor';
import { MultiPeriodStreamProcessorFactory } from '@odds-core/processors/multi-period-stream-processor';
```

#### After
```typescript
import { MultiPeriodStreamProcessor, MultiPeriodStreamProcessorFactory } from 'odds-core';
```

### 3. Position Tracking

#### Before
```typescript
import { SyntheticPositionTracker } from '@odds-core/trackers/synthetic-position-tracker';
import { SyntheticPositionTrackerFactory } from '@odds-core/trackers/synthetic-position-tracker';
```

#### After
```typescript
import { SyntheticPositionTracker, SyntheticPositionTrackerFactory } from 'odds-core';
```

### 4. WebSocket Server

#### Before
```typescript
import { BunV13WebSocketServer } from '@odds-websocket/server-v13';
```

#### After
```typescript
import { BunV13WebSocketServer } from 'odds-websocket';
```

## 📊 Example Migration

### Complete Workflow Example

#### Before (Multiple Files)
```typescript
// synthetic-arbitrage-example.ts
import { SyntheticArbitrageV1Factory } from '@testing/factories';

// synthetic-arbitrage-detector-examples.ts
import { SyntheticArbitrageDetector } from '@odds-core/detectors';

// multi-period-stream-examples.ts
import { MultiPeriodStreamProcessor } from '@odds-core/processors';

// synthetic-position-tracker-examples.ts
import { SyntheticPositionTracker } from '@odds-core/trackers';
```

#### After (Unified File)
```typescript
import {
    SyntheticArbitrageV1Factory,
    SyntheticArbitrageDetector,
    MultiPeriodStreamProcessor,
    SyntheticPositionTracker,
    SyntheticArbitrageUnifiedExamples
} from 'odds-core';

// Run complete workflow
await SyntheticArbitrageUnifiedExamples.demonstrateCompleteWorkflow();
```

## 🚀 Performance Improvements

### Bun v1.3 Optimizations

The streamlined version fully leverages Bun v1.3 features:

```typescript
// 500x faster postMessage for worker communication
worker.postMessage(data);

// 6-57x faster ANSI string stripping
const clean = stripANSI(text);

// RapidHash for fast hashing
const hash = rapidHash(input);

// Native WebSocket with enhanced compression
const server = Bun.serve({
  websocket: {
    perMessageDeflate: {
      compress: true,
      compressionOptions: { level: 6 }
    }
  }
});
```

### Memory Efficiency

```typescript
// Smol workers for reduced memory usage
const worker = new Worker(url, { smol: true });

// Efficient caching with automatic cleanup
const cache = new Map<string, any>();

// Optimized garbage collection
forceGarbageCollection();
```

## 🛠️ Migration Steps

### Step 1: Update Package Files
```bash
# Replace package.json with streamlined versions
cp packages/odds-core/package-streamlined.json packages/odds-core/package.json
cp packages/odds-websocket/package-streamlined.json packages/odds-websocket/package.json
```

### Step 2: Update Import Statements
```bash
# Find and replace old imports
find . -name "*.ts" -type f -exec sed -i 's/@odds-core\/detectors/odds-core/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/@odds-core\/processors/odds-core/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/@odds-core\/trackers/odds-core/g' {} \;
```

### Step 3: Update Main Export Points
```typescript
// In packages/odds-core/src/index.ts
export * from './index-consolidated';

// In packages/odds-websocket/src/index.ts
export { BunV13WebSocketServer } from './server-v13';
```

### Step 4: Update Build Scripts
```bash
# Update build targets
bun run build
bun run typecheck
bun run test
```

### Step 5: Test Migration
```bash
# Run examples to verify functionality
bun run packages/odds-core/examples
bun run packages/odds-websocket/examples

# Run performance tests
bun run test:performance
```

## 📈 Benefits of Migration

### 1. Reduced Complexity
- **Before**: 12+ example files with overlapping functionality
- **After**: 2 unified example files with comprehensive coverage

### 2. Fewer Dependencies
- **Before**: 8+ external dependencies
- **After**: 2 essential dependencies (Bun + Zod)

### 3. Better Performance
- **Before**: Generic WebSocket implementations
- **After**: Bun-native WebSocket with v1.3 optimizations

### 4. Cleaner API
- **Before**: Multiple import paths
- **After**: Single unified import point

### 5. Easier Maintenance
- **Before**: Distributed functionality
- **After**: Focused, cohesive modules

## 🔧 Troubleshooting

### Common Issues

#### Import Errors
```typescript
// Error: Cannot find module '@odds-core/detectors'
// Solution: Update to unified import
import { SyntheticArbitrageDetector } from 'odds-core';
```

#### Type Errors
```typescript
// Error: Type 'WebSocket' is not assignable
// Solution: Use Bun's WebSocket types
import type { ServerWebSocket } from 'bun';
```

#### Build Errors
```typescript
// Error: Module not found
// Solution: Update package.json exports
{
  "exports": {
    ".": { "import": "./dist/index-consolidated.js" }
  }
}
```

### Performance Issues

#### High Memory Usage
```typescript
// Use smol workers
const worker = new Worker(url, { smol: true });

// Enable garbage collection
forceGarbageCollection();
```

#### Slow Processing
```typescript
// Use HFT detector
const detector = SyntheticArbitrageDetectorFactory.createHFTDetector();

// Enable caching
const opportunities = await detector.detectOpportunities(markets, {
  useCache: true,
  processingMode: 'hft'
});
```

## ✅ Verification Checklist

- [ ] All imports updated to use unified paths
- [ ] Package files replaced with streamlined versions
- [ ] Build scripts working correctly
- [ ] Examples running without errors
- [ ] Performance tests passing
- [ ] Type checking successful
- [ ] WebSocket server starting correctly
- [ ] Synthetic arbitrage detection working
- [ ] Multi-period processing functional
- [ ] Position tracking operational

## 🎉 Post-Migration

After migration, you'll have:

1. **Cleaner Codebase**: Focused on synthetic arbitrage
2. **Better Performance**: Full Bun v1.3 optimization
3. **Easier Development**: Unified API surface
4. **Reduced Complexity**: Minimal dependencies
5. **Production Ready**: Enterprise-grade capabilities

## 📞 Support

For migration issues:
1. Check the unified examples in `synthetic-arbitrage-unified.ts`
2. Review the WebSocket examples in `websocket-server-examples.ts`
3. Run the verification checklist
4. Test with the provided performance benchmarks

The streamlined platform provides the same functionality with better performance and maintainability! 🚀
