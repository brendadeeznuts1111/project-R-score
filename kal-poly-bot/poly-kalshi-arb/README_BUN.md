# Kalman Filter Suite - Bun Implementation

Production Kalman Filter Suite for Micro-Structural Patterns #70-89 with Bun runtime optimization.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- TypeScript support (included with Bun)

### Installation

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd kal-poly-bot

# Install dependencies
bun install
```

### Running the Example

```bash
# Run the main demonstration
bun run start

# Or run directly
bun run bun_example.ts

# For development with hot reload
bun run dev
```

## 📊 Half-Time Inference Filter (Pattern #51)

The `HalfTimeInferenceKF` class implements Pattern #51: Half-Time Line Inference Lag, modeling the propagation from Half-Time totals to Full-Time totals.

### Basic Usage

```typescript
import { HalfTimeInferenceKF, type HTTickData, type FTTickData } from './src/half_time_inference_kf.ts';

// Create filter with 50ms time step
const kf = new HalfTimeInferenceKF(0.05);

// Update with market data
const htTick: HTTickData = { price_delta: 0.8 };
const ftTick: FTTickData = { price: 220.5 };

kf.updateWithBothMarkets(htTick, ftTick);

// Get prediction
const predictedFT = kf.predictFTTotal();
const edge = Math.abs(predictedFT - ftTick.price);

// Evaluate trading trigger
const trigger = kf.evaluateTrigger(ftTick.price, 0.5);

if (trigger.triggered) {
  console.log(`TRADE SIGNAL: Bet FT ${trigger.target_price.toFixed(2)}`);
  console.log(`Expected edge: ${trigger.expected_edge.toFixed(2)} points`);
  console.log(`Confidence: ${(trigger.confidence * 100).toFixed(1)}%`);
}
```

## 🏗️ Architecture

### Core Components

1. **AdaptiveKalmanFilter**: Base class with regime detection
2. **HalfTimeInferenceKF**: Pattern #51 specific implementation
3. **Regime Detection**: Hamilton filter with Quiet/Steam/Suspended states
4. **Matrix Operations**: Optimized linear algebra for real-time processing

### Key Features

- **Sub-10ms Processing**: Optimized for real-time trading
- **Regime-Adaptive**: Dynamic Q/R matrices based on market state
- **Numerical Stability**: Joseph form covariance updates
- **TypeScript Support**: Full type safety and IntelliSense

## 📈 Performance Characteristics

### Latency Budget

- **KV Read**: 2ms
- **Predict/Update**: 3ms
- **Trigger Evaluation**: 1ms
- **KV Write**: 0ms (async fire-and-forget)
- **Total**: **<6ms** (well within 10ms requirement)

### Benchmarks

```bash
bun run benchmark
```

Expected results:
- **Updates/second**: >10,000
- **Average latency**: <6ms
- **Memory usage**: <50MB
- **CPU usage**: <5% per instance

## 🔧 Configuration

### Filter Parameters
```typescript
const kf = new HalfTimeInferenceKF({
  dt: 0.05,              // Time step (50ms)
  propagationCoef: 0.7,   // HT→FT propagation coefficient
  velocityThreshold: 0.3, // Regime detection threshold
  edgeThreshold: 0.5      // Trading trigger threshold
});
```

### Regime Parameters

- **Quiet**: Low volatility, mean-reverting
- **Steam**: High velocity, trending (optimal for trading)
- **Suspended**: Market frozen (Pattern #56)

## 🎯 Trading Logic

### Signal Generation

```typescript
const trigger = kf.evaluateTrigger(ftPrice, 0.5);

