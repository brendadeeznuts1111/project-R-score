/**
 * MetricsBroadcast - WebSocket broadcasting for real-time metrics updates.
 * Integrates with the gateway broadcast system.
 */

import type { MetricsCollector } from "./collector.js";
import type { MetricsConfig, MetricsData, MetricsEvent } from "./types.js";

export type MetricsBroadcastConfig = MetricsConfig["websocket"];

export type MetricsBroadcaster = {
  start: () => void;
  stop: () => void;
  broadcastNow: () => void;
  getSubscriberCount: () => number;
};

/**
 * Create a metrics broadcaster that integrates with the gateway.
 */
export function createMetricsBroadcaster(params: {
  collector: MetricsCollector;
  broadcast: (event: string, payload: unknown, opts?: { dropIfSlow?: boolean }) => void;
  config?: Partial<MetricsBroadcastConfig>;
}): MetricsBroadcaster {
  const config: MetricsBroadcastConfig = {
    enabled: true,
    updateInterval: 5000,
    maxConnections: 10,
    ...params.config,
  };

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let subscriberCount = 0;

  const broadcastMetrics = () => {
    if (!config.enabled) return;

    const metricsData = params.collector.getMetrics();
    const event: MetricsEvent = {
      type: "update",
      timestamp: Date.now(),
      data: metricsData,
    };

    params.broadcast("metrics", event, { dropIfSlow: true });
  };

  const start = () => {
    if (intervalId) return;
    if (!config.enabled) return;

    intervalId = setInterval(broadcastMetrics, config.updateInterval);
    console.log(`[metrics] Broadcast started (interval: ${config.updateInterval}ms)`);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log("[metrics] Broadcast stopped");
    }
  };

  const broadcastNow = () => {
    broadcastMetrics();
  };

  const getSubscriberCount = () => subscriberCount;

  // Set up collector callback to broadcast on each execution
  params.collector.setBroadcastUpdate((data: MetricsData) => {
    if (!config.enabled) return;

    const event: MetricsEvent = {
      type: "update",
      timestamp: Date.now(),
      data,
    };
    params.broadcast("metrics", event, { dropIfSlow: true });
  });

  return {
    start,
    stop,
    broadcastNow,
    getSubscriberCount,
  };
}
