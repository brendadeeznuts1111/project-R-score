import type { ArbitrageOpportunity } from '../types';

export function validateArbitrageOpportunity(opp: unknown): opp is ArbitrageOpportunity {
  if (!opp || typeof opp !== 'object') return false;
  
  const o = opp as Record<string, unknown>;
  
  return (
    typeof o.id === 'string' &&
    typeof o.symbol === 'string' &&
    typeof o.exchange1 === 'string' &&
    typeof o.exchange2 === 'string' &&
    typeof o.price1 === 'number' &&
    typeof o.price2 === 'number' &&
    typeof o.profit === 'number' &&
    typeof o.confidence === 'number' &&
    typeof o.timestamp === 'number'
  );
}

export function calculateProfit(price1: number, price2: number, side: 'buy' | 'sell'): number {
  if (side === 'buy') {
    return Math.abs(price2 - price1) - (price1 * 0.001 + price2 * 0.001); // 0.1% fees
  } else {
    return Math.abs(price1 - price2) - (price1 * 0.001 + price2 * 0.001);
  }
}

export function isValidArbitrage(price1: number, price2: number, minProfit: number = 0.001): boolean {
  return calculateProfit(price1, price2, 'buy') > minProfit;
}
