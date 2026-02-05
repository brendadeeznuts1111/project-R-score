// packages/odds-core/src/market-worker.ts - Market data processing worker
import { BunUtils, OddsProtocolUtils } from './bun-utils';
import { BunGlobalsIntegration } from './bun-globals';

interface WorkerMessage {
  type: 'process-tick' | 'process-batch' | 'calculate-indicators';
  data: any;
}

interface WorkerResponse {
  type: 'tick-processed' | 'batch-processed' | 'indicators-calculated';
  data: any;
  processingTime: number;
  workerId: string;
}

// Market data processing functions
function processTick(tick: any): any {
  const processed = {
    ...tick,
    processed: true,
    processedAt: Date.now(),
    vwap: tick.price * tick.size, // Simplified VWAP calculation
    spread: tick.ask && tick.bid ? Number(tick.ask) - Number(tick.bid) : 0
  };
  
  return processed;
}

function processBatch(ticks: any[]): any {
  const processed = ticks.map(processTick);
  
  const analysis = {
    count: processed.length,
    avgPrice: processed.reduce((sum, t) => sum + Number(t.price), 0) / processed.length,
    maxPrice: Math.max(...processed.map(t => Number(t.price))),
    minPrice: Math.min(...processed.map(t => Number(t.price))),
    totalVolume: processed.reduce((sum, t) => sum + Number(t.size), 0),
    avgSpread: processed.reduce((sum, t) => sum + Number(t.spread || 0), 0) / processed.length,
    timestamp: Date.now()
  };
  
  return {
    ticks: processed,
    analysis
  };
}

function calculateIndicators(data: number[]): any {
  const prices = data;
  const returns = [];
  
  // Calculate returns
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  // Simple moving averages
  const sma5 = calculateSMA(prices, 5);
  const sma10 = calculateSMA(prices, 10);
  const sma20 = calculateSMA(prices, 20);
  
  // Volatility (standard deviation of returns)
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  return {
    prices,
    returns,
    sma5,
    sma10,
    sma20,
    volatility,
    avgReturn,
    timestamp: Date.now()
  };
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// Worker message handler
const workerId = Math.random().toString(36).substr(2, 9);

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  const start = performance.now();
  
  try {
    let response: WorkerResponse;
    
    switch (message.type) {
      case 'process-tick':
        const processedTick = processTick(message.data);
        response = {
          type: 'tick-processed',
          data: processedTick,
          processingTime: performance.now() - start,
          workerId
        };
        break;
        
      case 'process-batch':
        const processedBatch = processBatch(message.data);
        response = {
          type: 'batch-processed',
          data: processedBatch,
          processingTime: performance.now() - start,
          workerId
        };
        break;
        
      case 'calculate-indicators':
        const indicators = calculateIndicators(message.data);
        response = {
          type: 'indicators-calculated',
          data: indicators,
          processingTime: performance.now() - start,
          workerId
        };
        break;
        
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
    
    self.postMessage(response);
    
  } catch (error) {
    console.error(`Worker ${workerId} error:`, error);
    
    const errorResponse: WorkerResponse = {
      type: 'tick-processed', // Default type for error responses
      data: { error: error instanceof Error ? error.message : String(error) },
      processingTime: performance.now() - start,
      workerId
    };
    
    self.postMessage(errorResponse);
  }
};

// Initialize worker
console.log(`🏭 Market data worker ${workerId} initialized`);

export {};
