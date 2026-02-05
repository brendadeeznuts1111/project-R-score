# Sports Betting Fractal Dashboard with Bun.color Integration

A real-time sports betting visualization system leveraging Bun's native `Bun.color` API for advanced fractal dimension analysis and edge detection. This system maps chaotic regimes in sports data to color-coded visualizations, enabling bettors to identify hidden opportunities through chaos theory principles.

## 🎯 Overview

This project integrates Bun.color for dependency-free, high-performance color processing in a WebSocket-driven dashboard that visualizes fractal dimensions (FD) of sports betting data. FD values reveal the complexity and predictability of odds patterns:

- **FD ≈ 1.0**: Smooth, predictable trends (arbitrage opportunities)
- **FD ≈ 1.5**: Brownian motion (random walk, neutral)
- **FD > 2.0**: High chaos (potential black swan events like upsets)

## 🚀 Quick Start

### Prerequisites
- Bun 1.2+ (with Bun.color support)
- Node.js for optional client-side rendering

### Installation
```bash
cd Sports
bun install
```

### Usage Commands

```bash
# Start WebSocket server (default port 3000)
bun start server

# Start on custom port
bun start server 8080

# Run performance benchmarks
bun start benchmark

# Run visualization demo
bun start demo

# Run tests
bun test
```

## 🏗️ Architecture

### Core Components

#### 1. **Color Mapping Module** (`src/color-mapping.ts`)
- **Bun.color Integration**: Macro-based color parsing and conversion
- **FD-to-Color Mapping**: Maps fractal dimensions to semantic color schemes
- **Thresholds**: Chaos theory-based FD regimes
- **Functions**:
  - `computeFD()`: Hurst exponent approximation for fractal dimension
  - `fdToColor()`: Dynamic color interpolation based on FD
  - `getRGBAArray()`: Zero-copy Canvas rendering support
  - `normalizeColor()`: Security against visual spoofing

#### 2. **WebSocket Server** (`src/websocket-server.ts`)
- **Real-time Streaming**: Binary odds data processing
- **Compression**: zlib integration for low-latency transmission
- **Session Management**: UUID-based caching with TTL
- **Features**:
  - Binary packet processing
  - Fractal dimension computation per sub-node
  - Color-mapped lattice generation
  - Simulated data stream for testing

#### 3. **Lattice Visualization** (`src/lattice-visualization.ts`)
- **Canvas/WebGL Rendering**: High-performance graphics
- **Fractal Positioning**: Hilbert curve for self-similar patterns
- **Dynamic Glyphs**: Unicode symbols for FD regimes
- **Components**:
  - `LatticeRenderer`: Canvas-based renderer with animations
  - `WebGLLatticeRenderer`: Placeholder for GPU acceleration
  - `generateFractalLattice()`: Creates interconnected node networks

#### 4. **Performance Benchmarking** (`src/performance-benchmark.ts`)
- **Comprehensive Metrics**: Color ops, FD computation, stream processing
- **Real-time Analysis**: Throughput and latency measurements
- **Optimization Recommendations**: AI-driven suggestions

## 🎨 Color Mapping Strategy

### FD Thresholds & Semantic Colors

```javascript
const FD_THRESHOLDS = {
  ULTRA_STABLE: 0.5,      // 🔒 Yellow: Arbitrage locks
  SMOOTH_TREND: 1.2,      // 🟢 Green: Predictable trends
  BROWNIAN: 1.5,          // 🟡 Yellow: Random walk
  PERSISTENT: 1.9,        // 🟠 Orange: Momentum
  HIGH_CHAOS: 2.3,        // 🔴 Red: Volatility clusters
  BLACK_SWAN: 2.7         // ⚫ Dark Red: Extreme events
}
```

### Sports Betting Context

| FD Range | Regime | Betting Implication | Color |
|----------|--------|---------------------|-------|
| < 0.5 | Ultra-stable | Arbitrage opportunities | Bright Yellow |
| 1.0-1.2 | Smooth trends | Predictable props | Green |
| 1.5-1.9 | Persistent | Momentum plays | Orange |
| 1.9-2.3 | High volatility | Injury cascades | Red |
| > 2.3 | Chaotic | Black swan events | Intense Red |

