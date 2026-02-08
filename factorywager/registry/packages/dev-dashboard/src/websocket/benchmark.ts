#!/usr/bin/env bun
/**
 * WebSocket Benchmark Module
 * 
 * Benchmarks WebSocket performance including:
 * - Connection establishment time
 * - Message send/receive throughput
 * - Pub/sub performance
 * - Compression effectiveness
 * - Concurrent connection handling
 * 
 * Uses Bun's native WebSocket API for optimal performance.
 * Reference: https://bun.com/docs/runtime/websockets
 */

import { logger } from '../../user-profile/src/index.ts';

export interface WebSocketBenchmarkResult {
  name: string;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  category: 'websocket' | 'performance';
  metadata?: {
    connections?: number;
    messagesPerSecond?: number;
    avgLatency?: number;
    compressionRatio?: number;
    backpressureEvents?: number;
  };
}

/**
 * Benchmark WebSocket connection establishment
 */
export async function benchmarkConnectionTime(
  wsUrl: string,
  iterations: number = 10
): Promise<WebSocketBenchmarkResult> {
  const times: number[] = [];
  let errors = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const start = Bun.nanoseconds();
      const ws = new WebSocket(wsUrl);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000);
        
        ws.addEventListener('open', () => {
          clearTimeout(timeout);
          const time = (Bun.nanoseconds() - start) / 1_000_000;
          times.push(time);
          ws.close();
          resolve();
        });
        
        ws.addEventListener('error', (error) => {
          clearTimeout(timeout);
          errors++;
          reject(error);
        });
      });
    } catch (error) {
      errors++;
    }
    
    // Small delay between connections
    await Bun.sleep(10);
  }

  if (times.length === 0) {
    return {
      name: 'WebSocket Connection Time',
      time: 0,
      target: 100,
      status: 'fail',
      note: `❌ Failed to establish connections (${errors} errors)`,
      category: 'websocket',
    };
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const target = 100; // 100ms target

  return {
    name: 'WebSocket Connection Time',
    time: avgTime,
    target,
    status: avgTime < target * 2 ? 'pass' : avgTime < target * 5 ? 'warning' : 'fail',
    note: avgTime < target * 2 
      ? `✅ Fast (${avgTime.toFixed(2)}ms avg, ${times.length}/${iterations} successful)`
      : avgTime < target * 5
      ? `⚠️ Acceptable (${avgTime.toFixed(2)}ms avg)`
      : `❌ Slow (${avgTime.toFixed(2)}ms avg)`,
    category: 'websocket',
    metadata: {
      connections: times.length,
      avgLatency: avgTime,
    },
  };
}

/**
 * Benchmark WebSocket message throughput
 */
export async function benchmarkMessageThroughput(
  wsUrl: string,
  messageCount: number = 1000,
  messageSize: number = 100
): Promise<WebSocketBenchmarkResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let messagesReceived = 0;
    let messagesSent = 0;
    const startTime = Bun.nanoseconds();
    const message = 'x'.repeat(messageSize);
    let backpressureEvents = 0;

    ws.addEventListener('open', () => {
      // Send messages as fast as possible
      const sendNext = () => {
        if (messagesSent < messageCount) {
          const result = ws.send(JSON.stringify({
            type: 'ping',
            data: message,
            index: messagesSent,
          }));
          
          if (result === -1) {
            backpressureEvents++;
          }
          
          messagesSent++;
          
          // Continue sending (don't wait for response)
          if (messagesSent < messageCount) {
            setImmediate(sendNext);
          }
        }
      };
      
      sendNext();
    });

    ws.addEventListener('message', (event) => {
      messagesReceived++;
      
      if (messagesReceived >= messageCount) {
        const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000;
        const messagesPerSecond = (messagesReceived / totalTime) * 1000;
        const target = 10000; // 10k messages/second target
        
        ws.close();
        
        resolve({
          name: 'WebSocket Message Throughput',
          time: totalTime,
          target: messageCount / (target / 1000), // Convert to time target
          status: messagesPerSecond >= target * 0.8 
            ? 'pass' 
            : messagesPerSecond >= target * 0.5 
            ? 'warning' 
            : 'fail',
          note: messagesPerSecond >= target * 0.8
            ? `✅ Excellent (${messagesPerSecond.toFixed(0)} msg/s)`
            : messagesPerSecond >= target * 0.5
            ? `⚠️ Good (${messagesPerSecond.toFixed(0)} msg/s)`
            : `❌ Slow (${messagesPerSecond.toFixed(0)} msg/s)`,
          category: 'websocket',
          metadata: {
            messagesPerSecond: Math.round(messagesPerSecond),
            backpressureEvents,
          },
        });
      }
    });

    ws.addEventListener('error', (error) => {
      ws.close();
      resolve({
        name: 'WebSocket Message Throughput',
        time: 0,
        target: messageCount / 10,
        status: 'fail',
        note: `❌ Error: ${error}`,
        category: 'websocket',
      });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      ws.close();
      resolve({
        name: 'WebSocket Message Throughput',
        time: (Bun.nanoseconds() - startTime) / 1_000_000,
        target: messageCount / 10,
        status: 'fail',
        note: `❌ Timeout (received ${messagesReceived}/${messageCount} messages)`,
        category: 'websocket',
        metadata: {
          messagesPerSecond: Math.round((messagesReceived / ((Bun.nanoseconds() - startTime) / 1_000_000)) * 1000),
        },
      });
    }, 30000);
  });
}

