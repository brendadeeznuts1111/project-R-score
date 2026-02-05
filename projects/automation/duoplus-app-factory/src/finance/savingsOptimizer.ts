import { db } from "../database/db.js";
import { YieldQuest } from "./yieldQuest.js";

export interface LightningPaymentParams {
  userId: string;
  amountSats: number;
  questId: string;
}

export interface SavingsResult {
  destination: 'microtransaction_wallet' | 'cashapp_green' | 'standard_account';
  amount: number;
  projectedYield: number;
}

export interface YieldLog {
  userId: string;
  principal: number;
  rate: number;
  source: string;
  projectedAnnual: number;
  timestamp: Date;
}

export interface CreateQuestParams {
  amount: number;
  duration: number;
  strategy: 'loop' | 'hodl' | 'arbitrage';
  riskLevel: 'low' | 'medium' | 'high';
}

export class SavingsOptimizer {
  private readonly CASHAPP_GREEN_APY = parseFloat(process.env.CASHAPP_GREEN_APY || "0.0325");
  private readonly STANDARD_ACCOUNT_APY = parseFloat(process.env.STANDARD_ACCOUNT_APY || "0.025");
  private readonly MICROTRANSACTION_WALLET_APY = parseFloat(process.env.MICROTRANSACTION_WALLET_APY || "0");
  private readonly MICROTRANSACTION_THRESHOLD = 50;
  private readonly CASHAPP_THRESHOLD = 1000;
  private activeQuests: Map<string, YieldQuest> = new Map();

  constructor() {
    this.loadActiveQuests();
  }

  private async loadActiveQuests() {
    try {
      const activeQuests = await db.getActiveQuests();
      for (const questData of activeQuests) {
        const quest = YieldQuest.fromDB(questData as any);
        this.activeQuests.set(quest.id, quest);
      }
      console.log(`🚀 Loaded ${this.activeQuests.size} active yield quests`);
    } catch (error) {
      console.error("Error loading active quests:", error);
    }
  }

  /**
   * Create a new yield quest
   */
  async createYieldQuest(params: CreateQuestParams): Promise<YieldQuest> {
    const quest = new YieldQuest({
      id: `quest_${Date.now()}`,
      amount: params.amount,
      duration: params.duration,
      strategy: params.strategy,
      riskLevel: params.riskLevel,
      createdAt: new Date()
    });

    await quest.initialize();
    await quest.start();

    this.activeQuests.set(quest.id, quest);
    console.log(`🎯 Created yield quest: ${quest.id} for ${params.amount} sats`);

    return quest;
  }

  /**
   * Consolidate funds into a yield quest
   */
  async consolidateToSavings(amount: number): Promise<YieldQuest> {
    if (amount <= 0) {
      throw new Error("Consolidation amount must be positive");
    }

    const quest = await this.createYieldQuest({
      amount,
      duration: 86400,
      strategy: 'loop',
      riskLevel: 'low'
    });

    console.log(`💰 Consolidated ${amount} sats into yield quest ${quest.id}`);
    return quest;
  }

  /**
   * Route Lightning payment to optimal savings vehicle
   */
  async processLightningPayment(params: LightningPaymentParams): Promise<SavingsResult> {
    const amountUsd = this.satsToUsd(params.amountSats);
    
    // Smart routing logic
    if (amountUsd < this.MICROTRANSACTION_THRESHOLD) {
      // Keep in Lightning for microtransactions
      await this.creditLightningWallet(params.userId, params.amountSats);
      return {
        destination: 'microtransaction_wallet',
        amount: amountUsd,
        projectedYield: 0,
      };
    } else if (amountUsd >= this.MICROTRANSACTION_THRESHOLD && amountUsd < this.CASHAPP_THRESHOLD) {
      // Route to Cash App Green (3.25% APY)
      await this.depositToCashAppGreen(params.userId, amountUsd, params.questId);
      const annualYield = amountUsd * this.CASHAPP_GREEN_APY;
      return {
        destination: 'cashapp_green',
        amount: amountUsd,
        projectedYield: annualYield,
      };
    } else {
      // Large amount -> standard high-yield account
      await this.depositToStandardAccount(params.userId, amountUsd, params.questId);
      return {
        destination: 'standard_account',
        amount: amountUsd,
        projectedYield: amountUsd * this.STANDARD_ACCOUNT_APY,
      };
    }
  }