## 🔧 Technical Implementation

### Bun.color Integration

```typescript
import { color } from "bun" with { type: "macro" };

// Efficient parsing at bundle time
const rgbaObj = color("#FF5733", "{rgba}"); // { r: 255, g: 87, b: 51, a: 255 }

// Zero-copy Canvas rendering
const rgbaArray = color("#FF5733", "[rgba]"); // [255, 87, 51, 255]

// Terminal dashboards
const ansi = color("#FF5733", "ansi"); // ANSI escape code
```

### Fractal Dimension Computation

```typescript
export function computeFD(timeSeriesData: number[]): number {
  // Simplified Hurst exponent approximation
  const n = timeSeriesData.length;
  const mean = timeSeriesData.reduce((a, b) => a + b, 0) / n;
  
  // Cumulative deviations
  const cumulative = [0];
  for (let i = 0; i < n; i++) {
    cumulative.push(cumulative[i] + (timeSeriesData[i] - mean));
  }
  
  const R = Math.max(...cumulative) - Math.min(...cumulative);
  const variance = timeSeriesData.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0) / n;
  const S = Math.sqrt(variance);
  
  const H = R / (S * Math.sqrt(n));
  return 2 - Math.min(Math.max(H, 0.5), 1.5); // FD = 2 - H
}
```

### WebSocket Protocol

**Client → Server**: Binary odds packet (compressed Float32Array)
```javascript
const packet = deflateSync(new Float32Array(oddsData).buffer);
ws.send(packet);
```

**Server → Client**: JSON with color-mapped nodes
```json
{
  "type": "lattice_update",
  "timestamp": 1703894400000,
  "nodes": [
    {
      "g": "🔥▲",           // Glyph
      "c": "#FF0000",       // Color
      "fd": 2.45,           // Fractal dimension
      "i": 0.95,            // Intensity
      "ansi": "\u001b[31m", // Terminal color
      "meta": { "sport": "NFL", "market": "player_props" }
    }
  ]
}
```

## 📊 Performance Benchmarks

### Expected Results (M1 Mac)

| Operation | Throughput | Latency |
|-----------|------------|---------|
| Color Parsing | >50K ops/sec | <0.02ms |
| FD Computation (100 pts) | >1K ops/sec | <1ms |
| Stream Processing | >100 batches/sec | <10ms |
| Lattice Generation (200 nodes) | >500 ops/sec | <2ms |

### Running Benchmarks

```bash
bun start benchmark
# Exports: benchmark-results.json
```

## 🎯 Use Cases in Sports Betting

### 1. **Hidden Edge Detection**
- **Scenario**: Leicester City vs. Giants upset
- **FD Signal**: >2.3 triggers red alert
- **Action**: Hedge bets on correlated props

### 2. **Volatility Clustering**
- **Scenario**: Injury cascades in NFL
- **FD Signal**: 1.9-2.3 orange zones
- **Action**: Avoid heavy exposure, wait for stabilization

### 3. **Arbitrage Opportunities**
- **Scenario**: Cross-market odds discrepancies
- **FD Signal**: <0.5 ultra-stable
- **Action**: Lock in guaranteed profit

### 4. **Weather-Player Correlations**
- **Scenario**: Rain affecting QB performance
- **FD Signal**: Coupled events >2.0
- **Action**: Adjust player prop valuations

## 🔒 Security & Compliance

### Visual Spoofing Prevention
```typescript
export function normalizeColor(input: string): string {
  try {
    const parsed = color(input, "hex");
    return parsed ? parsed.toUpperCase() : "#808080";
  } catch {
    return "#808080"; // Fallback to neutral
  }
}
```

### Quantum-Safe Features
- **UUID v7**: Time-ordered, collision-resistant identifiers
- **Buffer Caching**: Zero-copy data handling
- **TTL Management**: Automatic session expiration

## 🎨 Client-Side Integration

### Canvas Rendering Example

