import type { OddsTick } from '../types';

export function validateOddsTick(tick: unknown): tick is OddsTick {
  if (!tick || typeof tick !== 'object') return false;
  
  const t = tick as Record<string, unknown>;
  
  return (
    typeof t.id === 'string' &&
    typeof t.timestamp === 'number' &&
    typeof t.symbol === 'string' &&
    typeof t.price === 'number' &&
    typeof t.size === 'number' &&
    typeof t.exchange === 'string' &&
    (t.side === 'buy' || t.side === 'sell')
  );
}

export function sanitizeOddsTick(tick: Partial<OddsTick>): OddsTick | null {
  if (!tick.id || !tick.timestamp || !tick.symbol) return null;
  
  return {
    id: String(tick.id),
    timestamp: Number(tick.timestamp),
    symbol: String(tick.symbol),
    price: Number(tick.price) || 0,
    size: Number(tick.size) || 0,
    exchange: String(tick.exchange || ''),
    side: tick.side === 'buy' || tick.side === 'sell' ? tick.side : 'buy'
  };
}
