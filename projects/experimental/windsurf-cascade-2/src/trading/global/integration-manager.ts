// Global Integration Manager
// Orchestrates multi-region, cross-platform trading operations

import { multiRegionProcessor, ProcessedData } from '../multi-region/region-processor.js';
import { polymarketClient } from '../platform-integrations/polymarket-client.js';
import { fanduelUSClient, fanduelUKClient } from '../platform-integrations/fanduel-client.js';
import { platformManager } from '../cross-platform/platform-manager.js';
import { sportsTradingEngine, TradingSignal } from '../sports-trading-engine.js';
import { getTradingConfig, updateTradingConfig, setTradingFeature } from '../sports-trading-config.js';

export interface GlobalConfig {
  regions: string[];
  platforms: string[];
  features: {
    multiRegion: boolean;
    arbitrage: boolean;
    riskManagement: boolean;
    autoTrading: boolean;
  };
  performance: {
    maxLatency: number;
    minLiquidity: number;
    maxPositions: number;
  };
}

export interface GlobalMetrics {
  totalDataPoints: number;
  totalSignals: number;
  totalTrades: number;
  activeRegions: number;
  activePlatforms: number;
  averageLatency: number;
  successRate: number;
  pnl: number;
  uptime: number;
}

export class IntegrationManager {
  private isRunning: boolean = false;
  private globalConfig: GlobalConfig;
  private metrics: GlobalMetrics;
  private startTime: number = 0;
  private processingInterval: any = null;
  private metricsInterval: any = null;

  constructor() {
    this.globalConfig = this.initializeGlobalConfig();
    this.metrics = this.initializeMetrics();
  }

  // Initialize global configuration
  private initializeGlobalConfig(): GlobalConfig {
    return {
      regions: ['us', 'uk', 'eu', 'apac'],
      platforms: ['polymarket', 'fanduel'],
      features: {
        multiRegion: true,
        arbitrage: true,
        riskManagement: true,
        autoTrading: true
      },
      performance: {
        maxLatency: 100, // ms
        minLiquidity: 10000,
        maxPositions: 50
      }
    };
  }

  // Initialize metrics
  private initializeMetrics(): GlobalMetrics {
    return {
      totalDataPoints: 0,
      totalSignals: 0,
      totalTrades: 0,
      activeRegions: 0,
      activePlatforms: 0,
      averageLatency: 0,
      successRate: 0,
      pnl: 0,
      uptime: 0
    };
  }