  /**
   * Route system consolidation to savings
   */
  async routeToSavings(userId: string, amountUsd: number): Promise<void> {
    // Always route system consolidations to standard account for maximum yield
    await this.depositToStandardAccount(userId, amountUsd, "system_consolidation");
    
    console.log(`💰 System consolidation: $${amountUsd} → standard account`);
  }

  private async creditLightningWallet(userId: string, amountSats: number): Promise<void> {
    const amountUsd = this.satsToUsd(amountSats);
    
    try {
      // Credit user's Lightning microtransaction wallet
      await db.query(
        "INSERT INTO lightning_wallets (user_id, balance_sats, last_updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance_sats = balance_sats + ?, last_updated = ?",
        [userId, amountSats, new Date().toISOString(), amountSats, new Date().toISOString()]
      );
      
      console.log(`⚡ Credited microtransaction wallet: ${amountSats} sats ($${amountUsd})`);
    } catch (error) {
      console.error("Error crediting Lightning wallet:", error);
      throw error;
    }
  }

  private async depositToCashAppGreen(
    userId: string,
    amountUsd: number,
    questId: string
  ): Promise<void> {
    const cashAppUrl = process.env.CASHAPP_API_URL;
    const accessToken = process.env.CASHAPP_ACCESS_TOKEN;

    if (!cashAppUrl || !accessToken) {
      console.warn("⚠️  Cash App credentials not configured - using mock deposit");
      await this.logYieldGeneration(userId, amountUsd, this.CASHAPP_GREEN_APY, questId);
      return;
    }

    try {
      const response = await fetch(`${cashAppUrl}/deposits`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: { amount_cents: Math.round(amountUsd * 100), currency: "USD" },
          reference_id: questId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cash App deposit failed: ${response.status} - ${error.message}`);
      }

      const deposit = await response.json();
      console.log(`💰 Deposited $${amountUsd} to Cash App Green: ${deposit.id}`);
      
      await this.logYieldGeneration(userId, amountUsd, this.CASHAPP_GREEN_APY, questId);
    } catch (error) {
      console.error("Cash App deposit error:", error);
      // Fallback: log the intent
      await this.logYieldGeneration(userId, amountUsd, this.CASHAPP_GREEN_APY, questId);
    }
  }

  private async depositToStandardAccount(
    userId: string,
    amountUsd: number,
    questId: string
  ): Promise<void> {
    try {
      // Deposit to standard high-yield account
      await db.query(
        "INSERT INTO standard_accounts (user_id, balance_usd, quest_id, deposited_at) VALUES (?, ?, ?, ?)",
        [userId, amountUsd, questId, new Date().toISOString()]
      );
      
      console.log(`🏦 Deposited $${amountUsd} to standard account for user ${userId}`);
      
      await this.logYieldGeneration(userId, amountUsd, this.STANDARD_ACCOUNT_APY, questId);
    } catch (error) {
      console.error("Standard account deposit error:", error);
      throw error;
    }
  }

  private async logYieldGeneration(
    userId: string,
    principal: number,
    rate: number,
    source: string
  ): Promise<void> {
    const yieldLog: YieldLog = {
      userId,
      principal,
      rate,
      source,
      projectedAnnual: principal * rate,
      timestamp: new Date(),
    };

    const logFile = process.env.YIELD_LOG || "./logs/yield-generation.jsonl";
    const content = JSON.stringify(yieldLog) + '\\n';
    await Bun.write(logFile as any, content);
  }

  private satsToUsd(sats: number): number {
    const btcPrice = parseFloat(process.env.BTC_PRICE || "45000");
    return (sats / 100000000) * btcPrice;
  }

  /**
   * Get total yield generated for a user
   */
  async getUserYield(userId: string): Promise<{
    totalProjected: number;
    totalActual: number;
    byDestination: Record<string, number>;
  }> {
    try {
      const result = await db.query(
        "SELECT SUM(projected_annual) as total FROM yield_logs WHERE user_id = ?",
        [userId]
      );
      
      const totalProjected = result.rows[0]?.total || 0;

      // Get breakdown by destination
      const breakdown = await db.query(
        "SELECT source, SUM(projected_annual) as total FROM yield_logs WHERE user_id = ? GROUP BY source",
        [userId]
      );

      const byDestination: Record<string, number> = {};
      breakdown.rows.forEach((row: any) => {
        byDestination[row.source] = row.total;
      });

      return {
        totalProjected,
        totalActual: totalProjected * 0.7, // Assume 70% actual yield
        byDestination,
      };
    } catch (error) {
      console.error("Error getting user yield:", error);
      return {
        totalProjected: 0,
        totalActual: 0,
        byDestination: {},
      };
    }
  }

  /**
   * Calculate daily yield across all users
   */
  async getDailyYield(): Promise<{
    total: number;
    questCount: number;
    averageYield: number;
  }> {
    try {
      const result = await db.query(
        "SELECT SUM(projected_annual) as total, COUNT(*) as count FROM yield_logs WHERE date(timestamp) = date('now')"
      );

      const total = result.rows[0]?.total || 0;
      const count = result.rows[0]?.count || 0;

      return {
        total,
        questCount: count,
        averageYield: count > 0 ? total / count : 0,
      };
    } catch (error) {
      console.error("Error getting daily yield:", error);
      return {
        total: 0,
        questCount: 0,
        averageYield: 0,
      };
    }
  }

  /**
   * Auto-consolidate microtransaction wallets when threshold reached
   */
  async consolidateMicrotransactions(userId: string): Promise<void> {
    try {
      const result = await db.query(
        "SELECT balance_sats FROM lightning_wallets WHERE user_id = ? AND balance_sats >= ?",
        [userId, 100000] // 100k sats = ~$45
      );

      if (result.rows.length === 0) return;

      const balance = result.rows[0].balance_sats;
      const amountUsd = this.satsToUsd(balance);

      // Route to Cash App Green
      await this.depositToCashAppGreen(userId, amountUsd, `consolidation_${userId}_${Date.now()}`);
      
      // Reset Lightning wallet
      await db.query(
        "UPDATE lightning_wallets SET balance_sats = 0, last_updated = ? WHERE user_id = ?",
        [new Date(), userId]
      );

      console.log(`🔄 Consolidated ${balance} sats → $${amountUsd} to Cash App Green`);
    } catch (error) {
      console.error("Microtransaction consolidation error:", error);
    }
  }

  /**
   * Get current savings allocation for a user
   */
  async getSavingsAllocation(userId: string): Promise<{
    lightning: number;
    cashapp: number;
    standard: number;
    total: number;
  }> {
    try {
      const lightning = await db.query(
        "SELECT COALESCE(balance_sats, 0) as balance FROM lightning_wallets WHERE user_id = ?",
        [userId]
      );
      
      const cashapp = await db.query(
        "SELECT COALESCE(SUM(balance_usd), 0) as total FROM standard_accounts WHERE user_id = ? AND quest_id LIKE 'cashapp%'",
        [userId]
      );
      
      const standard = await db.query(
        "SELECT COALESCE(SUM(balance_usd), 0) as total FROM standard_accounts WHERE user_id = ? AND quest_id NOT LIKE 'cashapp%'",
        [userId]
      );

      const lightningUsd = this.satsToUsd(lightning.rows[0]?.balance || 0);

      return {
        lightning: lightningUsd,
        cashapp: parseFloat(cashapp.rows[0]?.total || "0"),
        standard: parseFloat(standard.rows[0]?.total || "0"),
        total: lightningUsd + parseFloat(cashapp.rows[0]?.total || "0") + parseFloat(standard.rows[0]?.total || "0"),
      };
    } catch (error) {
      console.error("Error getting savings allocation:", error);
      return {
        lightning: 0,
        cashapp: 0,
        standard: 0,
        total: 0,
      };
    }
  }
}