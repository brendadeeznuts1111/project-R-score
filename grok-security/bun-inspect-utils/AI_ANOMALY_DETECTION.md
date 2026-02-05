# 🚀 AI Anomaly Detection Engine

Real-time fraud and anomaly detection system for transaction scoring in the Bun-native inspection utility.

## Overview

The Anomaly Detection Engine flags suspicious transactions/sessions **before they hit payment rails**, scoring signals in **<200ms** with weighted feature analysis.

## Architecture

### Core Components

1. **Types** (`src/ai/types.ts`)
   - `AnomalySignal`: 18-field transaction signal with device, account, and behavioral metrics
   - `AnomalyScore`: Risk score with confidence, level, and Nebula code
   - `AnomalyAction`: Recommended action (allow, throttle, block, retire)
   - `AnomalyEngineState`: Engine state tracking

2. **Engine** (`src/ai/engine.ts`)
   - `AnomalyEngine`: Core scoring engine with weighted feature analysis
   - Sigmoid normalization for smooth 0-1 score distribution
   - Subscription-based event system
   - Latency tracking (<200ms target)

3. **Utilities** (`src/ai/utils.ts`)
   - Signal creation helpers
   - Feature calculators (CTR proximity, velocity, IP jumps, etc.)
   - CSV export/import for batch processing

## Risk Scoring

### Thresholds
- **Low Risk**: 0.0 - 0.69 → `N-00` (Allow)
- **Medium Risk**: 0.70 - 0.89 → `N-AI-T` (Throttle)
- **High Risk**: 0.90 - 1.00 → `N-AI-B` (Block)

### Weighted Features
- Device Age: 15% (newer = riskier)
- Transaction Velocity: 25% (higher = riskier)
- IP Jumps: 20% (more changes = riskier)
- CTR Proximity: 20% (closer to $10k = riskier)
- Chargeback History: 20% (yes = riskier)

## Usage

```typescript
import { createAnomalyEngine, createSignal } from "@bun/inspect-utils";

const engine = createAnomalyEngine();
await engine.initialize();

const signal = createSignal("device-1", {
  deviceAgeDays: 365,
  legAmount: 100,
  legVelocity: 0.5,
  ipJumpCount: 0,
  ctrProximity: 0.1,
  chargebackHistory: false,
});

const score = await engine.scoreSignal(signal);
const action = engine.getAction(score);

console.log(`Risk: ${score.riskLevel} (${score.nebulaCode})`);
console.log(`Action: ${action.type}`);
```

## Test Coverage

✅ **12 comprehensive tests** covering:
- Engine initialization
- Low/medium/high risk scoring
- Action determination
- Latency tracking
- Utility functions (CTR, velocity, IP detection, etc.)

**All 353 tests passing** (323 original + 18 theme + 12 anomaly)

## Performance

- **Scoring Latency**: ~0.06ms per signal (well under 200ms target)
- **Memory**: Minimal footprint with efficient feature calculation
- **Throughput**: Capable of scoring thousands of signals per second

## Integration

The AI module is fully integrated into `bun-inspect-utils`:
- Exported from main `src/index.ts`
- Available as `@bun/inspect-utils` package
- Zero external dependencies (Bun-native)

## Next Steps

- CLI tools for batch anomaly scoring
- Integration with payment pipeline
- Model persistence and versioning
- Advanced feature engineering (behavioral patterns, etc.)