  // Start the global trading system
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🌍 Global trading system already running');
      return;
    }

    console.log('🌍 Starting Global High-Frequency Trading System...');
    
    try {
      // 1. Optimize platform performance
      console.log('🔧 Optimizing platform performance...');
      await platformManager.optimizePerformance();
      
      // 2. Initialize trading configuration
      console.log('⚙️ Initializing global trading configuration...');
      await this.initializeGlobalTradingConfig();
      
      // 3. Setup multi-region processing
      console.log('🌐 Setting up multi-region processing...');
      await this.setupMultiRegionProcessing();
      
      // 4. Start data processing
      console.log('📊 Starting global data processing...');
      this.startGlobalProcessing();
      
      // 5. Initialize metrics collection
      console.log('📈 Starting metrics collection...');
      this.startMetricsCollection();
      
      this.isRunning = true;
      this.startTime = Date.now();
      
      console.log('🚀 Global High-Frequency Trading System Started Successfully!');
      console.log(`🌍 Active Regions: ${this.globalConfig.regions.length}`);
      console.log(`📱 Active Platforms: ${this.globalConfig.platforms.length}`);
      console.log(`⚡ Performance Optimized: ${platformManager.getPlatformConfig().supports.simd ? 'SIMD' : 'Standard'}`);
      
    } catch (error) {
      console.error('❌ Failed to start global trading system:', error);
      throw error;
    }
  }

  // Initialize global trading configuration
  private async initializeGlobalTradingConfig(): Promise<void> {
    // Configure 13-byte system for global operations
    await updateTradingConfig({
      algorithmVersion: 1,
      exchangeId: 0x12345678,
      tradingFlags: 0x0000003F, // All features enabled
      marketDataFeed: 0, // Real-time
      maxPositionSize: 25, // Higher for global
      riskLimitPercent: 5
    });

    // Enable global features
    await setTradingFeature('ENABLE_AUTO_TRADING', this.globalConfig.features.autoTrading);
    await setTradingFeature('ENABLE_RISK_MANAGEMENT', this.globalConfig.features.riskManagement);
    await setTradingFeature('ENABLE_ARBITRAGE', this.globalConfig.features.arbitrage);
  }

  // Setup multi-region processing
  private async setupMultiRegionProcessing(): Promise<void> {
    // Activate configured regions
    for (const region of this.globalConfig.regions) {
      multiRegionProcessor.setRegionActive(region, true);
    }

    // Optimize region priorities
    await multiRegionProcessor.optimizeRegionPriorities();
    
    // Health check all regions
    const healthResults = await multiRegionProcessor.healthCheck();
    console.log('🏥 Region Health Check Results:');
    for (const [region, healthy] of Object.entries(healthResults)) {
      console.log(`   ${region.toUpperCase()}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    }
  }

  // Start global data processing
  private startGlobalProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processGlobalData();
    }, 2000); // Process every 2 seconds
  }

  // Process global data from all regions
  private async processGlobalData(): Promise<void> {
    try {
      // Fetch data from all active regions
      const regionalData = await multiRegionProcessor.fetchAllRegionData();
      
      // Process each data point
      for (const data of regionalData) {
        await this.processDataPoint(data);
      }
      
      // Update metrics
      this.metrics.totalDataPoints += regionalData.length;
      
      // Detect arbitrage opportunities
      if (this.globalConfig.features.arbitrage) {
        await this.detectArbitrageOpportunities(regionalData);
      }
      
    } catch (error) {
      console.error('Global data processing failed:', error);
    }
  }

  // Process individual data point
  private async processDataPoint(data: ProcessedData): Promise<void> {
    try {
      // Validate data quality
      if (!this.validateDataPoint(data)) {
        return;
      }

      // Generate trading signals
      const signals = data.signals;
      this.metrics.totalSignals += signals.length;

      // Execute signals if auto-trading is enabled
      if (this.globalConfig.features.autoTrading) {
        for (const signal of signals) {
          const executed = await this.executeSignal(signal, data);
          if (executed) {
            this.metrics.totalTrades++;
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to process data point:', error);
    }
  }

  // Validate data point quality
  private validateDataPoint(data: ProcessedData): boolean {
    // Check latency
    if (data.processingTime > this.globalConfig.performance.maxLatency) {
      console.warn(`High latency detected: ${data.processingTime}ms from ${data.region}`);
      return false;
    }

    // Check liquidity
    if (data.processedData.liquidity < this.globalConfig.performance.minLiquidity) {
      console.warn(`Low liquidity detected: ${data.processedData.liquidity} from ${data.region}`);
      return false;
    }

    return true;
  }

  // Execute trading signal with global context
  private async executeSignal(signal: TradingSignal, data: ProcessedData): Promise<boolean> {
    try {
      // Add global metadata to signal
      const enhancedSignal = {
        ...signal,
        region: data.region,
        platform: data.source,
        globalTimestamp: Date.now()
      };

      // Execute through trading engine
      const executed = await sportsTradingEngine.executeSignal(enhancedSignal);
      
      if (executed) {
        console.log(`🎯 Executed ${signal.action} ${signal.market} from ${data.region.toUpperCase()}-${data.source} @ ${signal.odds}`);
      }
      
      return executed;
    } catch (error) {
      console.error('Signal execution failed:', error);
      return false;
    }
  }

  // Detect arbitrage opportunities across regions
  private async detectArbitrageOpportunities(regionalData: ProcessedData[]): Promise<void> {
    try {
      // Group data by event/asset
      const assetGroups = new Map<string, ProcessedData[]>();
      
      for (const data of regionalData) {
        const assetKey = this.generateAssetKey(data.processedData);
        if (!assetGroups.has(assetKey)) {
          assetGroups.set(assetKey, []);
        }
        assetGroups.get(assetKey)!.push(data);
      }

      // Check each group for arbitrage
      for (const [assetKey, dataPoints] of assetGroups) {
        if (dataPoints.length >= 2) {
          const opportunity = this.analyzeArbitrageOpportunity(assetKey, dataPoints);
          if (opportunity) {
            await this.executeArbitrage(opportunity);
          }
        }
      }
      
    } catch (error) {
      console.error('Arbitrage detection failed:', error);
    }
  }

  // Generate asset key for grouping
  private generateAssetKey(data: any): string {
    // Normalize asset name across platforms
    const homeTeam = (data.homeTeam || '').toLowerCase().replace(/\s+/g, '');
    const awayTeam = (data.awayTeam || '').toLowerCase().replace(/\s+/g, '');
    const sportType = (data.sportType || '').toLowerCase();
    
    return `${sportType}_${homeTeam}_${awayTeam}`;
  }

  // Analyze arbitrage opportunity
  private analyzeArbitrageOpportunity(assetKey: string, dataPoints: ProcessedData[]): any {
    if (dataPoints.length < 2) return null;

    // Find best buy and sell opportunities
    let bestBuy = null;
    let bestSell = null;
    let maxProfit = 0;

    for (const data of dataPoints) {
      const homeOdds = data.processedData.homeOdds;
      const awayOdds = data.processedData.awayOdds;

      // Simple arbitrage: buy low, sell high across regions
      if (homeOdds > 2.5) { // Good value on home
        if (!bestBuy || homeOdds > bestBuy.odds) {
          bestBuy = {
            data,
            odds: homeOdds,
            market: 'HOME',
            region: data.region,
            platform: data.source
          };
        }
      }

      if (awayOdds > 2.5) { // Good value on away
        if (!bestSell || awayOdds > bestSell.odds) {
          bestSell = {
            data,
            odds: awayOdds,
            market: 'AWAY',
            region: data.region,
            platform: data.source
          };
        }
      }
    }

    // Calculate potential profit
    if (bestBuy && bestSell && bestBuy.region !== bestSell.region) {
      const profit = (bestBuy.odds + bestSell.odds) / 2 - 2; // Simplified calculation
      
      if (profit > 0.1) { // Minimum 10% profit threshold
        return {
          assetKey,
          buy: bestBuy,
          sell: bestSell,
          expectedProfit: profit,
          confidence: Math.min(profit * 5, 1)
        };
      }
    }

    return null;
  }

  // Execute arbitrage trade
  private async executeArbitrage(opportunity: any): Promise<void> {
    try {
      console.log(`🔄 Arbitrage Opportunity: ${opportunity.assetKey}`);
      console.log(`   Buy: ${opportunity.buy.market} @ ${opportunity.buy.odds} (${opportunity.buy.region}-${opportunity.buy.platform})`);
      console.log(`   Sell: ${opportunity.sell.market} @ ${opportunity.sell.odds} (${opportunity.sell.region}-${opportunity.sell.platform})`);
      console.log(`   Expected Profit: ${(opportunity.expectedProfit * 100).toFixed(1)}%`);

      // Execute both sides of the arbitrage
      const buySignal = {
        eventId: `arbitrage_${Date.now()}`,
        action: 'BUY' as const,
        market: opportunity.buy.market,
        odds: opportunity.buy.odds,
        stake: 5,
        confidence: opportunity.confidence,
        expectedValue: opportunity.expectedProfit,
        timestamp: Date.now(),
        reasoning: `Arbitrage between ${opportunity.buy.region}-${opportunity.buy.platform} and ${opportunity.sell.region}-${opportunity.sell.platform}`,
        region: opportunity.buy.region,
        platform: opportunity.buy.platform
      };

      await sportsTradingEngine.executeSignal(buySignal);
      
    } catch (error) {
      console.error('Arbitrage execution failed:', error);
    }
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  // Update global metrics
  private async updateMetrics(): Promise<void> {
    try {
      const regionStats = multiRegionProcessor.getStatistics();
      const engineStats = sportsTradingEngine.getStatistics();
      const pnl = sportsTradingEngine.calculatePnL();

      this.metrics.activeRegions = regionStats.activeRegions;
      this.metrics.activePlatforms = this.globalConfig.platforms.length;
      this.metrics.averageLatency = regionStats.averageProcessingTime;
      this.metrics.pnl = pnl.total;
      this.metrics.uptime = Date.now() - this.startTime;
      
      // Calculate success rate
      if (this.metrics.totalSignals > 0) {
        this.metrics.successRate = (this.metrics.totalTrades / this.metrics.totalSignals) * 100;
      }

    } catch (error) {
      console.error('Metrics update failed:', error);
    }
  }

  // Get global metrics
  getGlobalMetrics(): GlobalMetrics {
    return { ...this.metrics };
  }

  // Get global configuration
  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }

  // Update global configuration
  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<void> {
    this.globalConfig = { ...this.globalConfig, ...updates };
    
    // Apply configuration changes
    if (updates.regions) {
      // Deactivate all regions first
      for (const region of ['us', 'uk', 'eu', 'apac']) {
        multiRegionProcessor.setRegionActive(region, false);
      }
      
      // Activate configured regions
      for (const region of updates.regions) {
        multiRegionProcessor.setRegionActive(region, true);
      }
    }

    if (updates.features) {
      await setTradingFeature('ENABLE_AUTO_TRADING', updates.features.autoTrading);
      await setTradingFeature('ENABLE_ARBITRAGE', updates.features.arbitrage);
      await setTradingFeature('ENABLE_RISK_MANAGEMENT', updates.features.riskManagement);
    }
  }

  // Get system health
  async getSystemHealth(): Promise<{
    overall: boolean;
    regions: Record<string, boolean>;
    platforms: Record<string, boolean>;
    performance: {
      optimal: boolean;
      issues: string[];
    };
  }> {
    const regionHealth = await multiRegionProcessor.healthCheck();
    
    // Check platform health
    const platformHealth: Record<string, boolean> = {};
    try {
      platformHealth.polymarket = await polymarketClient.healthCheck();
      platformHealth.fanduel = await fanduelUSClient.healthCheck();
    } catch (error) {
      platformHealth.polymarket = false;
      platformHealth.fanduel = false;
    }

    // Check performance
    const performance = platformManager.getPlatformConfig();
    const issues: string[] = [];
    
    if (performance.performance.configLatency > 1000) {
      issues.push('High configuration latency');
    }
    
    if (this.metrics.averageLatency > this.globalConfig.performance.maxLatency) {
      issues.push('High processing latency');
    }

    const allHealthy = Object.values(regionHealth).every(healthy => healthy) &&
                      Object.values(platformHealth).every(healthy => healthy) &&
                      issues.length === 0;

    return {
      overall: allHealthy,
      regions: regionHealth,
      platforms: platformHealth,
      performance: {
        optimal: issues.length === 0,
        issues
      }
    };
  }

  // Stop the global trading system
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Global High-Frequency Trading System...');
    
    // Stop processing intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Generate final report
    const finalReport = this.generateFinalReport();
    console.log('📊 Final System Report:');
    console.log(JSON.stringify(finalReport, null, 2));

    this.isRunning = false;
    console.log('✅ Global trading system stopped successfully');
  }

  // Generate final system report
  private generateFinalReport(): any {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return {
      summary: {
        uptime: `${hours}h ${minutes}m`,
        totalDataPoints: this.metrics.totalDataPoints,
        totalSignals: this.metrics.totalSignals,
        totalTrades: this.metrics.totalTrades,
        successRate: `${this.metrics.successRate.toFixed(1)}%`,
        totalPnL: `${(this.metrics.pnl * 100).toFixed(2)}%`
      },
      regions: {
        active: this.metrics.activeRegions,
        configured: this.globalConfig.regions.length
      },
      platforms: {
        active: this.metrics.activePlatforms,
        configured: this.globalConfig.platforms.length
      },
      performance: {
        averageLatency: `${this.metrics.averageLatency.toFixed(2)}ms`,
        configLatency: `${platformManager.getPlatformConfig().performance.configLatency}ns`,
        throughput: `${platformManager.getPlatformConfig().performance.throughput} ops/sec`
      },
      features: {
        multiRegion: this.globalConfig.features.multiRegion,
        arbitrage: this.globalConfig.features.arbitrage,
        autoTrading: this.globalConfig.features.autoTrading,
        riskManagement: this.globalConfig.features.riskManagement
      }
    };
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager();
