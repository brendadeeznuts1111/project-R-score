# Complete Guide to Bun Workers - Advanced Patterns & Best Practices

## Overview

This guide provides production-ready patterns for using Bun's Worker API, including worker pools, message patterns, performance optimization, lifecycle management, and monitoring.

## Table of Contents

1. [Worker Pool Manager](#1-worker-pool-manager)
2. [Specialized Worker Types](#2-specialized-worker-types)
3. [Advanced Message Patterns](#3-advanced-message-patterns)
4. [Performance Optimization](#4-performance-optimization)
5. [Worker Lifecycle Management](#5-worker-lifecycle-management)
6. [Environment Data & Configuration](#6-environment-data--configuration)
7. [Thread Detection & Utilities](#7-thread-detection--utilities)
8. [Complete Worker System](#8-complete-worker-system)

---

## 1. Worker Pool Manager

### Basic Usage

```typescript
import { WorkerPool } from './src/workers/pool';

const pool = new WorkerPool('./worker.ts', 4); // 4 workers

// Execute single task
const result = await pool.execute({ data: [1, 2, 3] });

// Execute multiple tasks in parallel
const results = await pool.map([
	{ data: [1, 2, 3] },
	{ data: [4, 5, 6] },
	{ data: [7, 8, 9] }
]);

// Get pool statistics
const stats = pool.getStats();
console.log(stats);
// {
//   totalWorkers: 4,
//   idleWorkers: 2,
//   busyWorkers: 2,
//   queuedTasks: 0,
//   activeTasks: 2
// }

// Cleanup
pool.terminate();
```

### Features

- **Automatic Task Queuing**: Tasks are queued when all workers are busy
- **Error Recovery**: Automatically replaces faulty workers
- **Concurrency Control**: Configurable pool size based on CPU cores
- **Statistics**: Real-time pool statistics

---

## 2. Specialized Worker Types

### Base Worker

```typescript
import { BaseWorker } from './src/workers/specialized';

class CustomWorker extends BaseWorker<string, string> {
	protected processMessage(data: string): string {
		return data.toUpperCase();
	}
}

const worker = new CustomWorker('./worker.ts');
const result = await worker.execute('hello');
console.log(result); // "HELLO"
```

### CPU Worker

```typescript
import { CPUWorker } from './src/workers/specialized';

const cpuWorker = new CPUWorker('./cpu-worker.ts');
const numbers = Array.from({ length: 1000 }, (_, i) => i);
const results = await cpuWorker.execute(numbers);
```

### I/O Worker

```typescript
import { IOWorker } from './src/workers/specialized';

const ioWorker = new IOWorker('./io-worker.ts');
const fileContent = await ioWorker.execute('./data.txt');
```

---

## 3. Advanced Message Patterns

### Request-Response Pattern

```typescript
import { WorkerMessageBroker } from './src/workers/message-broker';

const worker = new Worker('./worker.ts');
const broker = new WorkerMessageBroker(worker);

// Single request
const result = await broker.request('processData', { file: 'data.csv' });

// Batch requests
const batchResults = await broker.batch({
	userStats: { userId: 123 },
	orders: { limit: 10 },
	recommendations: { category: 'books' }
});

// Streaming
for await (const chunk of broker.stream('fetchLargeDataset', { dataset: 'logs' }, 1000)) {
	console.log(`Received ${chunk.length} items`);
}
```

### Event-Based Communication

```typescript
import { WorkerEventBus } from './src/workers/event-bus';

const eventBus = new WorkerEventBus('./event-worker.ts');

// Subscribe to events
eventBus.on('progress', (percent: number) => {
	console.log(`Progress: ${percent}%`);
});

eventBus.on('completed', (result: any) => {
	console.log('Task completed:', result);
});

// Send event
eventBus.post('startProcessing', { file: 'data.csv' });

// Request-response pattern
const result = await eventBus.request('calculate', { numbers: [1, 2, 3, 4, 5] });
```

---

## 4. Performance Optimization

### Zero-Copy Data Transfer

```typescript
import { ZeroCopyWorker } from './src/workers/zero-copy';

const worker = new ZeroCopyWorker('./zero-copy-worker.ts');

// Transfer ArrayBuffer without copying
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const processed = await worker.transferBuffer(buffer);

// Process SharedArrayBuffer
const data = new Float64Array(1000000);
const shared = await worker.processLargeData(data);

// Batch transfer
const buffers = [buffer1, buffer2, buffer3];
const results = await worker.transferMultiple(buffers);
```

### Benefits

- **Zero-Copy**: Transfer ownership without copying data
- **Shared Memory**: Use SharedArrayBuffer for thread-safe operations
- **Batch Operations**: Process multiple buffers efficiently

---

## 5. Worker Lifecycle Management

### Worker Recycler

```typescript
import { WorkerRecycler } from './src/workers/recycler';

const recycler = new WorkerRecycler('./worker.ts', 10, 100); // Max 10 workers, 100MB limit

// Acquire worker
const worker = await recycler.acquireWorker();
worker.postMessage({ task: 'process' });

// Release worker
recycler.releaseWorker(worker);

// Get statistics
const stats = recycler.getStats();

// Cleanup
recycler.terminateAll();
```

### Health Monitoring

```typescript
import { WorkerHealthMonitor } from './src/workers/health';

const monitor = new WorkerHealthMonitor();

// Register worker
monitor.registerWorker(worker);

// Record task execution
const startTime = Date.now();
try {
	const result = await processTask();
	monitor.recordTask(worker, startTime, true);
} catch (error) {
	monitor.recordTask(worker, startTime, false);
}

// Get metrics
const metrics = monitor.getMetrics();
console.log(metrics);
// {
//   totalTasks: 1000,
//   successfulTasks: 950,
//   failedTasks: 50,
//   successRate: 0.95,
//   avgTaskTime: 125.5,
//   activeWorkers: 4,
//   healthyWorkers: 4
// }
```

---

## 6. Environment Data & Configuration

### Shared Configuration

```typescript
import { EnvironmentManager } from './src/workers/environment';

// Initialize in main thread
EnvironmentManager.initialize({
	apiBaseUrl: 'https://api.production.com',
	maxRetries: 5,
	timeout: 30000,
	database: {
		host: 'localhost',
		port: 5432
	}
});

// Access in workers (no serialization overhead)
const config = EnvironmentManager.getConfig();
const cache = EnvironmentManager.getCache();
const db = EnvironmentManager.getDatabase();

// Update configuration
EnvironmentManager.updateConfig({ maxRetries: 10 });
```

### Benefits

- **No Serialization**: Direct access to shared data
- **Synchronous Access**: No async overhead
- **Shared Resources**: Cache, database connections, etc.

---

## 7. Thread Detection & Utilities

### Thread Utilities

```typescript
import { ThreadUtils } from './src/workers/thread-utils';

// Check if main thread
if (ThreadUtils.isMainThread) {
	console.log('Main thread');
} else {
	console.log('Worker thread');
}

// Get thread info
const info = ThreadUtils.getThreadInfo();
console.log(info);

// Run code in worker
const result = await ThreadUtils.runInWorker('./worker.ts', { data: [1, 2, 3] });

// Thread-local storage
const getCounter = ThreadUtils.createThreadLocal(0);
const counter = getCounter(); // Thread-specific value

// Performance measurement
ThreadUtils.measureThreadPerformance('Data processing', () => {
	// Intensive computation
	return processData();
});
```

---

## 8. Complete Worker System

### Integrated System

```typescript
import { WorkerSystem } from './src/workers/system';
import { EnvironmentManager } from './src/workers/environment';

// Initialize environment
EnvironmentManager.initialize({
	apiBaseUrl: 'https://api.production.com',
	maxRetries: 5
});

// Create worker system
const workerSystem = new WorkerSystem('./worker.ts', 4, {
	enableHealthChecks: true,
	memoryLimitMB: 50,
	timeoutMs: 10000
});

// Process tasks
const tasks = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `task-${i}` }));
const results = await workerSystem.processBatch(tasks);

// Get metrics
const metrics = workerSystem.getMetrics();
console.log(metrics);

// Broadcast configuration update
await workerSystem.broadcast({
	type: 'configUpdate',
	config: { maxBatchSize: 1000 }
});

// Graceful shutdown
process.on('SIGTERM', () => {
	workerSystem.shutdown();
	process.exit(0);
});
```

---

## Best Practices

### 1. Worker Script Structure

```typescript
// worker.ts
self.onmessage = async (event: MessageEvent) => {
	const { taskId, task, type } = event.data;

	try {
		let result: any;

		switch (type) {
			case 'processData':
				result = await processData(task);
				break;
			case 'calculate':
				result = calculate(task);
				break;
			default:
				result = await processTask(task);
		}

		self.postMessage({ taskId, result, type: 'success' });
	} catch (error) {
		self.postMessage({
			taskId,
			error: error instanceof Error ? error.message : String(error),
			type: 'error'
		});
	}
};
```

### 2. Error Handling

- Always handle errors in worker scripts
- Use try-catch blocks
- Send error messages back to main thread
- Implement retry logic in main thread

### 3. Memory Management

- Use `smol: true` for memory-efficient workers
- Monitor memory usage with health monitor
- Recycle idle workers
- Use zero-copy transfers for large data

### 4. Performance Tips

- Use transferable objects for large data
- Batch operations when possible
- Monitor worker health
- Adjust pool size based on workload

---

## Examples

See the `examples/workers/` directory for complete working examples:

- `worker-pool-demo.ts` - Worker pool usage
- `message-broker-demo.ts` - Request-response pattern
- `event-bus-demo.ts` - Event-based communication
- `complete-system-demo.ts` - Integrated system

Run examples:

```bash
bun run examples/workers/worker-pool-demo.ts
bun run examples/workers/message-broker-demo.ts
bun run examples/workers/event-bus-demo.ts
bun run examples/workers/complete-system-demo.ts
```

---

## API Reference

### WorkerPool

```typescript
class WorkerPool<T, R> {
	constructor(workerScript: string, poolSize?: number, options?: WorkerOptions);
	execute(task: T): Promise<R>;
	map(tasks: T[], concurrency?: number): Promise<R[]>;
	getStats(): PoolStats;
	terminate(): void;
}
```

### WorkerMessageBroker

```typescript
class WorkerMessageBroker {
	constructor(worker: Worker);
	request<T, R>(type: string, data: T): Promise<R>;
	batch<T, R>(requests: T): Promise<R>;
	stream<T, R>(type: string, data: T, chunkSize?: number): AsyncGenerator<R[]>;
	setTimeout(ms: number): void;
}
```

### WorkerEventBus

```typescript
class WorkerEventBus {
	constructor(workerScript: string);
	on(event: string, listener: Function): void;
	off(event: string, listener: Function): void;
	post(event: string, data?: any): void;
	request<T, R>(event: string, data?: T): Promise<R>;
	terminate(): void;
}
```

### WorkerHealthMonitor

```typescript
class WorkerHealthMonitor {
	constructor(checkInterval?: number);
	registerWorker(worker: Worker): void;
	recordTask(worker: Worker, startTime: number, success: boolean): void;
	getMetrics(): HealthMetrics;
	cleanup(): void;
}
```

---

## References

- [Bun Workers Documentation](https://bun.com/docs/runtime/workers)
- [Worker Threads API](https://nodejs.org/api/worker_threads.html)
- [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
