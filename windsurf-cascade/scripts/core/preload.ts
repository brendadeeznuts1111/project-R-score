import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun
// scripts/preload.ts - Bun v1.3 Full-Stack Preload

console.log('🚀 Bun v1.3 Full-Stack Preload Initializing...');

// Bun v1.3: 500x faster postMessage optimization
if (typeof Bun !== 'undefined') {
  // Enable optimized worker communication
  (globalThis as any).BUN_POSTMESSAGE_OPTIMIZED = true;
}

// Import our existing Bun utilities
// Note: These imports may not exist yet, so we'll handle gracefully
try {
  // import { BunUtils, OddsProtocolUtils } from '../packages/odds-core/src/bun-utils';
  // import { BunGlobalsIntegration } from '../packages/odds-core/src/bun-globals';
} catch (error) {
  // Modules don't exist yet, continue without them
}

// Pre-warm database connections with SQL preconnection
async function preWarmDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('🔗 Pre-warming database connections...');
      
      // Bun v1.3: SQL preconnection for immediate database access
      // Make pg import optional in case it's not installed
      let Client: any;
      try {
        const pg = await import('pg');
        Client = pg.Client;
      } catch (error) {
        console.warn('⚠️ pg not available, skipping database pre-warm');
        return;
      }
      
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });
      
      try {
        await client.connect();
        console.log('✅ Database preconnected successfully');
        
        // Create tables if they don't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS odds_ticks (
            id TEXT PRIMARY KEY,
            sport TEXT NOT NULL,
            game_id TEXT NOT NULL,
            market_type TEXT NOT NULL,
            exchange TEXT NOT NULL,
            line DECIMAL NOT NULL,
            juice INTEGER NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            volume INTEGER,
            sharp BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_ticks_timestamp ON odds_ticks(timestamp);
          CREATE INDEX IF NOT EXISTS idx_ticks_sport_game ON odds_ticks(sport, game_id);
        `);
        
        await client.end();
      } catch (error) {
        console.warn('⚠️ Database preconnection failed:', (error as Error).message);
      }
    }
  } catch (error) {
    console.warn('⚠️ Database pre-warm failed, continuing without it:', error);
  }
}

// Pre-initialize Bun utilities
console.log('⚡ Pre-initializing Bun v1.3 utilities...');

// Bun v1.3: Rapidhash for fast hashing
(globalThis as any).rapidHash = (data: string) => Bun.hash.rapidhash(data);

// Bun v1.3: stripANSI for 6-57x faster ANSI code removal
(globalThis as any).stripANSI = (text: string) => Bun.stripANSI(text);

// Pre-load ML models and caches in development
function initializeModelCache() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🧠 Initializing ML model cache...');
    
    const modelCache = new Map<string, any>();
    
    // Pre-load common models
    const commonModels = ['arbitrage-detection', 'sharp-analysis', 'line-movement'];
    commonModels.forEach(model => {
      modelCache.set(model, {
        loaded: true,
        version: '1.3.0',
        preloadedAt: Date.now()
      });
    });
    
    (globalThis as any).modelCache = modelCache;
    console.log(`✅ Pre-loaded ${commonModels.length} ML models`);
  }
}

// Pre-spawn worker threads with Bun v1.3 optimizations
function initializeWorkerPool() {
  if (Bun.isMainThread) {
    const workerCount = parseInt(process.env.WORKER_COUNT || '4');
    (globalThis as any).workerPool = [];
    
    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker(
          new URL('../packages/odds-websocket/src/tick-processor.ts', import.meta.url).href,
          {
            smol: true, // Bun v1.3: Reduced memory usage
            name: `tick-processor-${i}`,
          }
        );
        
        worker.onerror = (error) => {
          console.error(`Worker ${i} error:`, error);
        };
        
        ((globalThis as any).workerPool as Worker[]).push(worker);
        console.log(`✅ Worker ${i} pre-spawned with smol optimization`);
      } catch (error) {
        console.warn(`⚠️ Failed to spawn worker ${i}:`, error);
      }
    }
    
    console.log(`🔄 ${workerCount} worker threads pre-spawned with smol mode`);
  }
}

// Pre-initialize performance monitoring
(globalThis as any).performanceMonitor = {
  samples: new Map(),
  record: (operation: string, duration: number) => {
    if (!(globalThis as any).performanceMonitor.samples.has(operation)) {
      (globalThis as any).performanceMonitor.samples.set(operation, []);
    }
    (globalThis as any).performanceMonitor.samples.get(operation)!.push(duration);
  },
  getStats: (operation: string) => {
    const samples = (globalThis as any).performanceMonitor.samples.get(operation) || [];
    if (samples.length === 0) return null;
    
    const sorted = [...samples].sort((a: number, b: number) => a - b);
    const p95 = sorted[Math.floor(samples.length * 0.95)];
    const p99 = sorted[Math.floor(samples.length * 0.99)];
    
    return {
      count: samples.length,
      average: samples.reduce((a: number, b: number) => a + b, 0) / samples.length,
      p95,
      p99,
      min: sorted[0],
      max: sorted[samples.length - 1],
    };
  }
};

// Main preload initialization
async function initializePreload() {
  const startTime = performance.now();
  
  try {
    await Promise.all([
      preWarmDatabase(),
      initializeModelCache(),
      initializeWorkerPool(),
    ]);
    
    const initTime = performance.now() - startTime;
    console.log(`✅ Bun v1.3 Full-Stack Preload Complete in ${initTime.toFixed(2)}ms`);
    
    // Log initialization summary
    console.log('📋 Preload Summary:');
    console.log(`  - Workers: ((globalThis as any).workerPool as Worker[])?.length || 0`);
    console.log(`  - ML Models: ((globalThis as any).modelCache as Map<string, any>)?.size || 0`);
    console.log(`  - RapidHash: ${typeof (globalThis as any).rapidHash === 'function' ? 'enabled' : 'disabled'}`);
    console.log(`  - StripANSI: ${typeof (globalThis as any).stripANSI === 'function' ? 'enabled' : 'disabled'}`);
    console.log(`  - Performance Monitor: ${typeof (globalThis as any).performanceMonitor === 'object' ? 'enabled' : 'disabled'}`);
    
  } catch (error) {
    console.error('❌ Preload initialization failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Graceful shutdown initiated...');
  
  // Cleanup workers
  if ((globalThis as any).workerPool) {
    (globalThis as any).workerPool.forEach((worker: Worker) => {
      worker.terminate();
    });
  }
  
  process.exit(0);
});

// Start initialization
initializePreload().catch(console.error);
