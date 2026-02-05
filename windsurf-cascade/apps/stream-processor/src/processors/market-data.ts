import type { OddsTick, MarketData } from 'odds-core';

export interface ProcessedMarketData {
  symbol: string;
  ticks: OddsTick[];
  aggregatedData: {
    totalVolume: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    volatility: number;
    trend: 'up' | 'down' | 'sideways';
  };
  sequence: number;
  timestamp: number;
}

export class MarketDataProcessor {
  private tickBuffer: Map<string, OddsTick[]> = new Map();
  private readonly bufferSize = 1000;
  private readonly aggregationWindow = 60000; // 1 minute

  public async process(rawData: MarketData): Promise<ProcessedMarketData> {
    const symbol = rawData.symbol;
    const timestamp = Date.now();
    
    // Convert market data to ticks
    const ticks = this.marketDataToTicks(rawData);
    
    // Update buffer
    this.updateBuffer(symbol, ticks);
    
    // Get buffered ticks for aggregation
    const bufferedTicks = this.tickBuffer.get(symbol) || [];
    
    // Calculate aggregated metrics
    const aggregatedData = this.calculateAggregatedData(bufferedTicks);
    
    return {
      symbol,
      ticks: bufferedTicks.slice(-100), // Return last 100 ticks
      aggregatedData,
      sequence: this.generateSequence(symbol),
      timestamp
    };
  }

  private marketDataToTicks(marketData: MarketData): OddsTick[] {
    const ticks: OddsTick[] = [];
    const timestamp = Date.now();
    
    // Convert bids to ticks
    marketData.bids.forEach(([price, size], index) => {
      ticks.push({
        id: `${marketData.symbol}-bid-${index}-${timestamp}`,
        timestamp: timestamp + index,
        symbol: marketData.symbol,
        price,
        size,
        exchange: 'unknown', // Would be determined by context
        side: 'buy'
      });
    });
    
    // Convert asks to ticks
    marketData.asks.forEach(([price, size], index) => {
      ticks.push({
        id: `${marketData.symbol}-ask-${index}-${timestamp}`,
        timestamp: timestamp + index + marketData.bids.length,
        symbol: marketData.symbol,
        price,
        size,
        exchange: 'unknown', // Would be determined by context
        side: 'sell'
      });
    });
    
    return ticks;
  }

  private updateBuffer(symbol: string, ticks: OddsTick[]): void {
    if (!this.tickBuffer.has(symbol)) {
      this.tickBuffer.set(symbol, []);
    }
    
    const buffer = this.tickBuffer.get(symbol)!;
    buffer.push(...ticks);
    
    // Remove old ticks outside aggregation window
    const cutoffTime = Date.now() - this.aggregationWindow;
    const filtered = buffer.filter(tick => tick.timestamp > cutoffTime);
    
    // Maintain buffer size limit
    if (filtered.length > this.bufferSize) {
      filtered.splice(0, filtered.length - this.bufferSize);
    }
    
    this.tickBuffer.set(symbol, filtered);
  }

  private calculateAggregatedData(ticks: OddsTick[]): ProcessedMarketData['aggregatedData'] {
    if (ticks.length === 0) {
      return {
        totalVolume: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        volatility: 0,
        trend: 'sideways'
      };
    }

    const prices = ticks.map(tick => tick.price);
    const volumes = ticks.map(tick => tick.size);
    
    const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Calculate volatility (standard deviation of prices)
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - averagePrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);
    
    // Determine trend
    const trend = this.calculateTrend(ticks);
    
    return {
      totalVolume,
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice },
      volatility,
      trend
    };
  }

  private calculateTrend(ticks: OddsTick[]): 'up' | 'down' | 'sideways' {
    if (ticks.length < 10) return 'sideways';
    
    const recentTicks = ticks.slice(-10);
    const prices = recentTicks.map(tick => tick.price);
    
    // Simple linear regression to determine trend
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = prices.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * prices[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (slope > 0.01) return 'up';
    if (slope < -0.01) return 'down';
    return 'sideways';
  }

  private generateSequence(symbol: string): number {
    // Simple sequence generation based on symbol and timestamp
    const hash = this.simpleHash(symbol + Date.now());
    return Math.abs(hash) % 1000000;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  public getBufferStats(): { [symbol: string]: { size: number; oldestTick: number; newestTick: number } } {
    const stats: { [symbol: string]: { size: number; oldestTick: number; newestTick: number } } = {};
    
    for (const [symbol, ticks] of this.tickBuffer.entries()) {
      if (ticks.length > 0) {
        const timestamps = ticks.map(tick => tick.timestamp);
        stats[symbol] = {
          size: ticks.length,
          oldestTick: Math.min(...timestamps),
          newestTick: Math.max(...timestamps)
        };
      }
    }
    
    return stats;
  }

  public clearBuffer(symbol?: string): void {
    if (symbol) {
      this.tickBuffer.delete(symbol);
    } else {
      this.tickBuffer.clear();
    }
  }

  public getAggregatedData(symbol: string): ProcessedMarketData['aggregatedData'] | null {
    const ticks = this.tickBuffer.get(symbol) || [];
    return ticks.length > 0 ? this.calculateAggregatedData(ticks) : null;
  }

  public async processBatch(marketDataArray: MarketData[]): Promise<ProcessedMarketData[]> {
    const processedData: ProcessedMarketData[] = [];
    
    // Process concurrently for better performance
    const promises = marketDataArray.map(data => this.process(data));
    const results = await Promise.all(promises);
    
    processedData.push(...results);
    
    return processedData;
  }

  public validateMarketData(data: MarketData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.symbol || typeof data.symbol !== 'string') {
      errors.push('Invalid or missing symbol');
    }
    
    if (!Array.isArray(data.bids) || data.bids.length === 0) {
      errors.push('Invalid or missing bids');
    } else {
      data.bids.forEach(([price, size], index) => {
        if (typeof price !== 'number' || price <= 0) {
          errors.push(`Invalid bid price at index ${index}`);
        }
        if (typeof size !== 'number' || size <= 0) {
          errors.push(`Invalid bid size at index ${index}`);
        }
      });
    }
    
    if (!Array.isArray(data.asks) || data.asks.length === 0) {
      errors.push('Invalid or missing asks');
    } else {
      data.asks.forEach(([price, size], index) => {
        if (typeof price !== 'number' || price <= 0) {
          errors.push(`Invalid ask price at index ${index}`);
        }
        if (typeof size !== 'number' || size <= 0) {
          errors.push(`Invalid ask size at index ${index}`);
        }
      });
    }
    
    // Check bid-ask spread
    if (data.bids.length > 0 && data.asks.length > 0) {
      const bestBid = data.bids[0][0];
      const bestAsk = data.asks[0][0];
      if (bestBid >= bestAsk) {
        errors.push('Invalid bid-ask spread: best bid is >= best ask');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
