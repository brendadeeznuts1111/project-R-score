/**
 * §TelemetryEngine - Real-time metrics meshing and broadcasting.
 * Designed for <0.1ms instrumentation overhead using Bun-native performance primitives.
 */

export interface TelemetryPacket {
  topic: string;
  payload: any;
  timestamp: number;
}

export type TelemetryListener = (data: any) => void;

class TelemetryEngine {
  private static instance: TelemetryEngine;
  private listeners: Map<string, Set<TelemetryListener>> = new Map();

  private constructor() {
    console.log("📡 TelemetryEngine initialized (Empire Pro)");
  }

  public static getInstance(): TelemetryEngine {
    if (!TelemetryEngine.instance) {
      TelemetryEngine.instance = new TelemetryEngine();
    }
    return TelemetryEngine.instance;
  }

  /**
   * Broadcast a metric to the mesh.
   * Optimized for zero-allocation when no listeners are present.
   */
  public broadcast(topic: string, data: any): void {
    const topicListeners = this.listeners.get(topic);
    if (!topicListeners || topicListeners.size === 0) return;

    // Use Bun.nanoseconds() for high-precision timing if needed, 
    // but for the packet timestamp Date.now() is sufficient for UI sync.
    const packet: TelemetryPacket = {
      topic,
      payload: data,
      timestamp: Date.now()
    };

    for (const listener of topicListeners) {
      try {
        listener(packet);
      } catch (e) {
        console.error(`[Telemetry] Error in listener for topic ${topic}:`, e);
      }
    }
  }

  /**
   * Subscribe to a specific telemetry topic.
   */
  public subscribe(topic: string, listener: TelemetryListener): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(listener);

    return () => {
      const topicListeners = this.listeners.get(topic);
      if (topicListeners) {
        topicListeners.delete(listener);
        if (topicListeners.size === 0) {
          this.listeners.delete(topic);
        }
      }
    };
  }

  /**
   * Captures and broadcasts system health metrics.
   */
  public captureSystemHealth(): void {
    const mem = process.memoryUsage();
    this.broadcast("system:health", {
      heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + " MB",
      rss: (mem.rss / 1024 / 1024).toFixed(2) + " MB",
      uptime: process.uptime().toFixed(0) + "s",
      bunVersion: Bun.version
    });
  }
}

export const telemetry = TelemetryEngine.getInstance();
