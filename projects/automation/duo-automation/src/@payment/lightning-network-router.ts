/**
 * Lightning Network Router with Savings Optimization
 * 
 * Advanced routing system that automatically optimizes for maximum
 * interest yield through strategic savings routing.
 */

import { LightningNetworkIntegration, PaymentMethod, SavingsConfig } from './lightning-network-integration.js';
import { createHash, randomUUID } from 'crypto';

interface RoutingStrategy {
  name: string;
  description: string;
  conditions: (amount: number, metadata: any) => boolean;
  action: (amount: number, metadata: any) => Promise<RoutingResult>;
}

interface RoutingResult {
  strategy: string;
  destination: string;
  estimatedYield: number;
  timeframe: string;
  fees: number;
  risk: 'low' | 'medium' | 'high';
}

interface SavingsOptimization {
  enabled: boolean;
  provider: 'cashapp_green' | 'compound' | 'yield_maximizer';
  targetApy: number;
  rebalanceThreshold: number;
  autoCompound: boolean;
}

interface LightningMetrics {
  totalVolume: number;
  totalFees: number;
  averagePaymentSize: number;
  successRate: number;
  channelUtilization: number;
  savingsYield: number;
}

class LightningNetworkRouter {
  private lightning: LightningNetworkIntegration;
  private routingStrategies: RoutingStrategy[] = [];
  private savingsOptimization: SavingsOptimization;
  private metrics: LightningMetrics;

  constructor(
    lightning: LightningNetworkIntegration,
    savingsOptimization: SavingsOptimization
  ) {
    this.lightning = lightning;
    this.savingsOptimization = savingsOptimization;
    this.metrics = this.initializeMetrics();
    this.setupRoutingStrategies();
  }

  /**
   * 🎯 Setup intelligent routing strategies
   */
  private setupRoutingStrategies(): void {
    this.routingStrategies = [
      {
        name: 'micro_lightning_keep',
        description: 'Keep micro-payments in Lightning for instant access',
        conditions: (amount, metadata) => amount < 50,
        action: async (amount, metadata) => ({
          strategy: 'micro_lightning_keep',
          destination: 'Lightning Network',
          estimatedYield: 0,
          timeframe: 'instant',
          fees: amount * 0.00001,
          risk: 'low'
        })
      },
      
      {
        name: 'cashapp_green_maximize',
        description: 'Route to Cash App Green for maximum 3.25% APY',
        conditions: (amount, metadata) => 
          amount >= 50 && 
          amount <= 10000 && 
          metadata?.savingsOptIn &&
          this.savingsOptimization.provider === 'cashapp_green',
        action: async (amount, metadata) => {
          const yieldProjection = this.calculateYieldProjection(amount, 0.0325);
          return {
            strategy: 'cashapp_green_maximize',
            destination: 'Cash App Green Savings',
            estimatedYield: yieldProjection.annual,
            timeframe: '1 year',
            fees: amount * 0.001, // 0.1% conversion fee
            risk: 'low'
          };
        }
      },
      
      {
        name: 'compound_finance',
        description: 'Route to Compound Finance for DeFi yields',
        conditions: (amount, metadata) => 
          amount >= 100 && 
          this.savingsOptimization.provider === 'compound',
        action: async (amount, metadata) => {
          const yieldProjection = this.calculateYieldProjection(amount, 0.058); // 5.8% APY
          return {
            strategy: 'compound_finance',
            destination: 'Compound Finance cUSDC',
            estimatedYield: yieldProjection.annual,
            timeframe: 'variable',
            fees: amount * 0.003, // 0.3% gas + platform fee
            risk: 'medium'
          };
        }
      },
      
      {
        name: 'yield_maximizer',
        description: 'Auto-route to highest yield platform',
        conditions: (amount, metadata) => 
          amount >= 1000 && 
          this.savingsOptimization.provider === 'yield_maximizer',
        action: async (amount, metadata) => {
          const bestYield = await this.findBestYield(amount);
          return {
            strategy: 'yield_maximizer',
            destination: bestYield.platform,
            estimatedYield: bestYield.apy * amount,
            timeframe: bestYield.timeframe,
            fees: bestYield.fees,
            risk: bestYield.risk
          };
        }
      },
      
      {
        name: 'default_on_chain',
        description: 'Fallback to on-chain Bitcoin',
        conditions: (amount, metadata) => true, // Always matches as fallback
        action: async (amount, metadata) => ({
          strategy: 'default_on_chain',
          destination: 'Bitcoin Wallet',
          estimatedYield: 0,
          timeframe: '10-60 minutes',
          fees: Math.max(1, amount * 0.0001), // Minimum 1 sat
          risk: 'low'
        })
      }
    ];
  }

