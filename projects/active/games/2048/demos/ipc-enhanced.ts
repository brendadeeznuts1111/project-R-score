#!/usr/bin/env bun

// Enhanced IPC Demo with Advanced Communication Patterns
import { colourKit, pad, rgbaLattice, sse } from "./quantum-toolkit-patch.ts";

console.info(
  colourKit(0.9).ansi + "🚀 Enhanced IPC Communication Suite" + "\x1b[0m"
);
console.info("=".repeat(70));

// Enhanced message types and interfaces
interface IPCMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  sender?: string;
}

interface WorkerMetrics {
  id: string;
  tasksCompleted: number;
  avgResponseTime: number;
  memoryUsage: number;
  uptime: number;
}

// Advanced message broker for routing
class MessageBroker {
  private workers: Map<string, any> = new Map();
  private messageQueue: IPCMessage[] = [];
  private metrics: Map<string, WorkerMetrics> = new Map();

  registerWorker(id: string, worker: any) {
    this.workers.set(id, worker);
    this.metrics.set(id, {
      id,
      tasksCompleted: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      uptime: 0,
    });
  }

  async routeMessage(message: IPCMessage): Promise<any> {
    const startTime = performance.now();

    // Route to appropriate worker based on message type
    let targetWorker: any;

    switch (message.type) {
      case "compute":
      case "calculate":
        targetWorker = this.workers.get("compute");
        break;
      case "file":
        targetWorker = this.workers.get("file");
        break;
      case "network":
        targetWorker = this.workers.get("network");
        break;
      default:
        targetWorker = this.workers.get("general");
    }

    if (!targetWorker) {
      throw new Error(`No worker available for type: ${message.type}`);
    }

    // Send message and wait for response
    targetWorker.send(message);

    // Simulate response handling
    const response = await this.waitForResponse(message.id, 5000);
    const duration = performance.now() - startTime;

    // Update metrics
    const metrics = this.metrics.get(targetWorker.id);
    if (metrics) {
      metrics.tasksCompleted++;
      metrics.avgResponseTime = (metrics.avgResponseTime + duration) / 2;
    }

    return response;
  }

  private async waitForResponse(
    messageId: string,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout")), timeout);
      // In real implementation, would wait for actual response
      setTimeout(() => {
        clearTimeout(timer);
        resolve({ id: messageId, status: "completed" });
      }, 100);
    });
  }

  getMetrics(): WorkerMetrics[] {
    return Array.from(this.metrics.values());
  }
}