/**
 * Benchmark WebSocket pub/sub performance
 */
export async function benchmarkPubSub(
  wsUrl: string,
  subscribers: number = 10,
  messages: number = 100
): Promise<WebSocketBenchmarkResult> {
  return new Promise((resolve) => {
    const connections: WebSocket[] = [];
    let messagesReceived = 0;
    const startTime = Bun.nanoseconds();
    let connected = 0;

    // Create multiple subscribers
    for (let i = 0; i < subscribers; i++) {
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        // Subscribe to a test topic
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['benchmark:test'],
        }));
        
        connected++;
        
        // When all connected, start publishing
        if (connected === subscribers) {
          // Send messages to trigger pub/sub
          for (let j = 0; j < messages; j++) {
            ws.send(JSON.stringify({
              type: 'publish',
              topic: 'benchmark:test',
              data: { index: j },
            }));
          }
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === 'benchmark:test' || data.data?.index !== undefined) {
            messagesReceived++;
            
            // Check if all messages received
            const expectedMessages = subscribers * messages;
            if (messagesReceived >= expectedMessages) {
              const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000;
              const messagesPerSecond = (messagesReceived / totalTime) * 1000;
              
              // Close all connections
              connections.forEach(ws => ws.close());
              
              resolve({
                name: 'WebSocket Pub/Sub Performance',
                time: totalTime,
                target: expectedMessages / 1000, // Target: 1k msg/s
                status: messagesPerSecond >= 1000 
                  ? 'pass' 
                  : messagesPerSecond >= 500 
                  ? 'warning' 
                  : 'fail',
                note: messagesPerSecond >= 1000
                  ? `✅ Excellent (${messagesPerSecond.toFixed(0)} msg/s, ${subscribers} subscribers)`
                  : messagesPerSecond >= 500
                  ? `⚠️ Good (${messagesPerSecond.toFixed(0)} msg/s)`
                  : `❌ Slow (${messagesPerSecond.toFixed(0)} msg/s)`,
                category: 'websocket',
                metadata: {
                  connections: subscribers,
                  messagesPerSecond: Math.round(messagesPerSecond),
                },
              });
            }
          }
        } catch {
          // Ignore non-benchmark messages
        }
      });

      connections.push(ws);
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      connections.forEach(ws => ws.close());
      resolve({
        name: 'WebSocket Pub/Sub Performance',
        time: (Bun.nanoseconds() - startTime) / 1_000_000,
        target: subscribers * messages / 1000,
        status: 'fail',
        note: `❌ Timeout (received ${messagesReceived}/${subscribers * messages} messages)`,
        category: 'websocket',
        metadata: {
          connections: subscribers,
        },
      });
    }, 30000);
  });
}

/**
 * Benchmark concurrent WebSocket connections
 */
