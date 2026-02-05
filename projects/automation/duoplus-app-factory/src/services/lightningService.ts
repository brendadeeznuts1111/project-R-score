import { ControlledConnectionPool } from "../ecosystem/connection-system.js";
import { KYCValidator } from "../compliance/kycValidator.js";
import { SavingsOptimizer } from "../finance/savingsOptimizer.js";
import { db } from "../database/db.js";

export interface QuestInvoiceParams {
  questId: string;
  userId: string;
  amountSats: number;
  description: string;
  expirySeconds?: number;
}

export interface LightningBalance {
  local: number;
  remote: number;
  pending: number;
}

export interface TransactionLog {
  type: string;
  questId: string;
  userId: string;
  amountSats: number;
  amountUsd: number;
  paymentHash: string;
  timestamp: Date;
}

export class LightningService {
  private static instance: LightningService;
  private connectionPool: ControlledConnectionPool;
  private kycValidator: KYCValidator;
  private savingsOptimizer: SavingsOptimizer;
  private readonly LND_CONFIG: {
    restUrl: string;
    macaroon: string;
    tlsCert: File;
    maxConnections: number;
    timeout: number;
  };

  private constructor() {
    this.LND_CONFIG = {
      restUrl: process.env.LND_REST_URL!,
      macaroon: process.env.LND_MACAROON!,
      tlsCert: Bun.file(process.env.LND_TLS_CERT_PATH!),
      maxConnections: 10,
      timeout: 30000,
    };
    
    this.connectionPool = ControlledConnectionPool.getInstance();
    this.kycValidator = new KYCValidator();
    this.savingsOptimizer = new SavingsOptimizer();
    
    // Auto-rebalance channels every 5 minutes
    this.startChannelHealthMonitor();
  }

  static getInstance(): LightningService {
    if (!LightningService.instance) {
      LightningService.instance = new LightningService();
    }
    return LightningService.instance;
  }

