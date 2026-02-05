// src/pools/rebalancingEngine.ts - Auto-Rebalancing Engine for Family Pools
// Lightning Network integration with yield optimization and risk management

import { randomBytes } from "crypto";

export interface Pool {
  id: string;
  name: string;
  familyId: string;
  balance: number; // USD
  targetBalance: number;
  avgYield: number; // APY as decimal
  riskScore: number; // 0-100
  memberCount: number;
  lastRebalanced: Date;
  isActive: boolean;
  strategy: "conservative" | "balanced" | "aggressive";
}

export interface RebalancingMovement {
  poolId: string;
  amount: number; // Positive = deposit, Negative = withdrawal
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedYieldImpact: number; // Basis points
  executionTime: Date;
}

export interface RebalancingReport {
  timestamp: Date;
  totalMovements: number;
  movements: RebalancingMovement[];
  totalYieldIncrease: number; // Basis points
  riskReduction: number; // Basis points
  executionTimeMs: number;
  success: boolean;
  errors: string[];
}

export interface LightningInvoice {
  questId: string;
  userId: string;
  amountSats: number;
  description: string;
  paymentHash: string;
  expiry: number;
}

export class PoolRebalancingEngine {
  private pools: Map<string, Pool> = new Map();
  private rebalancingHistory: RebalancingReport[] = [];
  private isRunning: boolean = false;
  private rebalancingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMockPools();
  }

  /**
   * Start the automatic rebalancing cron
   */
  startCron(intervalMinutes: number = 60): void {
    if (this.isRunning) {

      return;
    }

    this.isRunning = true;
    
    // Run immediately on start
    this.rebalancePools().catch(error => {

    });

    // Set up recurring rebalancing
    this.rebalancingInterval = setInterval(() => {
      this.rebalancePools().catch(error => {

      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the rebalancing engine
   */
  stopCron(): void {
    if (this.rebalancingInterval) {
      clearInterval(this.rebalancingInterval);
      this.rebalancingInterval = null;
    }
    this.isRunning = false;

  }

  /**
   * Main rebalancing function
   */
  async rebalancePools(): Promise<RebalancingReport> {
    const startTime = Date.now();
    const report: RebalancingReport = {
      timestamp: new Date(),
      totalMovements: 0,
      movements: [],
      totalYieldIncrease: 0,
      riskReduction: 0,
      executionTimeMs: 0,
      success: false,
      errors: []
    };

    try {

      // Get all active pools
      const activePools = Array.from(this.pools.values()).filter(pool => pool.isActive);
      
      if (activePools.length === 0) {
        report.errors.push("No active pools found");
        return report;
      }

      // Calculate optimal allocation
      const optimalAllocation = await this.calculateOptimalAllocation(activePools);
      
      // Generate rebalancing movements
      const movements = await this.generateMovements(activePools, optimalAllocation);
      
      // Execute movements
      for (const movement of movements) {
        try {
          await this.executeMovement(movement);
          report.movements.push(movement);
          report.totalMovements++;
          
          if (movement.estimatedYieldImpact > 0) {
            report.totalYieldIncrease += movement.estimatedYieldImpact;
          } else {
            report.riskReduction += Math.abs(movement.estimatedYieldImpact);
          }
          
        } catch (error) {
          report.errors.push(`Failed to execute movement for ${movement.poolId}: ${error}`);
        }
      }

      report.success = report.errors.length === 0;
      report.executionTimeMs = Date.now() - startTime;
      
      // Log the rebalancing event
      await this.logRebalancing(report);

    } catch (error) {
      report.errors.push(`Rebalancing failed: ${error}`);
      report.executionTimeMs = Date.now() - startTime;

    }

    // Store in history
    this.rebalancingHistory.push(report);
    
    // Keep only last 100 reports
    if (this.rebalancingHistory.length > 100) {
      this.rebalancingHistory = this.rebalancingHistory.slice(-100);
    }

    return report;
  }

  /**
   * Calculate optimal allocation using risk-adjusted yield optimization
   */
  private async calculateOptimalAllocation(pools: Pool[]): Promise<Map<string, number>> {
    const allocation = new Map<string, number>();
    const totalBalance = pools.reduce((sum, pool) => sum + pool.balance, 0);

    for (const pool of pools) {
      // Risk-adjusted yield calculation
      const riskAdjustedYield = pool.avgYield / (1 + pool.riskScore / 100);
      
      // Strategy multiplier
      const strategyMultiplier = this.getStrategyMultiplier(pool.strategy);
      
      // Calculate target allocation
      const adjustedYield = riskAdjustedYield * strategyMultiplier;
      const targetAllocation = (adjustedYield / this.getTotalAdjustedYield(pools)) * totalBalance;
      
      // Apply minimum and maximum constraints
      const minAllocation = pool.memberCount * 100; // $100 per member minimum
      const maxAllocation = totalBalance * 0.4; // Max 40% in any single pool
      
      allocation.set(pool.id, Math.max(minAllocation, Math.min(maxAllocation, targetAllocation)));
    }

    return allocation;
  }

  /**
   * Generate rebalancing movements based on current vs target allocation
   */
  private async generateMovements(
    pools: Pool[], 
    optimalAllocation: Map<string, number>
  ): Promise<RebalancingMovement[]> {
    const movements: RebalancingMovement[] = [];
    
    for (const pool of pools) {
      const currentBalance = pool.balance;
      const targetBalance = optimalAllocation.get(pool.id) || currentBalance;
      const delta = targetBalance - currentBalance;
      
      // Only move if difference is significant (> $50 or > 5% of balance)
      const threshold = Math.max(50, currentBalance * 0.05);
      
      if (Math.abs(delta) > threshold) {
        const movement: RebalancingMovement = {
          poolId: pool.id,
          amount: delta,
          reason: this.getMovementReason(pool, delta),
          priority: this.calculatePriority(pool, delta),
          estimatedYieldImpact: this.estimateYieldImpact(pool, delta),
          executionTime: new Date()
        };
        
        movements.push(movement);
      }
    }

    // Sort by priority (urgent first)
    movements.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return movements;
  }

  /**
   * Execute a single rebalancing movement
   */
  private async executeMovement(movement: RebalancingMovement): Promise<void> {
    const pool = this.pools.get(movement.poolId);
    if (!pool) {
      throw new Error(`Pool ${movement.poolId} not found`);
    }

    // Generate Lightning invoice for the movement
    if (movement.amount > 0) {
      // Deposit to pool
      const invoice = await this.generateLightningInvoice({
        questId: `rebalance-deposit-${movement.poolId}`,
        userId: "system",
        amountSats: this.usdToSats(movement.amount),
        description: `Pool deposit: ${pool.name}`
      });

      // Update pool balance
      pool.balance += movement.amount;
      pool.lastRebalanced = new Date();
      
    } else {
      // Withdrawal from pool
      const invoice = await this.generateLightningInvoice({
        questId: `rebalance-withdrawal-${movement.poolId}`,
        userId: "system",
        amountSats: this.usdToSats(Math.abs(movement.amount)),
        description: `Pool withdrawal: ${pool.name}`
      });

      // Update pool balance
      pool.balance += movement.amount; // amount is negative
      pool.lastRebalanced = new Date();
    }

    // Update the pool in the map
    this.pools.set(movement.poolId, pool);
  }

  /**
   * Generate Lightning Network invoice
   */
  private async generateLightningInvoice(data: {
    questId: string;
    userId: string;
    amountSats: number;
    description: string;
  }): Promise<LightningInvoice> {
    // Mock Lightning invoice generation
    const invoice: LightningInvoice = {
      questId: data.questId,
      userId: data.userId,
      amountSats: data.amountSats,
      description: data.description,
      paymentHash: randomBytes(32).toString('hex'),
      expiry: 3600 // 1 hour
    };

    return invoice;
  }

  /**
   * Get rebalancing history
   */
  getRebalancingHistory(limit: number = 10): RebalancingReport[] {
    return this.rebalancingHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get current pool statistics
   */
  getPoolStats(): {
    totalPools: number;
    activePools: number;
    totalBalance: number;
    avgYield: number;
    avgRiskScore: number;
  } {
    const pools = Array.from(this.pools.values());
    const activePools = pools.filter(pool => pool.isActive);
    
    return {
      totalPools: pools.length,
      activePools: activePools.length,
      totalBalance: pools.reduce((sum, pool) => sum + pool.balance, 0),
      avgYield: pools.reduce((sum, pool) => sum + pool.avgYield, 0) / pools.length,
      avgRiskScore: pools.reduce((sum, pool) => sum + pool.riskScore, 0) / pools.length
    };
  }

  /**
   * Manual rebalancing trigger
   */
  async triggerManualRebalancing(): Promise<RebalancingReport> {

    return await this.rebalancePools();
  }

  /**
   * Utility functions
   */
  private getStrategyMultiplier(strategy: Pool["strategy"]): number {
    switch (strategy) {
      case "conservative": return 0.8;
      case "balanced": return 1.0;
      case "aggressive": return 1.3;
      default: return 1.0;
    }
  }

  private getTotalAdjustedYield(pools: Pool[]): number {
    return pools.reduce((sum, pool) => {
      const riskAdjustedYield = pool.avgYield / (1 + pool.riskScore / 100);
      const strategyMultiplier = this.getStrategyMultiplier(pool.strategy);
      return sum + (riskAdjustedYield * strategyMultiplier);
    }, 0);
  }

  private getMovementReason(pool: Pool, delta: number): string {
    if (delta > 0) {
      return "Yield optimization - underperforming pool";
    } else {
      return "Risk reduction - overexposed pool";
    }
  }

  private calculatePriority(pool: Pool, delta: number): RebalancingMovement["priority"] {
    const absDelta = Math.abs(delta);
    const deltaPercentage = absDelta / pool.balance;
    
    if (deltaPercentage > 0.2) return "urgent";
    if (deltaPercentage > 0.1) return "high";
    if (deltaPercentage > 0.05) return "medium";
    return "low";
  }

  private estimateYieldImpact(pool: Pool, delta: number): number {
    // Estimate yield impact in basis points
    const deltaPercentage = delta / pool.balance;
    const baseYield = pool.avgYield * 10000; // Convert to basis points
    return Math.round(baseYield * deltaPercentage * 0.1); // 10% of yield change
  }

  private usdToSats(usd: number): number {
    // Mock conversion rate: 1 USD = 10,000 sats
    return Math.round(usd * 10000);
  }

  private async logRebalancing(report: RebalancingReport): Promise<void> {
    // In production, this would write to S3 with ZSTD compression

  }

  /**
   * Initialize mock pool data
   */
  private initializeMockPools(): void {
    const mockPools: Pool[] = [
      {
        id: "pool-001",
        name: "Johnson Family Trust",
        familyId: "family-001",
        balance: 50000,
        targetBalance: 55000,
        avgYield: 0.0325, // 3.25%
        riskScore: 25,
        memberCount: 4,
        lastRebalanced: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isActive: true,
        strategy: "balanced"
      },
      {
        id: "pool-002",
        name: "Smith Family Savings",
        familyId: "family-002",
        balance: 75000,
        targetBalance: 70000,
        avgYield: 0.0280, // 2.80%
        riskScore: 15,
        memberCount: 6,
        lastRebalanced: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        isActive: true,
        strategy: "conservative"
      },
      {
        id: "pool-003",
        name: "Wilson Growth Fund",
        familyId: "family-003",
        balance: 120000,
        targetBalance: 125000,
        avgYield: 0.0410, // 4.10%
        riskScore: 45,
        memberCount: 8,
        lastRebalanced: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        isActive: true,
        strategy: "aggressive"
      },
      {
        id: "pool-004",
        name: "Davis Education Fund",
        familyId: "family-004",
        balance: 30000,
        targetBalance: 30000,
        avgYield: 0.0250, // 2.50%
        riskScore: 10,
        memberCount: 3,
        lastRebalanced: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        isActive: true,
        strategy: "conservative"
      },
      {
        id: "pool-005",
        name: "Brown Retirement Pool",
        familyId: "family-005",
        balance: 200000,
        targetBalance: 190000,
        avgYield: 0.0380, // 3.80%
        riskScore: 35,
        memberCount: 10,
        lastRebalanced: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        isActive: false, // Inactive for demo
        strategy: "balanced"
      }
    ];

    mockPools.forEach(pool => {
      this.pools.set(pool.id, pool);
    });

  }
}