```typescript
import { LatticeRenderer } from "./lattice-visualization";

const canvas = document.getElementById("dashboard") as HTMLCanvasElement;
const renderer = new LatticeRenderer(canvas, {
  width: 1200,
  height: 800,
  nodeCount: 200,
  connectionRadius: 150,
  animationSpeed: 1
});

// WebSocket message handler
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "lattice_update") {
    const nodes = data.nodes.map(n => ({
      x: Math.random() * 1200, // Position via Hilbert curve
      y: Math.random() * 800,
      glyph: n.g,
      color: n.c,
      rgba: [/* parse n.c */],
      fd: n.fd,
      intensity: n.i,
      size: 8 + (n.i * 12),
      connections: []
    }));
    renderer.render(nodes);
  }
};
```

### WebGL Enhancement (Optional)

For 10K+ nodes, use WebGLLatticeRenderer:
```typescript
const glRenderer = new WebGLLatticeRenderer(canvas, config);
glRenderer.render(nodes); // GPU-accelerated
```

## 📈 Optimization Recommendations

### If Color Operations Are Slow
- ✅ Already using macro imports
- ✅ Consider caching frequently used FD ranges
- ✅ Pre-compute color gradients

### If FD Computation Is Slow
- ⚠️ Implement WebAssembly module
- ⚠️ Use worker threads for parallel processing
- ⚠️ Cache results for similar patterns

### If Stream Processing Is Slow
- ⚠️ Increase WebSocket batch sizes
- ⚠️ Use binary protocol instead of JSON
- ⚠️ Implement connection pooling

## 🧪 Testing

### Run All Tests
```bash
bun test
```

### Specific Test Suites
```bash
bun test tests/color-mapping.test.ts
```

### Test Coverage
- ✅ Color parsing and conversion
- ✅ FD computation accuracy
- ✅ WebSocket message handling
- ✅ Lattice generation
- ✅ Error handling

## 📚 API Reference

### Color Mapping
- `computeFD(data: number[]): number`
- `fdToColor(fd: number, base?: string): string`
- `getRGBAArray(color: string): [number, number, number, number]`
- `generateFDGradient(start, end, steps): string[]`

### WebSocket Server
- `startWebSocketServer(port: number): Server`
- `processOddsStream(packets: Uint8Array[]): Promise<LatticeNode[]>`
- `getSessionStats(sessionId: string): object`

### Visualization
- `generateFractalLattice(config, fdValues): VisualNode[]`
- `LatticeRenderer.render(nodes): void`
- `exportVisualizationData(nodes): object`

## 🔗 Integration Examples

### Real-Time Dashboard
```typescript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws");

// Subscribe to markets
ws.send(JSON.stringify({
  type: "subscribe",
  markets: ["NFL", "NBA", "MLB"]
}));

// Receive color-mapped updates
ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  // Render nodes with payload.nodes
};
```

### Terminal Dashboard
```typescript
import { getANSIColor } from "./color-mapping";

nodes.forEach(node => {
  console.log(`${node.ansi}${node.glyph}\u001b[0m FD: ${node.fd.toFixed(2)}`);
});
```

## 🚀 Production Deployment

### Environment Variables
```bash
PORT=3000
REDIS_URL=redis://localhost:6379  # For session caching
LOG_LEVEL=info
```

### Scaling
- **Vertical**: Increase node count and connection radius
- **Horizontal**: Multiple WebSocket servers with Redis pub/sub
- **Load Balancing**: Use Bun's built-in clustering

### Monitoring
```bash
# Health check endpoint
curl http://localhost:3000/health

# Session statistics
curl http://localhost:3000/sessions
```

## 🎯 Future Enhancements

### ML Integration
- **Threat Scoring**: Prefetch colors for high-volatility predictions
- **Pattern Recognition**: Cache FD results for similar time-series
- **Kelly Criterion**: Use intensity for bet sizing

### Advanced Visualization
- **3D Lattices**: WebGL depth rendering
- **Particle Systems**: High-intensity node effects
- **Heat Maps**: Regional volatility overlays

### Real Data Integration
- **API Connectors**: Polygon, Sportradar, Betfair
- **Webhook Processing**: Live odds feeds
- **Historical Analysis**: Backtesting on past events

## 📄 License

MIT License - Free to use for personal and commercial applications.

## 🙏 Credits

Built with Bun.color for zero-dependency, high-performance color processing. Inspired by chaos theory applications in financial markets and sports analytics.

---

**Happy Betting! May the fractal odds be ever in your favor.** 🎲📊