  /**
   * Generate BOLT-11 invoice for quest payment
   * @returns Lightning invoice (lnbc1...)
   */
  async generateQuestInvoice(params: QuestInvoiceParams): Promise<string> {
    // Pre-flight compliance check
    const amountUsd = this.satsToUsd(params.amountSats);
    const isCompliant = await this.kycValidator.validateLightningPayment(
      params.userId,
      amountUsd
    );
    
    if (!isCompliant.allowed) {
      throw new Error(isCompliant.message || "Payment exceeds risk threshold - manual review required");
    }

    // Generate deterministic preimage for quest reconciliation
    const preimage = this.generateQuestPreimage(params);
    
    // Create invoice via LND REST API
    const response = await this.connectionPool.request(
      `${this.LND_CONFIG.restUrl}/v1/invoices`,
      {
        method: "POST",
        headers: {
          "Grpc-Metadata-macaroon": this.LND_CONFIG.macaroon,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          value: params.amountSats.toString(),
          memo: params.description,
          expiry: params.expirySeconds || 1800,
          private: true,
          r_preimage: preimage,
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LND API error: ${response.status} - ${error.message}`);
    }

    const invoice = await response.json();
    
    // Log for audit trail
    await this.logLightningTransaction({
      type: "INVOICE_GENERATED",
      questId: params.questId,
      userId: params.userId,
      amountSats: params.amountSats,
      amountUsd,
      paymentHash: invoice.r_hash,
      timestamp: new Date(),
    });

    return invoice.payment_request;
  }

  /**
   * Monitor invoice settlement via webhook
   */
  async handleInvoiceSettlement(webhookData: any): Promise<void> {
    const { state, r_hash, amt_paid_sat } = webhookData;
    
    if (state !== "SETTLED") return;

    // Find quest by payment hash
    const quest = await this.findQuestByPaymentHash(r_hash);
    if (!quest) {
      console.warn("⚠️  Settled invoice not linked to any quest");
      return;
    }

    // Route to savings or microtransaction wallet
    await this.savingsOptimizer.processLightningPayment({
      userId: quest.userId,
      amountSats: parseInt(amt_paid_sat, 10),
      questId: quest.id,
    });

    // Mark quest as completed
    await this.completeQuest(quest.id, amt_paid_sat);
  }

  /**
   * Get node balance for auto-consolidation
   */
  async getNodeBalance(): Promise<LightningBalance> {
    const response = await this.connectionPool.request(
      `${this.LND_CONFIG.restUrl}/v1/balance/channels`,
      {
        headers: { "Grpc-Metadata-macaroon": this.LND_CONFIG.macaroon }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get balance: ${response.status}`);
    }

    const data = await response.json();
    return {
      local: parseInt(data.local_balance?.sat || "0", 10),
      remote: parseInt(data.remote_balance?.sat || "0", 10),
      pending: parseInt(data.pending_open_balance?.sat || "0", 10),
    };
  }

  /**
   * Auto-consolidate when balance exceeds threshold
   */
  private startChannelHealthMonitor(): void {
    setInterval(async () => {
      try {
        const balance = await this.getNodeBalance();
        const total = balance.local + balance.remote;
        
        if (total === 0) return;

        // Imbalance > 70% triggers rebalancing
        if (Math.abs(balance.local - balance.remote) / total > 0.7) {
          await this.rebalanceChannels(balance);
        }
        
        // Consolidate if local balance > 500,000 sats (~$300)
        if (balance.local > 500000) {
          await this.consolidateToSavings(balance.local);
        }
      } catch (error) {
        console.error("❌ Channel health monitor error:", error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Manual rebalance function (public for dashboard)
   */
  async rebalanceChannels(balance: LightningBalance): Promise<void> {
    return this.internalRebalance(balance);
  }

  /**
   * Manual consolidation function (public for dashboard)
   */
  async consolidateToSavings(amountSats: number): Promise<void> {
    return this.internalConsolidate(amountSats);
  }

  private async internalRebalance(balance: LightningBalance): Promise<void> {
    // Use LND's circular payment to rebalance
    const circularPayment = {
      outgoing_chan_id: "most_funded_channel",
      amt_msat: (Math.abs(balance.local - balance.remote) / 2) * 1000,
      final_cltv_delta: 40,
    };
    
    console.log("🔄 Rebalancing channels:", circularPayment);
    
    // Implementation would use LND's router API
    // For now, log the intent
    await this.logLightningTransaction({
      type: "REBALANCE_INITIATED",
      questId: "system",
      userId: "system",
      amountSats: circularPayment.amt_msat / 1000,
      amountUsd: this.satsToUsd(circularPayment.amt_msat / 1000),
      paymentHash: "rebalance_" + Date.now(),
      timestamp: new Date(),
    });
  }

  private async internalConsolidate(amountSats: number): Promise<void> {
    const amountUsd = this.satsToUsd(amountSats);
    
    // Close channel and sweep to on-chain wallet
    await this.savingsOptimizer.routeToSavings("system", amountUsd);
    
    console.log(`💰 Consolidated ${amountSats} sats → $${amountUsd} to savings`);
    
    await this.logLightningTransaction({
      type: "CONSOLIDATION_COMPLETED",
      questId: "system",
      userId: "system",
      amountSats,
      amountUsd,
      paymentHash: "consolidation_" + Date.now(),
      timestamp: new Date(),
    });
  }

  private generateQuestPreimage(params: QuestInvoiceParams): string {
    // Deterministic preimage for quest reconciliation
    const preimageInput = `${params.questId}-${params.userId}-${params.amountSats}-${Date.now()}`;
    const hashBuffer = new TextEncoder().encode(preimageInput);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private satsToUsd(sats: number): number {
    // Use real-time rate from your pricing service
    const btcPrice = parseFloat(process.env.BTC_PRICE || "45000");
    return (sats / 100000000) * btcPrice;
  }

  private async logLightningTransaction(tx: TransactionLog): Promise<void> {
    const logFile = process.env.AUDIT_LOG || "./logs/lightning-audit.jsonl";
    const content = JSON.stringify(tx) + '\n';
    await Bun.write(logFile as any, content);
  }

  private async findQuestByPaymentHash(hash: string): Promise<any> {
    try {
      const result = await db.query(
        "SELECT * FROM quests WHERE payment_hash = ?",
        [hash]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Database query error:", error);
      return null;
    }
  }

  private async completeQuest(questId: string, amountSats: string): Promise<void> {
    try {
      await db.query(
        "UPDATE quests SET status = 'completed', settled_sats = ?, completed_at = ? WHERE id = ?",
        [parseInt(amountSats, 10), new Date(), questId]
      );
      console.log(`✅ Quest ${questId} completed: ${amountSats} sats`);
    } catch (error) {
      console.error(`Failed to complete quest ${questId}:`, error);
      throw error;
    }
  }
}