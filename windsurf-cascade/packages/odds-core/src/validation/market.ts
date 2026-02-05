import type { MarketData } from '../types';

export function validateMarketData(data: unknown): data is MarketData {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as Record<string, unknown>;
  
  return (
    typeof d.symbol === 'string' &&
    Array.isArray(d.bids) &&
    Array.isArray(d.asks) &&
    typeof d.timestamp === 'number' &&
    typeof d.sequence === 'number' &&
    d.bids.every((bid: unknown) => 
      Array.isArray(bid) && bid.length === 2 && 
      typeof bid[0] === 'number' && typeof bid[1] === 'number'
    ) &&
    d.asks.every((ask: unknown) => 
      Array.isArray(ask) && ask.length === 2 && 
      typeof ask[0] === 'number' && typeof ask[1] === 'number'
    )
  );
}

export function sanitizeMarketData(data: Partial<MarketData>): MarketData | null {
  if (!data.symbol || !data.timestamp) return null;
  
  return {
    symbol: String(data.symbol),
    bids: (data.bids || []).map(([price, size]) => [Number(price), Number(size)]),
    asks: (data.asks || []).map(([price, size]) => [Number(price), Number(size)]),
    timestamp: Number(data.timestamp),
    sequence: Number(data.sequence || 0)
  };
}