  /**
   * 🚀 Route payment with optimal strategy
   */
  async routePayment(
    amount: number,
    metadata: any = {}
  ): Promise<{
    lightningPayment: any;
    routing: RoutingResult;
    optimization: {
      enabled: boolean;
      projectedYield: number;
      rebalanceSchedule: string;
    };
  }> {
    // Generate Lightning payment
    const lightningPayment = await this.lightning.generateLightningPayment({
      amount,
      currency: 'BTC',
      memo: `Quest payment: ${metadata.questId}`,
      metadata
    });

    // Find optimal routing strategy
    const routing = await this.findOptimalStrategy(amount, metadata);

    // Calculate optimization details
    const optimization = {
      enabled: this.savingsOptimization.enabled,
      projectedYield: routing.estimatedYield,
      rebalanceSchedule: this.calculateRebalanceSchedule(amount)
    };

    // Update metrics
    this.updateMetrics(amount, routing.fees, true);

    return {
      lightningPayment,
      routing,
      optimization
    };
  }

  /**
   * 🎯 Find optimal routing strategy
   */
  private async findOptimalStrategy(amount: number, metadata: any): Promise<RoutingResult> {
    for (const strategy of this.routingStrategies) {
      if (strategy.conditions(amount, metadata)) {
        return await strategy.action(amount, metadata);
      }
    }
    
    // Should never reach here due to fallback strategy
    throw new Error('No routing strategy found');
  }

  /**
   * 💰 Calculate yield projection
   */
  private calculateYieldProjection(principal: number, apy: number): {
    daily: number;
    monthly: number;
    annual: number;
  } {
    const dailyRate = apy / 365;
    const monthlyRate = apy / 12;
    
    return {
      daily: principal * dailyRate,
      monthly: principal * monthlyRate,
      annual: principal * apy
    };
  }

  /**
   * 🔍 Find best yield across platforms
   */
  private async findBestYield(amount: number): Promise<{
    platform: string;
    apy: number;
    timeframe: string;
    fees: number;
    risk: 'low' | 'medium' | 'high';
  }> {
    // Query various DeFi platforms for best rates
    const platforms = [
      { name: 'Aave', apy: 0.045, timeframe: 'variable', fees: amount * 0.002, risk: 'medium' as const },
      { name: 'Compound', apy: 0.058, timeframe: 'variable', fees: amount * 0.003, risk: 'medium' as const },
      { name: 'Yearn Finance', apy: 0.072, timeframe: 'variable', fees: amount * 0.005, risk: 'high' as const },
      { name: 'Cash App Green', apy: 0.0325, timeframe: '1 year', fees: amount * 0.001, risk: 'low' as const }
    ];

    // Filter by amount requirements and sort by APY
    const validPlatforms = platforms
      .filter(p => amount >= 1000 || p.name === 'Cash App Green')
      .sort((a, b) => b.apy - a.apy);

    return validPlatforms[0];
  }

  /**
   * 📅 Calculate rebalance schedule
   */
  private calculateRebalanceSchedule(amount: number): string {
    if (amount < 100) return 'No rebalancing needed';
    if (amount < 1000) return 'Weekly';
    if (amount < 10000) return 'Daily';
    return 'Hourly';
  }

  /**
   * 🔄 Auto-rebalance to optimal yields
   */
  async autoRebalance(): Promise<{
    rebalanced: boolean;
    amount: number;
    fromStrategy: string;
    toStrategy: string;
    estimatedGain: number;
  }> {
    if (!this.savingsOptimization.enabled) {
      return { rebalanced: false, amount: 0, fromStrategy: '', toStrategy: '', estimatedGain: 0 };
    }

    const balance = await this.lightning.getNodeBalance();
    
    if (balance.total < this.savingsOptimization.rebalanceThreshold) {
      return { rebalanced: false, amount: 0, fromStrategy: '', toStrategy: '', estimatedGain: 0 };
    }

    try {
      // Find current strategy and optimal strategy
      const currentStrategy = await this.getCurrentStrategy(balance.total);
      const optimalStrategy = await this.findOptimalStrategy(balance.total, {});

      if (currentStrategy.strategy === optimalStrategy.strategy) {
        return { rebalanced: false, amount: 0, fromStrategy: '', toStrategy: '', estimatedGain: 0 };
      }

      // Calculate potential gain
      const estimatedGain = optimalStrategy.estimatedYield - currentStrategy.estimatedYield;

      // Execute rebalancing if gain is significant
      if (estimatedGain > balance.total * 0.001) { // 0.1% minimum gain
        await this.executeRebalancing(balance.total, currentStrategy, optimalStrategy);
        
        return {
          rebalanced: true,
          amount: balance.total,
          fromStrategy: currentStrategy.strategy,
          toStrategy: optimalStrategy.strategy,
          estimatedGain
        };
      }

      return { rebalanced: false, amount: 0, fromStrategy: '', toStrategy: '', estimatedGain: 0 };
    } catch (error) {
      console.error('❌ Auto-rebalancing failed:', error);
      return { rebalanced: false, amount: 0, fromStrategy: '', toStrategy: '', estimatedGain: 0 };
    }
  }

