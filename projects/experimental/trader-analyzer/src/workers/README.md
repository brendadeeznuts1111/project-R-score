# Bun Workers Framework

A comprehensive worker management framework for Bun with advanced patterns, performance optimization, and production-ready features.

## Features

- ✅ **Worker Pool Management** - Efficient task queuing and worker lifecycle
- ✅ **Message Patterns** - Request-response, event-based, streaming
- ✅ **Performance Optimization** - Zero-copy transfers, fast-path serialization
- ✅ **Health Monitoring** - Automatic worker restart, metrics tracking
- ✅ **Environment Sharing** - Shared configuration without serialization
- ✅ **Thread Utilities** - Thread detection, thread-local storage

## Quick Start

```typescript
import { WorkerPool } from './src/workers/pool';

// Create worker pool
const pool = new WorkerPool('./worker.ts', 4);

// Execute tasks
const result = await pool.execute({ data: [1, 2, 3] });

// Batch processing
const results = await pool.map([
	{ data: [1, 2, 3] },
	{ data: [4, 5, 6] }
]);

// Cleanup
pool.terminate();
```

## Modules

### Core Modules

- **`pool.ts`** - Worker pool with task queue
- **`message-broker.ts`** - Request-response pattern with timeout
- **`event-bus.ts`** - Event-based communication
- **`zero-copy.ts`** - Zero-copy data transfer utilities
- **`recycler.ts`** - Automatic worker recycling
- **`health.ts`** - Health monitoring and metrics
- **`environment.ts`** - Shared configuration system
- **`thread-utils.ts`** - Thread detection and utilities
- **`system.ts`** - Complete integrated system

### Specialized Workers

- **`specialized.ts`** - Base worker classes for CPU/I/O operations

## Examples

See `examples/workers/` for complete working examples:

- `worker-pool-demo.ts` - Basic worker pool usage
- `message-broker-demo.ts` - Request-response pattern
- `event-bus-demo.ts` - Event-based communication
- `complete-system-demo.ts` - Integrated system

## Documentation

See [BUN-WORKERS-COMPLETE-GUIDE.md](../../docs/BUN-WORKERS-COMPLETE-GUIDE.md) for complete documentation.

## API Reference

All exports are available from the main module:

```typescript
import {
	WorkerPool,
	WorkerMessageBroker,
	WorkerEventBus,
	ZeroCopyWorker,
	WorkerRecycler,
	WorkerHealthMonitor,
	EnvironmentManager,
	ThreadUtils,
	WorkerSystem
} from './src/workers';
```

## Best Practices

1. **Use Worker Pools** for parallel task processing
2. **Monitor Worker Health** in production environments
3. **Use Zero-Copy Transfers** for large data (>1MB)
4. **Recycle Idle Workers** to prevent memory leaks
5. **Share Configuration** via EnvironmentManager
6. **Handle Errors** gracefully in worker scripts

## License

Part of the NEXUS Trading Intelligence Platform.