export async function benchmarkConcurrentConnections(
  wsUrl: string,
  connectionCount: number = 50
): Promise<WebSocketBenchmarkResult> {
  const startTime = Bun.nanoseconds();
  const connections: WebSocket[] = [];
  let connected = 0;
  let errors = 0;

  return new Promise((resolve) => {
    // Create connections concurrently
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        connected++;
        
        if (connected + errors === connectionCount) {
          const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000;
          const connectionsPerSecond = (connected / totalTime) * 1000;
          
          // Close all connections
          connections.forEach(ws => {
            try {
              ws.close();
            } catch {
              // Ignore close errors
            }
          });
          
          resolve({
            name: 'WebSocket Concurrent Connections',
            time: totalTime,
            target: connectionCount / 10, // Target: 10 connections/second
            status: connectionsPerSecond >= 10 
              ? 'pass' 
              : connectionsPerSecond >= 5 
              ? 'warning' 
              : 'fail',
            note: connectionsPerSecond >= 10
              ? `✅ Excellent (${connected}/${connectionCount} connections, ${connectionsPerSecond.toFixed(0)} conn/s)`
              : connectionsPerSecond >= 5
              ? `⚠️ Good (${connected}/${connectionCount} connections)`
              : `❌ Slow (${connected}/${connectionCount} connections)`,
            category: 'websocket',
            metadata: {
              connections: connected,
            },
          });
        }
      });

      ws.addEventListener('error', () => {
        errors++;
        
        if (connected + errors === connectionCount) {
          const totalTime = (Bun.nanoseconds() - startTime) / 1_000_000;
          
          connections.forEach(ws => {
            try {
              ws.close();
            } catch {
              // Ignore close errors
            }
          });
          
          resolve({
            name: 'WebSocket Concurrent Connections',
            time: totalTime,
            target: connectionCount / 10,
            status: 'fail',
            note: `❌ Errors (${connected}/${connectionCount} successful, ${errors} errors)`,
            category: 'websocket',
            metadata: {
              connections: connected,
            },
          });
        }
      });

      connections.push(ws);
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      connections.forEach(ws => {
        try {
          ws.close();
        } catch {
          // Ignore close errors
        }
      });
      
      resolve({
        name: 'WebSocket Concurrent Connections',
        time: (Bun.nanoseconds() - startTime) / 1_000_000,
        target: connectionCount / 10,
        status: 'fail',
        note: `❌ Timeout (${connected}/${connectionCount} connected)`,
        category: 'websocket',
        metadata: {
          connections: connected,
        },
      });
    }, 10000);
  });
}

/**
 * Run all WebSocket benchmarks
 * 
 * @param wsUrl - WebSocket server URL (defaults to ws://localhost:3008/ws)
 *                Can be overridden via WEBSOCKET_BENCHMARK_URL environment variable
 * 
 * @example
 * ```typescript
 * // Use default URL
 * const results = await runWebSocketBenchmarks();
 * 
 * // Use custom URL
 * const results = await runWebSocketBenchmarks('ws://example.com:8080/ws');
 * 
 * // Use environment variable
 * // WEBSOCKET_BENCHMARK_URL=ws://example.com:8080/ws bun run benchmark
 * ```
 */
export async function runWebSocketBenchmarks(
  wsUrl?: string
): Promise<WebSocketBenchmarkResult[]> {
  // Get URL from parameter, environment variable, or default
  const url = wsUrl || process.env.WEBSOCKET_BENCHMARK_URL || 'ws://localhost:3008/ws';
  const results: WebSocketBenchmarkResult[] = [];

  logger.info('🔌 Starting WebSocket benchmarks...');

  // Benchmark 1: Connection time
  try {
    const result = await benchmarkConnectionTime(wsUrl, 10);
    results.push(result);
  } catch (error) {
    results.push({
      name: 'WebSocket Connection Time',
      time: 0,
      target: 100,
      status: 'fail',
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: 'websocket',
    });
  }

  // Small delay between benchmarks
  await Bun.sleep(1000);

  // Benchmark 2: Message throughput
  try {
    const result = await benchmarkMessageThroughput(wsUrl, 500, 100);
    results.push(result);
  } catch (error) {
    results.push({
      name: 'WebSocket Message Throughput',
      time: 0,
      target: 50,
      status: 'fail',
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: 'websocket',
    });
  }

  // Small delay between benchmarks
  await Bun.sleep(1000);

  // Benchmark 3: Concurrent connections
  try {
    const result = await benchmarkConcurrentConnections(wsUrl, 20);
    results.push(result);
  } catch (error) {
    results.push({
      name: 'WebSocket Concurrent Connections',
      time: 0,
      target: 2,
      status: 'fail',
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: 'websocket',
    });
  }

  logger.info(`✅ WebSocket benchmarks completed: ${results.length} benchmarks`);

  return results;
}
