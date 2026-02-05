// src/finance/enhancedAutoRouter.ts
import { CashAppGreenClient } from "../cashapp/greenDeposit";
import { priceFeed } from "../price/realtimeFeed";
import { db } from "../database/connection";
import type { Invoice, RoutingDecision, RouteMetrics } from "../types";

export class EnhancedLightningToGreenRouter {
  private greenClient: CashAppGreenClient;
  private metrics: RouteMetrics;
  private readonly MIN_GREEN_DEPOSIT = 50; // USD
  private readonly MAX_LIGHTNING_BALANCE = 200; // USD
  private readonly VOLATILITY_THRESHOLD = 0.05; // 5%

  constructor() {
    this.greenClient = new CashAppGreenClient();
    this.metrics = {
      totalRouted: 0,
      totalYieldProjected: 0,
      averageRouteTime: 0,
      successRate: 0
    };

    // Listen for price updates
    priceFeed.on("priceUpdate", this.handlePriceUpdate.bind(this));
  }

  /**
   * Intelligent routing with price awareness and volatility detection
   */
  async routeSettlement(invoice: Invoice): Promise<RoutingDecision> {
    const startTime = Date.now();
    const amountUsd = priceFeed.satsToUsd(invoice.amountSettled);
    
    try {
      const decision = await this.makeRoutingDecision(invoice, amountUsd);
      
      if (decision.shouldRoute && decision.amountToGreen > 0) {
        await this.executeGreenDeposit(invoice, decision.amountToGreen);
      }
      
      if (decision.amountToLightning > 0) {
        await this.creditLightningWallet(invoice.userId, priceFeed.usdToSats(decision.amountToLightning));
      }

      // Update metrics
      this.updateMetrics(startTime, decision);
      
      return decision;
    } catch (error) {

      throw error;
    }
  }

  /**
   * Make intelligent routing decision based on multiple factors
   */
  private async makeRoutingDecision(invoice: Invoice, amountUsd: number): Promise<RoutingDecision> {
    const currentPrice = priceFeed.getCurrentPrice();
    const userBalance = await this.getUserLightningBalance(invoice.userId);
    const volatility = await this.calculateVolatility();
    
    // Factor 1: Minimum deposit threshold
    if (amountUsd < this.MIN_GREEN_DEPOSIT) {
      return {
        shouldRoute: false,
        destination: "lightning",
        amountToGreen: 0,
        amountToLightning: amountUsd,
        reason: `Amount $${amountUsd.toFixed(2)} below minimum $${this.MIN_GREEN_DEPOSIT}`,
        priceImpact: 0
      };
    }

    // Factor 2: Lightning balance management
    if (userBalance >= this.MAX_LIGHTNING_BALANCE) {
      // Route everything to Green if Lightning wallet is full
      return {
        shouldRoute: true,
        destination: "green",
        amountToGreen: amountUsd,
        amountToLightning: 0,
        reason: `Lightning wallet full ($${userBalance.toFixed(2)})`,
        priceImpact: 0
      };
    }

    // Factor 3: Volatility-based routing
    if (volatility > this.VOLATILITY_THRESHOLD) {
      // High volatility - keep more in Lightning for flexibility
      const splitRatio = Math.max(0.3, 1 - volatility); // Keep 30-70% in Lightning
      const toLightning = amountUsd * splitRatio;
      const toGreen = amountUsd * (1 - splitRatio);
      
      return {
        shouldRoute: true,
        destination: "split",
        amountToGreen: toGreen,
        amountToLightning: toLightning,
        reason: `High volatility (${(volatility * 100).toFixed(1)}%) - split routing`,
        priceImpact: volatility
      };
    }

    // Factor 4: Yield optimization for large amounts
    if (amountUsd >= 1000) {
      // Large amounts - prioritize yield
      const keepForLightning = Math.min(100, this.MAX_LIGHTNING_BALANCE - userBalance);
      const toGreen = Math.max(0, amountUsd - keepForLightning);
      
      return {
        shouldRoute: true,
        destination: toGreen > 0 ? "split" : "lightning",
        amountToGreen: toGreen,
        amountToLightning: amountUsd - toGreen,
        reason: `Large amount optimization - keep $${keepForLightning.toFixed(2)} for Lightning`,
        priceImpact: 0
      };
    }

    // Default: Route to Green for optimal yield
    return {
      shouldRoute: true,
      destination: "green",
      amountToGreen: amountUsd,
      amountToLightning: 0,
      reason: "Standard routing for optimal yield",
      priceImpact: 0
    };
  }

  /**
   * Execute deposit to Green account
   */
  private async executeGreenDeposit(invoice: Invoice, amountUsd: number): Promise<void> {
    const result = await this.greenClient.depositToGreen({
      userId: invoice.userId,
      amountUsd,
      source: "lightning_settlement",
      questId: invoice.metadata.questId,
      traceId: `route-${invoice.paymentHash}-${Date.now()}`
    });

    // Store routing decision for analytics
    await this.logRoutingDecision({
      invoiceId: invoice.paymentHash,
      userId: invoice.userId,
      amountUsd,
      destination: "green",
      yieldProjection: result.yieldProjection,
      btcPrice: priceFeed.getCurrentPrice(),
      timestamp: new Date()
    });
  }

  /**
   * Credit Lightning wallet
   */
  private async creditLightningWallet(userId: string, sats: number): Promise<void> {
    await db.query(
      "UPDATE user_lightning_balances SET balance = balance + ?, last_updated = NOW() WHERE user_id = ?",
      [sats, userId]
    );
  }

  /**
   * Get user's Lightning balance
   */
  private async getUserLightningBalance(userId: string): Promise<number> {
    const result = await db.query(
      "SELECT balance FROM user_lightning_balances WHERE user_id = ?",
      [userId]
    );
    
    if (!result || result.length === 0) return 0;
    
    const balanceSats = result[0]?.balance || 0;
    return priceFeed.satsToUsd(balanceSats);
  }

  /**
   * Calculate price volatility (24h)
   */
  private async calculateVolatility(): Promise<number> {
    const history = await priceFeed.get24hHistory();
    
    if (history.length < 2) return 0;
    
    const prices = history.map(h => h.btcUsd);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Handle price updates
   */
  private handlePriceUpdate(priceData: any): void {
    const btcPrice = priceData?.btcUsd || 0;

    // Could trigger re-routing decisions based on price changes
    this.evaluatePendingRoutes();
  }

  /**
   * Update routing metrics
   */
  private updateMetrics(startTime: number, decision: RoutingDecision): void {
    const routeTime = Date.now() - startTime;
    
    this.metrics.totalRouted += decision.amountToGreen;
    this.metrics.totalYieldProjected += decision.amountToGreen * 0.0325;
    
    // Update average route time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageRouteTime = 
      alpha * routeTime + (1 - alpha) * this.metrics.averageRouteTime;
  }

  /**
   * Get routing metrics
   */
  getMetrics(): RouteMetrics {
    return { ...this.metrics };
  }

  /**
   * Log routing decision for analytics
   */
  private async logRoutingDecision(decision: any): Promise<void> {
    await db.query(
      "INSERT INTO routing_decisions (invoice_id, user_id, amount_usd, destination, yield_projection, btc_price, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        decision.invoiceId,
        decision.userId,
        decision.amountUsd,
        decision.destination,
        decision.yieldProjection,
        decision.btcPrice,
        decision.timestamp
      ]
    );
  }

  /**
   * Evaluate pending routes based on price changes
   */
  private async evaluatePendingRoutes(): Promise<void> {
    // Implementation could re-evaluate pending routing decisions
    // based on significant price movements
  }
}
