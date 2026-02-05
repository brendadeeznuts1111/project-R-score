import { db } from "../database/db.js";
import { EventEmitter } from "events";

export interface YieldQuestConfig {
  id: string;
  amount: number;
  duration: number;
  strategy: "loop" | "hodl" | "arbitrage";
  riskLevel: "low" | "medium" | "high";
  createdAt: Date;
}

export interface YieldQuestData {
  id: string;
  amount: number;
  duration: number;
  strategy: string;
  riskLevel: string;
  created_at: string;
  status: "active" | "completed" | "failed";
  current_yield: number;
  projected_annual: number;
  started_at?: string;
  completed_at?: string;
}

export class YieldQuest extends EventEmitter {
  public readonly id: string;
  public readonly amount: number;
  public readonly duration: number;
  public readonly strategy: string;
  public readonly riskLevel: string;
  public readonly createdAt: Date;

  private status: "pending" | "active" | "completed" | "failed" = "pending";
  private currentYield: number = 0;
  private projectedAnnual: number = 0;
  private startedAt?: Date;
  private completedAt?: Date;
  private updateInterval?: NodeJS.Timeout;

  constructor(config: YieldQuestConfig) {
    super();
    this.id = config.id;
    this.amount = config.amount;
    this.duration = config.duration;
    this.strategy = config.strategy;
    this.riskLevel = config.riskLevel;
    this.createdAt = config.createdAt;

    this.calculateProjectedYield();
  }

  static fromDB(data: YieldQuestData): YieldQuest {
    const quest = new YieldQuest({
      id: data.id,
      amount: data.amount,
      duration: data.duration,
      strategy: data.strategy as "loop" | "hodl" | "arbitrage",
      riskLevel: data.riskLevel as "low" | "medium" | "high",
      createdAt: new Date(data.created_at)
    });

    quest.status = data.status as "pending" | "active" | "completed" | "failed";
    quest.currentYield = data.current_yield;
    quest.projectedAnnual = data.projected_annual;
    quest.startedAt = data.started_at ? new Date(data.started_at) : undefined;
    quest.completedAt = data.completed_at ? new Date(data.completed_at) : undefined;

    return quest;
  }

  async initialize(): Promise<void> {
    if (this.amount <= 0) {
      throw new Error("Quest amount must be positive");
    }

    if (this.duration < 3600) {
      throw new Error("Quest duration must be at least 1 hour");
    }

    await this.saveToDB();
    console.log(`🎯 Initialized yield quest ${this.id}: ${this.amount} sats for ${this.duration}s`);
  }

  async start(): Promise<void> {
    if (this.status !== "pending") {
      throw new Error(`Cannot start quest in ${this.status} status`);
    }

    this.status = "active";
    this.startedAt = new Date();

    console.log(`🚀 Starting yield quest ${this.id} with ${this.strategy} strategy`);

    this.startYieldGeneration();

    setTimeout(() => {
      this.complete();
    }, this.duration * 1000);

    await this.saveToDB();
    this.emit("quest:started", { id: this.id, startedAt: this.startedAt });
  }

  private startYieldGeneration(): void {
    const updateFrequency = 60000;

    this.updateInterval = setInterval(() => {
      if (this.status !== "active") {
        this.stopYieldGeneration();
        return;
      }

      this.generateYield();
    }, updateFrequency);
  }

  private stopYieldGeneration(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  private generateYield(): void {
    const baseRate = this.getBaseYieldRate();
    const riskMultiplier = this.getRiskMultiplier();
    const timeMultiplier = this.getTimeMultiplier();

    const minuteYield = (this.amount * baseRate * riskMultiplier * timeMultiplier) / (365 * 24 * 60);
    this.currentYield += minuteYield;

    if (Math.random() < 0.1) {
      this.emit("yield:update", {
        id: this.id,
        currentYield: this.currentYield,
        projectedAnnual: this.projectedAnnual
      });
    }
  }

  private getBaseYieldRate(): number {
    const rates: Record<string, number> = {
      "loop": 0.08,
      "hodl": 0.12,
      "arbitrage": 0.18
    };

    return rates[this.strategy] || 0.10;
  }

  private getRiskMultiplier(): number {
    const multipliers: Record<string, number> = {
      "low": 0.8,
      "medium": 1.0,
      "high": 1.3
    };

    return multipliers[this.riskLevel] || 1.0;
  }

  private getTimeMultiplier(): number {
    const hours = this.duration / 3600;

    if (hours >= 24) return 1.1;
    if (hours >= 8) return 1.05;
    if (hours >= 1) return 1.02;
    return 1.0;
  }

  private calculateProjectedYield(): void {
    const baseRate = this.getBaseYieldRate();
    const riskMultiplier = this.getRiskMultiplier();
    const timeMultiplier = this.getTimeMultiplier();

    this.projectedAnnual = this.amount * baseRate * riskMultiplier * timeMultiplier;
  }

  private async complete(): Promise<void> {
    if (this.status !== "active") return;

    this.status = "completed";
    this.completedAt = new Date();
    this.stopYieldGeneration();

    const actualYield = this.currentYield;
    const annualizedYield = (actualYield / this.amount) * (365 * 24 * 60 * 60) / this.duration * 100;

    console.log(`✅ Completed yield quest ${this.id}`);
    console.log(`   Amount: ${this.amount} sats`);
    console.log(`   Yield: ${actualYield.toFixed(0)} sats (${annualizedYield.toFixed(2)}% annualized)`);
    console.log(`   Duration: ${this.duration}s`);

    await this.saveToDB();

    this.emit("quest:completed", {
      id: this.id,
      amount: this.amount,
      yield: actualYield,
      annualizedRate: annualizedYield,
      completedAt: this.completedAt
    });
  }

  async fail(reason: string): Promise<void> {
    if (this.status !== "active") return;

    this.status = "failed";
    this.completedAt = new Date();
    this.stopYieldGeneration();

    console.log(`❌ Failed yield quest ${this.id}: ${reason}`);

    await this.saveToDB();

    this.emit("quest:failed", {
      id: this.id,
      reason,
      failedAt: this.completedAt
    });
  }

  private async saveToDB(): Promise<void> {
    await db.run(
      `INSERT OR REPLACE INTO yield_quests (
        id, amount, duration, strategy, risk_level, created_at,
        status, current_yield, projected_annual, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.id,
        this.amount,
        this.duration,
        this.strategy,
        this.riskLevel,
        this.createdAt.toISOString(),
        this.status,
        this.currentYield,
        this.projectedAnnual,
        this.startedAt?.toISOString(),
        this.completedAt?.toISOString()
      ]
    );
  }

  getStatus(): string {
    return this.status;
  }

  getCurrentYield(): number {
    return this.currentYield;
  }

  getProjectedAnnual(): number {
    return this.projectedAnnual;
  }

  getData(): YieldQuestData {
    return {
      id: this.id,
      amount: this.amount,
      duration: this.duration,
      strategy: this.strategy,
      riskLevel: this.riskLevel,
      created_at: this.createdAt.toISOString(),
      status: this.status as "active" | "completed" | "failed",
      current_yield: this.currentYield,
      projected_annual: this.projectedAnnual,
      started_at: this.startedAt?.toISOString(),
      completed_at: this.completedAt?.toISOString()
    };
  }
}
