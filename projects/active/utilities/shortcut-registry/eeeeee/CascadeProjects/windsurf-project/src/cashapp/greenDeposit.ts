// src/cashapp/greenDeposit.ts
import { s3 } from "bun";
import type { GreenDepositParams, GreenDepositResult, GreenBalance } from "../types";

export class CashAppGreenClient {
  private readonly API_BASE = "https://api.cash.app/v1";
  private readonly ACCOUNT_ID = process.env.CASHAPP_ACCOUNT_ID!;
  private readonly ACCESS_TOKEN = process.env.CASHAPP_ACCESS_TOKEN!;

  /**
   * Deposit settled Lightning funds to Green account
   */
  async depositToGreen(params: GreenDepositParams): Promise<GreenDepositResult> {
    const amountCents = Math.round(params.amountUsd * 100);
    
    // Cash App Green uses "boosts" feature for 3.25% APY
    const body = {
      account_id: this.ACCOUNT_ID,
      amount: {
        amount_cents: amountCents,
        currency: "USD"
      },
      destination: "CASHAPP_GREEN", // Routes to 3.25% APY account
      reference_id: params.traceId,
      metadata: {
        source: params.source,
        quest_id: params.questId,
        user_id: params.userId,
        yield_rate: 0.0325, // 3.25% APY
        projected_daily_yield: (amountCents * 0.0325) / 365 / 100
      }
    };

    const response = await fetch(`${this.API_BASE}/accounts/${this.ACCOUNT_ID}/deposits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `deposit-${params.traceId}`, // Prevent duplicates
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Cash App deposit failed: ${error.code} - ${error.message}`);
    }

    const data = await response.json() as any;
    
    // Calculate projected yield (3.25% APY)
    const yieldProjection = params.amountUsd * 0.0325;
    
    // Log for reconciliation
    await this.logDeposit({
      depositId: data.id,
      userId: params.userId,
      amountUsd: params.amountUsd,
      yieldProjection,
      traceId: params.traceId,
      timestamp: new Date()
    });

    return {
      success: true,
      depositId: data.id,
      yieldProjection
    };
  }

  /**
   * Get Green account balance for a user
   */
  async getGreenBalance(userId: string): Promise<GreenBalance> {
    const response = await fetch(
      `${this.API_BASE}/accounts/${this.ACCOUNT_ID}/balances`,
      {
        headers: {
          "Authorization": `Bearer ${this.ACCESS_TOKEN}`,
          "X-User-Id": userId, // Per-user segmentation
        }
      }
    );

    const data = await response.json() as any;
    
    return {
      balance: data.green_balance.amount / 100,
      yieldEarned: data.green_yield.amount / 100,
      apy: 0.0325
    };
  }

  private async logDeposit(log: any): Promise<void> {
    await s3.write(
      `logs/cashapp-green/${log.traceId}.json.zst`,
      new TextEncoder().encode(JSON.stringify(log))
    );
  }
}