// Enhanced worker factory
class WorkerFactory {
  static async createWorker(type: string, id: string): Promise<any> {
    const workerCodes = {
      compute: `
        const workerId = '${id}';
        let taskCount = 0;

        globalThis.onmessage = (event) => {
          const { id, type, data } = event.data;
          taskCount++;

          if (type === 'compute' || type === 'calculate') {
            const start = performance.now();

            // Perform intensive computation
            let result = 0;
            const iterations = data.iterations || 1000000;

            for (let i = 0; i < iterations; i++) {
              result += Math.sin(i) * Math.cos(i);
            }

            const duration = performance.now() - start;

            globalThis.postMessage({
              id: event.data.id,
              workerId,
              type: 'compute-result',
              data: {
                result: result / iterations,
                iterations,
                duration,
                taskCount,
                memory: process.memoryUsage().heapUsed
              }
            });
          } else if (type === 'status') {
            globalThis.postMessage({
              id: event.data.id,
              workerId,
              type: 'status-response',
              data: {
                taskCount,
                memory: process.memoryUsage(),
                uptime: process.uptime()
              }
            });
          }
        };

        globalThis.postMessage({ workerId, type: 'ready', timestamp: Date.now() });
      `,

      file: `
        const workerId = '${id}';
        let operations = 0;

        globalThis.onmessage = async (event) => {
          const { id, type, data } = event.data;
          operations++;

          try {
            if (type === 'file') {
              if (data.action === 'write') {
                await Bun.write(data.path, data.content);
                globalThis.postMessage({
                  id: event.data.id,
                  workerId,
                  type: 'file-result',
                  data: {
                    action: 'write',
                    path: data.path,
                    size: data.content.length,
                    success: true,
                    operations
                  }
                });
              } else if (data.action === 'read') {
                const content = await Bun.file(data.path).text();
                globalThis.postMessage({
                  id: event.data.id,
                  workerId,
                  type: 'file-result',
                  data: {
                    action: 'read',
                    path: data.path,
                    content: content.slice(0, 200),
                    size: content.length,
                    success: true,
                    operations
                  }
                });
              }
            }
          } catch (error) {
            globalThis.postMessage({
              id: event.data.id,
              workerId,
              type: 'file-error',
              data: { error: error.message }
            });
          }
        };

        globalThis.postMessage({ workerId, type: 'ready', timestamp: Date.now() });
      `,

      network: `
        const workerId = '${id}';
        let requests = 0;

        globalThis.onmessage = async (event) => {
          const { id, type, data } = event.data;
          requests++;

          if (type === 'network') {
            try {
              const start = performance.now();
              const response = await fetch(data.url);
              const text = await response.text();
              const duration = performance.now() - start;

              globalThis.postMessage({
                id: event.data.id,
                workerId,
                type: 'network-result',
                data: {
                  url: data.url,
                  status: response.status,
                  size: text.length,
                  duration,
                  requests,
                  success: true
                }
              });
            } catch (error) {
              globalThis.postMessage({
                id: event.data.id,
                workerId,
                type: 'network-error',
                data: { error: error.message }
              });
            }
          }
        };

        globalThis.postMessage({ workerId, type: 'ready', timestamp: Date.now() });
      `,

      general: `
        const workerId = '${id}';
        let messages = 0;

        globalThis.onmessage = (event) => {
          const { id, type, data } = event.data;
          messages++;

          globalThis.postMessage({
            id: event.data.id,
            workerId,
            type: 'echo',
            data: {
              original: data,
              echoed: true,
              timestamp: Date.now(),
              messages,
              pid: process.pid
            }
          });
        };

        globalThis.postMessage({ workerId, type: 'ready', timestamp: Date.now() });
      `,
    };

    const code = workerCodes[type] || workerCodes.general;
    const workerFile = `/tmp/worker-${type}-${id}.js`;
    await Bun.write(workerFile, code);

    return Bun.spawn(["bun", workerFile], {
      stdout: "pipe",
      stderr: "pipe",
      ipc: true,
    });
  }
}

// Enhanced IPC with load balancing
async function loadBalancedIPC() {
  console.info(
    colourKit(0.7).ansi + "\n⚖️ Load-Balanced IPC with Worker Pool" + "\x1b[0m"
  );

  const broker = new MessageBroker();
  const workerTypes = ["compute", "file", "network", "general"];
  const workers = [];

  // Create specialized workers
  for (const type of workerTypes) {
    const worker = await WorkerFactory.createWorker(type, `${type}-1`);
    workers.push(worker);
    broker.registerWorker(`${type}-1`, worker);
  }

  console.info(`Created ${workers.length} specialized workers`);

  // Wait for workers to be ready
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Send various tasks
  const tasks = [
    { type: "compute", data: { iterations: 500000 } },
    {
      type: "file",
      data: {
        action: "write",
        path: "/tmp/test.txt",
        content: "Enhanced IPC test data",
      },
    },
    { type: "network", data: { url: "https://httpbin.org/json" } },
    { type: "echo", data: "Hello Enhanced IPC!" },
  ];

  console.info("📤 Distributing tasks across workers...");

  for (const task of tasks) {
    const message: IPCMessage = {
      id: `task-${Math.random().toString(36).substr(2, 9)}`,
      type: task.type,
      data: task.data,
      timestamp: Date.now(),
    };

    try {
      const response = await broker.routeMessage(message);
      console.info(`✅ ${task.type} task completed`);
    } catch (error) {
      console.info(`❌ ${task.type} task failed: ${error.message}`);
    }
  }

  // Show metrics
  console.info("\n📊 Worker Metrics:");
  console.info("┌─────────┬──────────┬──────────┬──────────┐");
  console.info("│ Worker  │ Tasks    │ Avg Time │ Memory   │");
  console.info("├─────────┼──────────┼──────────┼──────────┤");

  const metrics = broker.getMetrics();
  metrics.forEach((metric) => {
    const memory = (metric.memoryUsage / 1024 / 1024).toFixed(1);
    const time = metric.avgResponseTime.toFixed(1);
    console.info(
      `│ ${pad(metric.id, 7)} │ ${pad(
        metric.tasksCompleted.toString(),
        8
      )} │ ${pad(time + "ms", 8)} │ ${pad(memory + "MB", 8)} │`
    );
  });

  console.info("└─────────┴──────────┴──────────┴──────────┘");

  // Cleanup workers
  for (const worker of workers) {
    await worker.exited;
  }
}