  /**
   * 🔍 Get current strategy
   */
  private async getCurrentStrategy(amount: number): Promise<RoutingResult> {
    // This would typically check current allocations
    // For now, return default strategy
    return {
      strategy: 'default_on_chain',
      destination: 'Bitcoin Wallet',
      estimatedYield: 0,
      timeframe: '10-60 minutes',
      fees: Math.max(1, amount * 0.0001),
      risk: 'low'
    };
  }

  /**
   * 🔄 Execute rebalancing
   */
  private async executeRebalancing(
    amount: number,
    fromStrategy: RoutingResult,
    toStrategy: RoutingResult
  ): Promise<void> {
    console.log(`🔄 Rebalancing ${amount} sats from ${fromStrategy.destination} to ${toStrategy.destination}`);
    
    // This would implement the actual rebalancing logic
    // For now, just log the action
  }

  /**
   * 📊 Get comprehensive metrics
   */
  async getMetrics(): Promise<LightningMetrics> {
    const networkStats = await this.lightning.getNetworkStats();
    const balance = await this.lightning.getNodeBalance();
    
    return {
      ...this.metrics,
      channelUtilization: this.calculateChannelUtilization(balance.channels),
      savingsYield: this.calculateTotalSavingsYield()
    };
  }

  /**
   * 📈 Calculate channel utilization
   */
  private calculateChannelUtilization(channels: any): number {
    if (!channels || channels.length === 0) return 0;
    
    const totalCapacity = channels.reduce((sum, channel) => sum + channel.capacity, 0);
    const utilizedCapacity = channels.reduce((sum, channel) => sum + channel.local_balance, 0);
    
    return (utilizedCapacity / totalCapacity) * 100;
  }

  /**
   * 💰 Calculate total savings yield
   */
  private calculateTotalSavingsYield(): number {
    // This would calculate actual yield from all savings accounts
    // For now, return projected yield based on metrics
    return this.metrics.totalVolume * this.savingsOptimization.targetApy;
  }

  /**
   * 📝 Initialize metrics
   */
  private initializeMetrics(): LightningMetrics {
    return {
      totalVolume: 0,
      totalFees: 0,
      averagePaymentSize: 0,
      successRate: 100,
      channelUtilization: 0,
      savingsYield: 0
    };
  }

  /**
   * 📊 Update metrics
   */
  private updateMetrics(amount: number, fees: number, success: boolean): void {
    this.metrics.totalVolume += amount;
    this.metrics.totalFees += fees;
    
    // Update average payment size
    const paymentCount = this.metrics.totalVolume / this.metrics.averagePaymentSize || 1;
    this.metrics.averagePaymentSize = this.metrics.totalVolume / paymentCount;
    
    // Update success rate
    if (!success) {
      this.metrics.successRate = Math.max(0, this.metrics.successRate - 0.1);
    }
  }

  /**
   * 🎯 Get routing recommendations
   */
  async getRoutingRecommendations(amount: number): Promise<{
    recommended: RoutingResult;
    alternatives: RoutingResult[];
    analysis: {
      bestYield: number;
      lowestRisk: RoutingResult;
      fastest: RoutingResult;
    };
  }> {
    const allStrategies = await Promise.all(
      this.routingStrategies.map(async strategy => ({
        ...strategy,
        result: await strategy.action(amount, {})
      }))
    );

    const recommended = allStrategies.find(s => s.conditions(amount, {}))?.result || allStrategies[allStrategies.length - 1].result;
    const alternatives = allStrategies
      .filter(s => s.result.strategy !== recommended.strategy)
      .map(s => s.result);

    const analysis = {
      bestYield: Math.max(...allStrategies.map(s => s.result.estimatedYield)),
      lowestRisk: allStrategies.find(s => s.result.risk === 'low')?.result || recommended,
      fastest: allStrategies.find(s => s.result.timeframe === 'instant')?.result || recommended
    };

    return {
      recommended,
      alternatives,
      analysis
    };
  }
}

export default LightningNetworkRouter;
export type { 
  RoutingStrategy, 
  RoutingResult, 
  SavingsOptimization, 
  LightningMetrics 
};
