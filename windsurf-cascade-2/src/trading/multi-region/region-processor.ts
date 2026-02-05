// Multi-Region Data Processor
// Handles data processing across different regions with failover and load balancing

import { polymarketClient, PolymarketMarketData } from '../platform-integrations/polymarket-client.js';
import { fanduelUSClient, fanduelUKClient, FanduelMarketData } from '../platform-integrations/fanduel-client.js';
import { sportsTradingEngine, TradingSignal } from '../sports-trading-engine.js';

export interface RegionConfig {
  name: string;
  code: string;
  timezone: string;
  platforms: string[];
  latency: number;
  priority: number;
}

export interface ProcessedData {
  region: string;
  source: string;
  originalData: any;
  processedData: any;
  signals: TradingSignal[];
  timestamp: number;
  processingTime: number;
}

export class MultiRegionProcessor {
  private regions: Map<string, RegionConfig> = new Map();
  private activeRegions: Set<string> = new Set();
  private dataBuffer: Map<string, any[]> = new Map();
  private processingQueue: ProcessedData[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.initializeRegions();
    this.startProcessing();
  }

  // Initialize supported regions
  private initializeRegions(): void {
    const regions: RegionConfig[] = [
      {
        name: 'United States',
        code: 'us',
        timezone: 'America/New_York',
        platforms: ['fanduel', 'polymarket'],
        latency: 50,
        priority: 1
      },
      {
        name: 'United Kingdom',
        code: 'uk',
        timezone: 'Europe/London',
        platforms: ['fanduel'],
        latency: 30,
        priority: 2
      },
      {
        name: 'European Union',
        code: 'eu',
        timezone: 'Europe/Paris',
        platforms: ['polymarket'],
        latency: 40,
        priority: 3
      },
      {
        name: 'Asia Pacific',
        code: 'apac',
        timezone: 'Asia/Tokyo',
        platforms: ['polymarket'],
        latency: 80,
        priority: 4
      }
    ];

    regions.forEach(region => {
      this.regions.set(region.code, region);
      this.activeRegions.add(region.code);
    });
  }

  // Get all available regions
  getAvailableRegions(): RegionConfig[] {
    return Array.from(this.regions.values());
  }

  // Get active regions
  getActiveRegions(): string[] {
    return Array.from(this.activeRegions);
  }

  // Activate/deactivate regions
  setRegionActive(regionCode: string, active: boolean): void {
    if (active) {
      this.activeRegions.add(regionCode);
    } else {
      this.activeRegions.delete(regionCode);
    }
  }

  // Fetch data from all active regions
  async fetchAllRegionData(): Promise<ProcessedData[]> {
    const results: ProcessedData[] = [];
    const fetchPromises: Promise<void>[] = [];

    for (const regionCode of this.activeRegions) {
      const region = this.regions.get(regionCode);
      if (!region) continue;

      for (const platform of region.platforms) {
        fetchPromises.push(this.fetchPlatformData(regionCode, platform, results));
      }
    }

    await Promise.allSettled(fetchPromises);
    return results;
  }