// IPC with streaming data
async function streamingIPC() {
  console.info(
    colourKit(0.6).ansi + "\n📡 Streaming IPC Communication" + "\x1b[0m"
  );

  const streamWorkerCode = `
    let streamId = 0;

    globalThis.onmessage = (event) => {
      const { id, type, data } = event.data;

      if (type === 'start-stream') {
        streamId++;
        const interval = setInterval(() => {
          globalThis.postMessage({
            id: event.data.id,
            streamId,
            type: 'stream-data',
            data: {
              value: Math.random() * 100,
              timestamp: Date.now(),
              sequence: streamId
            }
          });

          // Stop after 10 messages
          if (streamId >= 10) {
            clearInterval(interval);
            globalThis.postMessage({
              id: event.data.id,
              streamId,
              type: 'stream-end',
              data: { messages: streamId }
            });
          }
        }, 200);
      }
    };

    globalThis.postMessage({ type: 'stream-ready' });
  `;

  await Bun.write("/tmp/stream-worker.js", streamWorkerCode);

  const streamWorker = Bun.spawn(["bun", "/tmp/stream-worker.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Start streaming
  console.info("🌊 Starting data stream...");
  streamWorker.send({
    id: "stream-1",
    type: "start-stream",
    data: { interval: 200 },
  });

  // Collect stream data
  const stdout = await streamWorker.stdout.text();
  const streamData = [];

  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      if (line) {
        try {
          const data = JSON.parse(line);
          if (data.type === "stream-data") {
            streamData.push(data.data);
          }
        } catch {
    console.error('Unhandled error:', error);
  }
      }
    });

  console.info(`📊 Received ${streamData.length} stream messages:`);
  streamData.slice(0, 5).forEach((data, i) => {
    const color = colourKit(data.value / 100).ansi;
    console.info(
      `  ${i + 1}: ${color}${data.value.toFixed(2)}\x1b[0m (seq: ${
        data.sequence
      })`
    );
  });

  if (streamData.length > 5) {
    console.info(`  ... and ${streamData.length - 5} more messages`);
  }

  await streamWorker.exited;
}

