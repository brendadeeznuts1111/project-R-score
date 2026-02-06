# NBA Swarm Detection System

A production-grade system for detecting coordinated betting patterns across NBA games using graph theory and cosine similarity.

## Features

- **Edge Builder**: Constructs graphs connecting games with similar betting patterns
- **Real-Time Radar**: WebSocket-based real-time edge monitoring and broadcasting
- **Binary Ledger**: Efficient storage of edge history with compression
- **Auto-Hedging**: Automatic hedge quote generation with circuit breakers
- **Statistical Validation**: P-value calculation and significance testing
- **Performance Optimized**: Sub-millisecond edge processing

## Architecture

```text
nba-swarm001/
├── src/                    # Core modules
│   ├── types/             # Type definitions
│   ├── core/              # Edge building logic
│   └── utils/             # Utilities (stats, validation, logging)
├── packages/
│   ├── swarm-radar/       # Real-time radar system
│   └── data/              # Data loading and mock generation
├── scripts/               # CLI tools and benchmarks
├── tests/                 # Test suite
└── config/                # Configuration files
```

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start radar server
bun swarm:radar --league NBA --threshold 0.7 --port 3333

# Build graph from games
bun edges:build --games 50

# Run benchmarks
bun bench

# Validate floating-point drift
bun edges:validate
```

## Configuration

Edit `config/default.json` to customize:
- Edge thresholds (similarity, weight)
- Radar settings (port, heartbeat interval)
- Ledger settings (compression, retention)
- Hedger settings (circuit breakers, rate limits)

## Testing

```bash
# Unit tests
bun test:unit

# Integration tests
bun test:integration

# E2E tests
bun test:e2e

# All tests
bun test
```

## Performance Targets

- Edge generation: <0.2µs per pair
- Graph build (100 games): <18ms
- Hedge quotes: <300µs
- WebSocket latency: <1ms

## License

MIT