if (trigger.triggered && trigger.regime === Regime.Steam) {
  // Execute trade
  const positionSize = calculatePositionSize(trigger.confidence, trigger.expected_edge);
  executeTrade({
    market: 'FT_total',
    direction: trigger.target_price > ftPrice ? 'OVER' : 'UNDER',
    size: positionSize,
    targetPrice: trigger.target_price
  });
}
```

### Position Sizing
```typescript
function calculatePositionSize(confidence: number, edge: number): number {
  // Kelly criterion with safety multiplier
  const winRate = confidence;
  const kellyFraction = (winRate * 2 - 1) * 0.5; // Half-Kelly
  const baseCapital = 10000;
  return Math.max(10, Math.min(1000, baseCapital * kellyFraction * edge));
}
```

## 📊 Monitoring & Analytics

### State Monitoring

```typescript
const state = kf.getState();
console.log(`Position: ${state.position.toFixed(2)}`);
console.log(`Velocity: ${state.velocity.toFixed(3)} pt/s`);
console.log(`Regime: ${state.regime}`);
console.log(`Uncertainty: ${state.uncertainty.toFixed(6)}`);
```

### Performance Metrics

```typescript
const regimeInfo = kf.getRegimeInfo();
console.log(`HT Influence: ${regimeInfo.htInfluence.toFixed(3)}`);
console.log(`Position Uncertainty: ${kf.getPositionUncertainty().toFixed(6)}`);
```

## 🧪 Testing

### Unit Tests

```bash
bun test
```

### Integration Tests

```bash
bun run test:integration
```

### Performance Tests

```bash
bun run test:performance
```

## 🔌 Integration

### Redis State Management
```typescript
import { RedisStateManager } from './src/redis_state_manager.ts';

const stateManager = new RedisStateManager('kf_state', 3600);

// Save state (async, fire-and-forget)
const state = extractFilterState(kf);
stateManager.saveFilterState(state);

// Load state
const savedState = stateManager.loadFilterState(51, 'market_id');
if (savedState) {
  restoreFilterState(kf, savedState);
}
```

### WebSocket Integration
```typescript
import { WebSocket } from 'ws';

const ws = new WebSocket('wss://api.bookmaker.com/ticks');

ws.on('message', (data) => {
  const tick = JSON.parse(data.toString());

  if (tick.ht_delta && tick.ft_price) {
    kf.updateWithBothMarkets(
      { price_delta: tick.ht_delta },
      { price: tick.ft_price }
    );

    const trigger = kf.evaluateTrigger(tick.ft_price);
    if (trigger.triggered) {
      sendToExecutionQueue(trigger);
    }
  }
});
```

## 📚 API Reference

### HalfTimeInferenceKF

#### Constructor
```typescript
constructor(dt: number = 0.05)
```

#### Methods
- `updateWithBothMarkets(htTick: HTTickData, ftTick: FTTickData): void`
- `predictFTTotal(): number`
- `evaluateTrigger(ftPrice: number, edgeThreshold?: number): TriggerResult`
- `getState(): FilterState`
- `getRegimeInfo(): { regime: Regime; velocity: number; htInfluence: number }`

#### Properties
- `propagationCoef: number` (default: 0.7)
- `currentRegime: Regime` (read-only)

### Types

```typescript
interface HTTickData {
  price_delta: number;
}

interface FTTickData {
  price: number;
}

interface TriggerResult {
  triggered: boolean;
  target_price: number;
  expected_edge: number;
  confidence: number;
  regime: Regime;
  position_uncertainty: number;
}

enum Regime {
  Quiet = "quiet",
  Steam = "steam",
  Suspended = "suspended"
}
```

## 🚀 Deployment

### Bun Worker
```typescript
// worker.ts
import { HalfTimeInferenceKF } from './src/half_time_inference_kf.ts';

export default {
  async fetch(req: Request): Promise<Response> {
    const tick = await req.json();

    const kf = new HalfTimeInferenceKF();
    kf.updateWithBothMarkets(tick.ht, tick.ft);

    const trigger = kf.evaluateTrigger(tick.ft.price);

    if (trigger.triggered) {
      await sendToBetQueue(trigger);
    }

    return new Response('OK');
  }
};
```

### Docker Deployment
```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

## 🔍 Troubleshooting

### Common Issues

1. **High Latency**: Check matrix operations and consider reducing state dimension
2. **Numerical Instability**: Ensure proper diagonal stabilization in covariance updates
3. **Poor Regime Detection**: Adjust velocity threshold and window size
4. **Low Signal Quality**: Verify data synchronization and reduce noise

### Debug Mode
```typescript
// Enable debug logging
const kf = new HalfTimeInferenceKF(0.05);
kf.debug = true;

// Monitor internal state
console.log('Transition matrix:', kf.getTransitionMatrix());
console.log('Observation matrix:', kf.getObservationMatrix());
console.log('Covariance matrix:', kf.getPMatrix());
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/surgical-precision/kalman-filter-suite/issues)
- Documentation: [Wiki](https://github.com/surgical-precision/kalman-filter-suite/wiki)

---

**Built with ❤️ using Bun for maximum performance**