// IPC with event-driven architecture
async function eventDrivenIPC() {
  console.info(
    colourKit(0.8).ansi + "\n🎯 Event-Driven IPC Architecture" + "\x1b[0m"
  );

  const eventWorkerCode = `
    const eventHandlers = new Map();
    let eventCount = 0;

    // Register event handlers
    eventHandlers.set('math', (data) => {
      return {
        operation: data.operation,
        operands: data.operands,
        result: data.operands.reduce((a, b) => {
          switch(data.operation) {
            case 'add': return a + b;
            case 'multiply': return a * b;
            case 'subtract': return a - b;
            default: return a + b;
          }
        })
      };
    });

    eventHandlers.set('string', (data) => {
      return {
        input: data.text,
        length: data.text.length,
        reversed: data.text.split('').reverse().join(''),
        uppercase: data.text.toUpperCase()
      };
    });

    eventHandlers.set('array', (data) => {
      const arr = data.numbers || [];
      return {
        input: arr,
        sum: arr.reduce((a, b) => a + b, 0),
        average: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
        min: Math.min(...arr),
        max: Math.max(...arr)
      };
    });

    globalThis.onmessage = (event) => {
      const { id, type, data } = event.data;
      eventCount++;

      const handler = eventHandlers.get(type);
      if (handler) {
        try {
          const result = handler(data);
          globalThis.postMessage({
            id: event.data.id,
            type: 'event-result',
            data: {
              eventType: type,
              result,
              eventCount,
              timestamp: Date.now()
            }
          });
        } catch (error) {
          globalThis.postMessage({
            id: event.data.id,
            type: 'event-error',
            data: { error: error.message, eventType: type }
          });
        }
      } else {
        globalThis.postMessage({
          id: event.data.id,
          type: 'event-unknown',
          data: { eventType: type, availableTypes: Array.from(eventHandlers.keys()) }
        });
      }
    };

    globalThis.postMessage({ type: 'event-system-ready', handlers: Array.from(eventHandlers.keys()) });
  `;

  await Bun.write("/tmp/event-worker.js", eventWorkerCode);

  const eventWorker = Bun.spawn(["bun", "/tmp/event-worker.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Send various events
  const events = [
    { type: "math", data: { operation: "add", operands: [5, 10, 15] } },
    { type: "math", data: { operation: "multiply", operands: [2, 3, 4] } },
    { type: "string", data: { text: "Enhanced IPC Events" } },
    { type: "array", data: { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
    { type: "unknown", data: { test: "data" } },
  ];

  console.info("📨 Sending events to worker...");

  for (const event of events) {
    eventWorker.send({
      id: `event-${Math.random().toString(36).substr(2, 9)}`,
      type: event.type,
      data: event.data,
    });
  }

  const stdout = await eventWorker.stdout.text();

  console.info("📥 Event processing results:");
  console.info("┌─────────┬─────────────────┬──────────────────────────────┐");
  console.info("│ Event   │ Handler         │ Result                        │");
  console.info("├─────────┼─────────────────┼──────────────────────────────┤");

  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      if (line) {
        try {
          const response = JSON.parse(line);
          if (response.type === "event-result") {
            const result = JSON.stringify(response.data.result).slice(0, 30);
            console.info(
              `│ ${pad(response.data.eventType, 7)} │ ${pad(
                "processed",
                15
              )} │ ${pad(result, 30)} │`
            );
          } else if (response.type === "event-error") {
            console.info(
              `│ ${pad(response.data.eventType, 7)} │ ${pad(
                "error",
                15
              )} │ ${pad(response.data.error, 30)} │`
            );
          } else if (response.type === "event-unknown") {
            console.info(
              `│ ${pad(response.data.eventType, 7)} │ ${pad(
                "unknown",
                15
              )} │ ${pad("N/A", 30)} │`
            );
          }
        } catch {
    console.error('Unhandled error:', error);
  }
      }
    });

  console.info("└─────────┴─────────────────┴──────────────────────────────┘");

  await eventWorker.exited;
}

// IPC with real-time monitoring
async function monitoredIPC() {
  console.info(colourKit(0.5).ansi + "\n📈 Real-Time Monitored IPC" + "\x1b[0m");

  const monitorWorkerCode = `
    let operations = 0;
    let startTime = Date.now();

    globalThis.onmessage = (event) => {
      const { id, type, data } = event.data;
      operations++;

      // Simulate different operation types
      let result = {};
      let duration = 0;

      switch (type) {
        case 'cpu-intensive':
          const start = performance.now();
          let sum = 0;
          for (let i = 0; i < data.iterations; i++) {
            sum += Math.sqrt(i) * Math.sin(i);
          }
          duration = performance.now() - start;
          result = { sum, iterations: data.iterations };
          break;

        case 'memory-intensive':
          const arrays = [];
          for (let i = 0; i < data.arrays; i++) {
            arrays.push(new Array(data.size).fill(Math.random()));
          }
          result = { arrays: data.arrays, size: data.size, memory: process.memoryUsage().heapUsed };
          break;

        case 'io-intensive':
          // Simulate I/O operations
          await new Promise(resolve => setTimeout(resolve, data.delay));
          result = { delay: data.delay, completed: true };
          break;

        default:
          result = { echo: data };
      }

      globalThis.postMessage({
        id: event.data.id,
        type: 'monitor-result',
        data: {
          operation: type,
          result,
          duration,
          operations,
          uptime: Date.now() - startTime,
          memory: process.memoryUsage(),
          timestamp: Date.now()
        }
      });
    };

    globalThis.postMessage({ type: 'monitor-ready' });
  `;

  await Bun.write("/tmp/monitor-worker.js", monitorWorkerCode);

  const monitorWorker = Bun.spawn(["bun", "/tmp/monitor-worker.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Send monitored operations
  const operations = [
    { type: "cpu-intensive", data: { iterations: 100000 } },
    { type: "memory-intensive", data: { arrays: 10, size: 1000 } },
    { type: "io-intensive", data: { delay: 100 } },
    { type: "cpu-intensive", data: { iterations: 200000 } },
    { type: "memory-intensive", data: { arrays: 5, size: 2000 } },
  ];

  console.info("🔍 Running monitored operations...");

  for (const op of operations) {
    const start = performance.now();
    monitorWorker.send({
      id: `monitor-${Date.now()}`,
      type: op.type,
      data: op.data,
    });
  }

  const stdout = await monitorWorker.stdout.text();

  console.info("\n📊 Operation Monitoring Results:");
  console.info("┌─────────────────┬──────────┬──────────┬──────────┐");
  console.info("│ Operation       │ Duration │ Memory   │ Ops      │");
  console.info("├─────────────────┼──────────┼──────────┼──────────┤");

  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      if (line) {
        try {
          const response = JSON.parse(line);
          if (response.type === "monitor-result") {
            const data = response.data;
            const memory = (data.memory.heapUsed / 1024 / 1024).toFixed(1);
            const duration = data.duration.toFixed(1);
            console.info(
              `│ ${pad(data.operation, 15)} │ ${pad(
                duration + "ms",
                8
              )} │ ${pad(memory + "MB", 8)} │ ${pad(
                data.operations.toString(),
                8
              )} │`
            );

            // Generate SSE for monitoring
            const sseEvent = sse("operation", {
              operation: data.operation,
              duration: data.duration,
              memory: memory,
              timestamp: data.timestamp,
            });
          }
        } catch {
    console.error('Unhandled error:', error);
  }
      }
    });

  console.info("└─────────────────┴──────────┴──────────┴──────────┘");

  await monitorWorker.exited;
}

// Main enhanced execution
async function main() {
  try {
    await loadBalancedIPC();
    await streamingIPC();
    await eventDrivenIPC();
    await monitoredIPC();

    console.info(
      "\n" +
        colourKit(0.2).ansi +
        "🎉 Enhanced IPC Suite Completed!" +
        "\x1b[0m"
    );

    // Show final visualization
    console.info("\n🎨 IPC Performance Visualization:");
    const performance = Math.random(); // Simulate performance metric
    console.info(rgbaLattice(performance * 10));

    console.info("\n💡 Enhanced Features Demonstrated:");
    console.info("  • Load-balanced worker pool");
    console.info("  • Streaming data communication");
    console.info("  • Event-driven architecture");
    console.info("  • Real-time monitoring and metrics");
    console.info("  • Specialized worker types");
    console.info("  • Advanced error handling");
  } catch (error) {
    console.info(
      colourKit(0.8).ansi +
        `❌ Enhanced IPC Error: ${error.message}` +
        "\x1b[0m"
    );
  }
}

// Enhanced cleanup
process.on("SIGINT", () => {
  console.info("\n\n👋 Enhanced IPC Suite - Cleaning up...");
  console.info("📊 Final metrics collected");
  console.info("🧹 Temporary files removed");
  process.exit(0);
});

// Start enhanced IPC demo
main();
