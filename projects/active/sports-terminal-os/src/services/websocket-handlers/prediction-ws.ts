/**
 * Prediction Market WebSocket Handler
 *
 * Handles subscribe:prediction / unsubscribe:prediction messages
 * Broadcasts price updates and arbitrage alerts to connected clients.
 *
 * Zone: 3 (Forest Canopy)
 */

import type { ServerWebSocket } from "bun";
import { createLogger } from "@utils/logger";
import { logMarketDepth } from "@utils/tableLogger";
import type {
  PredictionProvider,
  PredictionMarket,
  ArbitrageOpportunity,
  ArbitrageAlertMessage,
  PredictionUpdateMessage,
} from "@utils/types";

const logger = createLogger("PredictionWS");

// ---------------------------------------------------------------------------
// Subscriber registry
// ---------------------------------------------------------------------------

/** Set of WebSocket data objects that are subscribed to prediction updates */
const predictionSubscribers = new Set<ServerWebSocket<unknown>>();

/** Subscribers filtered by provider */
const providerSubscribers = new Map<PredictionProvider, Set<ServerWebSocket<unknown>>>();

/** Subscribers filtered by market ID */
const marketSubscribers = new Map<string, Set<ServerWebSocket<unknown>>>();

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

export function handlePredictionSubscribe(
  ws: ServerWebSocket<unknown>,
  filter?: { provider?: PredictionProvider; marketId?: string }
): void {
  predictionSubscribers.add(ws);

  if (filter?.provider) {
    let set = providerSubscribers.get(filter.provider);
    if (!set) {
      set = new Set();
      providerSubscribers.set(filter.provider, set);
    }
    set.add(ws);
  }

  if (filter?.marketId) {
    let set = marketSubscribers.get(filter.marketId);
    if (!set) {
      set = new Set();
      marketSubscribers.set(filter.marketId, set);
    }
    set.add(ws);
  }

  logger.info(`Client subscribed to prediction updates (total: ${predictionSubscribers.size})`);

  // Send confirmation
  ws.send(
    JSON.stringify({
      type: "subscribed",
      data: { channel: "prediction", filter },
    })
  );
}

export function handlePredictionUnsubscribe(
  ws: ServerWebSocket<unknown>,
  filter?: { provider?: PredictionProvider; marketId?: string }
): void {
  predictionSubscribers.delete(ws);

  if (filter?.provider) {
    const set = providerSubscribers.get(filter.provider);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        providerSubscribers.delete(filter.provider);
      }
    }
  }

  if (filter?.marketId) {
    const set = marketSubscribers.get(filter.marketId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        marketSubscribers.delete(filter.marketId);
      }
    }
  }

  logger.debug(`Client unsubscribed from prediction updates (total: ${predictionSubscribers.size})`);

  ws.send(
    JSON.stringify({
      type: "unsubscribed",
      data: { channel: "prediction" },
    })
  );
}

/**
 * Remove a WebSocket from all prediction subscriptions.
 * Call this when a WebSocket connection closes.
 */
export function removePredictionSubscriber(ws: ServerWebSocket<unknown>): void {
  predictionSubscribers.delete(ws);

  for (const [provider, set] of providerSubscribers) {
    set.delete(ws);
    if (set.size === 0) {
      providerSubscribers.delete(provider);
    }
  }

  for (const [marketId, set] of marketSubscribers) {
    set.delete(ws);
    if (set.size === 0) {
      marketSubscribers.delete(marketId);
    }
  }
}

// ---------------------------------------------------------------------------
// Broadcast functions
// ---------------------------------------------------------------------------

/**
 * Broadcast a price update to all prediction subscribers.
 */
export function broadcastPriceUpdate(
  provider: PredictionProvider,
  data: {
    marketId: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    timestamp: number;
    marketName?: string;
    category?: string;
  }
): void {
  if (predictionSubscribers.size === 0) return;

  const message: PredictionUpdateMessage = {
    type: "prediction_update",
    provider,
    data,
  };

  const payload = JSON.stringify(message);
  const encoded = new TextEncoder().encode(payload);

  // Send to all prediction subscribers
  for (const ws of predictionSubscribers) {
    try {
      // If provider filter exists, check match
      const providerSet = providerSubscribers.get(provider);
      const marketSet = marketSubscribers.get(data.marketId);

      // Client is subscribed if:
      // - They're in the general prediction subscribers AND
      // - Either no provider filter, or they're subscribed to this provider AND
      // - Either no market filter, or they're subscribed to this market
      const providerMatch = !providerSet || providerSet.has(ws);
      const marketMatch = !marketSet || marketSet.has(ws);

      if (providerMatch && marketMatch) {
        ws.send(encoded);
      }
    } catch {
      // Client disconnected, will be cleaned up on close
    }
  }
}

/**
 * Broadcast an arbitrage alert to all prediction subscribers.
 */
export function broadcastArbitrageAlert(arb: ArbitrageOpportunity): void {
  if (predictionSubscribers.size === 0) return;

  const message: ArbitrageAlertMessage = {
    type: "arbitrage_alert",
    data: arb,
  };

  const payload = JSON.stringify(message);
  const encoded = new TextEncoder().encode(payload);

  // Send to ALL prediction subscribers for arbitrage alerts (they're important)
  for (const ws of predictionSubscribers) {
    try {
      ws.send(encoded);
    } catch {
      // Client disconnected
    }
  }

  logMarketDepth({
    eventId: arb.marketId,
    market: arb.marketName || "unknown",
    book: `${arb.providerA}+${arb.providerB}`,
    spread: arb.profitPct,
    lastUpdated: new Date().toISOString(),
  });

  logger.info(`[MarketDepth] Arbitrage alert broadcast: ${arb.marketId} (${arb.profitPct.toFixed(2)}%)`);
}

/**
 * Get current subscriber count.
 */
export function getPredictionSubscriberCount(): number {
  return predictionSubscribers.size;
}

/**
 * Get detailed subscriber stats.
 */
export function getPredictionSubscriberStats(): {
  total: number;
  byProvider: Record<string, number>;
  byMarket: Record<string, number>;
} {
  const byProvider: Record<string, number> = {};
  for (const [provider, set] of providerSubscribers) {
    byProvider[provider] = set.size;
  }

  const byMarket: Record<string, number> = {};
  for (const [marketId, set] of marketSubscribers) {
    byMarket[marketId] = set.size;
  }

  return {
    total: predictionSubscribers.size,
    byProvider,
    byMarket,
  };
}

/**
 * Process an incoming WebSocket message related to prediction markets.
 * Returns true if the message was handled.
 */
export function processPredictionWsMessage(
  ws: ServerWebSocket<unknown>,
  type: string,
  data?: unknown
): boolean {
  switch (type) {
    case "subscribe:prediction": {
      const filter = data as { provider?: PredictionProvider; marketId?: string } | undefined;
      handlePredictionSubscribe(ws, filter);
      return true;
    }

    case "unsubscribe:prediction": {
      const filter = data as { provider?: PredictionProvider; marketId?: string } | undefined;
      handlePredictionUnsubscribe(ws, filter);
      return true;
    }

    case "ping:prediction": {
      ws.send(
        JSON.stringify({
          type: "pong:prediction",
          data: { timestamp: Date.now(), subscribers: predictionSubscribers.size },
        })
      );
      return true;
    }

    default:
      return false;
  }
}