  // Fetch data from specific platform in region
  private async fetchPlatformData(
    regionCode: string, 
    platform: string, 
    results: ProcessedData[]
  ): Promise<void> {
    const startTime = Bun.nanoseconds();
    
    try {
      let rawData: any;
      
      switch (platform) {
        case 'polymarket':
          rawData = await this.fetchPolymarketData(regionCode);
          break;
        case 'fanduel':
          rawData = await this.fetchFanduelData(regionCode);
          break;
        default:
          console.warn(`Unsupported platform: ${platform}`);
          return;
      }

      if (rawData && rawData.length > 0) {
        const processedData = await this.processRegionData(regionCode, platform, rawData);
        const processingTime = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to ms

        for (const data of processedData) {
          results.push({
            region: regionCode,
            source: platform,
            originalData: data.original,
            processedData: data.processed,
            signals: data.signals,
            timestamp: Date.now(),
            processingTime
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${platform} data for region ${regionCode}:`, error);
    }
  }

  // Fetch Polymarket data with region support
  private async fetchPolymarketData(regionCode: string): Promise<any[]> {
    try {
      // Get active markets
      const markets = await polymarketClient.getActiveMarkets(50);
      const marketDataPromises = markets.slice(0, 10).map(market => 
        polymarketClient.getMarketData(market.id)
      );

      const marketDataResults = await Promise.allSettled(marketDataPromises);
      return marketDataResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<PolymarketMarketData>).value);
    } catch (error) {
      console.error(`Polymarket fetch failed for region ${regionCode}:`, error);
      return [];
    }
  }

  // Fetch Fanduel data with region support
  private async fetchFanduelData(regionCode: string): Promise<any[]> {
    try {
      const client = regionCode === 'uk' ? fanduelUKClient : fanduelUSClient;
      
      // Get active events
      const events = await client.getActiveEvents(undefined, 50);
      const marketDataPromises = events.slice(0, 10).map(event => 
        client.getMarketData(event.id)
      );

      const marketDataResults = await Promise.allSettled(marketDataPromises);
      return marketDataResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<FanduelMarketData>).value);
    } catch (error) {
      console.error(`Fanduel fetch failed for region ${regionCode}:`, error);
      return [];
    }
  }

  // Process regional data
  private async processRegionData(
    regionCode: string, 
    platform: string, 
    rawData: any[]
  ): Promise<Array<{ original: any; processed: any; signals: TradingSignal[] }>> {
    const results: Array<{ original: any; processed: any; signals: TradingSignal[] }> = [];

    for (const data of rawData) {
      try {
        // Convert to our trading format
        let processedData: any;
        
        if (platform === 'polymarket') {
          processedData = polymarketClient.convertToTradingFormat(data);
        } else if (platform === 'fanduel') {
          const client = regionCode === 'uk' ? fanduelUKClient : fanduelUSClient;
          processedData = client.convertToTradingFormat(data);
        }

        // Add region metadata
        processedData.region = regionCode;
        processedData.platform = platform;
        processedData.processedAt = Date.now();

        // Generate trading signals
        const signals = await sportsTradingEngine.processMarketData(processedData);

        results.push({
          original: data,
          processed: processedData,
          signals
        });
      } catch (error) {
        console.error(`Failed to process data from ${platform} in ${regionCode}:`, error);
      }
    }

    return results;
  }

  // Start continuous processing
  private startProcessing(): void {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processBatch();
      }
    }, 5000); // Process every 5 seconds
  }

  // Process batch of data
  private async processBatch(): Promise<void> {
    this.isProcessing = true;
    
    try {
      const batchData = await this.fetchAllRegionData();
      
      // Add to processing queue
      this.processingQueue.push(...batchData);
      
      // Keep queue size manageable
      if (this.processingQueue.length > 1000) {
        this.processingQueue = this.processingQueue.slice(-500);
      }

      console.log(`🌍 Processed ${batchData.length} data points from ${this.activeRegions.size} regions`);
      
      // Log regional breakdown
      const regionBreakdown = new Map<string, number>();
      batchData.forEach(data => {
        regionBreakdown.set(data.region, (regionBreakdown.get(data.region) || 0) + 1);
      });
      
      for (const [region, count] of regionBreakdown) {
        console.log(`   ${region.toUpperCase()}: ${count} data points`);
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get processing statistics
  getStatistics(): {
    activeRegions: number;
    totalProcessed: number;
    averageProcessingTime: number;
    queueSize: number;
    regionBreakdown: Record<string, number>;
  } {
    const regionBreakdown: Record<string, number> = {};
    
    for (const data of this.processingQueue) {
      regionBreakdown[data.region] = (regionBreakdown[data.region] || 0) + 1;
    }

    const avgProcessingTime = this.processingQueue.length > 0
      ? this.processingQueue.reduce((sum, data) => sum + data.processingTime, 0) / this.processingQueue.length
      : 0;

    return {
      activeRegions: this.activeRegions.size,
      totalProcessed: this.processingQueue.length,
      averageProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      queueSize: this.processingQueue.length,
      regionBreakdown
    };
  }

  // Get recent processed data
  getRecentData(limit: number = 100): ProcessedData[] {
    return this.processingQueue.slice(-limit);
  }

  // Get data by region
  getDataByRegion(regionCode: string, limit: number = 50): ProcessedData[] {
    return this.processingQueue
      .filter(data => data.region === regionCode)
      .slice(-limit);
  }

  // Get data by platform
  getDataByPlatform(platform: string, limit: number = 50): ProcessedData[] {
    return this.processingQueue
      .filter(data => data.source === platform)
      .slice(-limit);
  }

  // Health check for all regions
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const regionCode of this.activeRegions) {
      const region = this.regions.get(regionCode);
      if (!region) continue;

      let regionHealthy = false;
      
      for (const platform of region.platforms) {
        try {
          if (platform === 'polymarket') {
            regionHealthy = await polymarketClient.healthCheck();
          } else if (platform === 'fanduel') {
            const client = regionCode === 'uk' ? fanduelUKClient : fanduelUSClient;
            regionHealthy = await client.healthCheck();
          }
          
          if (regionHealthy) break; // At least one platform healthy
        } catch (error) {
          console.error(`Health check failed for ${platform} in ${regionCode}:`, error);
        }
      }
      
      results[regionCode] = regionHealthy;
    }
    
    return results;
  }

  // Optimize region priorities based on latency
  async optimizeRegionPriorities(): Promise<void> {
    const latencyTests: Record<string, number> = {};
    
    for (const regionCode of this.activeRegions) {
      const startTime = Bun.nanoseconds();
      
      try {
        await this.healthCheck();
        const latency = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to ms
        latencyTests[regionCode] = latency;
      } catch (error) {
        latencyTests[regionCode] = 9999; // High latency for failed regions
      }
    }
    
    // Update region priorities based on latency
    for (const [regionCode, latency] of Object.entries(latencyTests)) {
      const region = this.regions.get(regionCode);
      if (region) {
        region.latency = latency;
        // Lower latency = higher priority
        region.priority = Math.max(1, Math.floor(1000 / latency));
      }
    }
    
    console.log('🌍 Region priorities optimized based on latency:', latencyTests);
  }
}

// Singleton instance
export const multiRegionProcessor = new MultiRegionProcessor();
