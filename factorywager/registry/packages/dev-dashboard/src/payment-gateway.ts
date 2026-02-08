/**
 * Payment gateway integration (Venmo, Cash App, Apple Pay - simulated).
 * Link payment methods, process payments, split payments, record transactions.
 */

import type { GoldenProfileSystem } from './golden-profile.ts';
import type { FraudDetectionSystem } from './fraud-detection.ts';

export interface GatewayConfig {
  name: string;
  feeStructure: { percentage: number; fixed: number };
}

export interface PaymentMethodLink {
  gateway: string;
  token: string;
  maskedData: string;
  linkedAt: number;
  isDefault: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency?: string;
  gateway?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransaction {
  id: string;
  gateway: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  fee?: number;
  netAmount?: number;
  externalId?: string;
  errorCode?: string;
  message?: string;
}

const GATEWAYS: Record<string, GatewayConfig> = {
  venmo: { name: 'Venmo', feeStructure: { percentage: 1.9, fixed: 0.1 } },
  cashapp: { name: 'Cash App', feeStructure: { percentage: 1.5, fixed: 0.25 } },
  apple_pay: { name: 'Apple Pay', feeStructure: { percentage: 1.5, fixed: 0.15 } },
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function maskPaymentData(gateway: string): string {
  const last4 = Math.floor(1000 + Math.random() * 9000);
  return `${gateway.toUpperCase()} ****${last4}`;
}

export class PaymentGatewaySystem {
  private transactions = new Map<string, PaymentTransaction & { agentId: string }>();
  private recentByAgentGateway = new Map<string, number[]>();
  private goldenProfile: GoldenProfileSystem | null = null;
  private fraudDetection: FraudDetectionSystem | null = null;

  setGoldenProfile(sys: GoldenProfileSystem | null): void {
    this.goldenProfile = sys;
  }

  setFraudDetection(sys: FraudDetectionSystem | null): void {
    this.fraudDetection = sys;
  }

  getRecentTransactionCount(agentId: string, gateway: string, windowMs: number): number {
    const key = `${agentId}:${gateway}`;
    const timestamps = this.recentByAgentGateway.get(key) ?? [];
    const since = Date.now() - windowMs;
    return timestamps.filter((t) => t >= since).length;
  }

  getAgentAverageAmount(agentId: string): number {
    const txs = Array.from(this.transactions.values()).filter((t) => t.agentId === agentId && t.status === 'completed');
    if (txs.length === 0) return 0;
    return txs.reduce((s, t) => s + t.amount, 0) / txs.length;
  }

  async linkPaymentGateway(
    agentId: string,
    gatewayType: string,
    _authData: Record<string, unknown>,
    cookieHeader: string | null
  ): Promise<{ success: boolean; token: string; message: string; setCookieHeaders?: string[] }> {
    const gateway = GATEWAYS[gatewayType];
    if (!gateway) {
      throw new Error(`Unsupported gateway: ${gatewayType}`);
    }
    const token = generateId('pm');
    const maskedData = maskPaymentData(gatewayType);
    const method: PaymentMethodLink = {
      gateway: gatewayType,
      token,
      maskedData,
      linkedAt: Date.now(),
      isDefault: false,
    };
    if (this.goldenProfile) {
      this.goldenProfile.addPaymentMethod(agentId, method);
      const profile = this.goldenProfile.getOrCreateProfile(agentId, cookieHeader);
      const headers = this.goldenProfile.toSetCookieHeaders(cookieHeader, profile);
      return {
        success: true,
        token,
        message: `${gateway.name} linked successfully`,
        setCookieHeaders: headers,
      };
    }
    return { success: true, token, message: `${gateway.name} linked successfully` };
  }

  async processPayment(
    agentId: string,
    request: PaymentRequest,
    cookieHeader: string | null
  ): Promise<PaymentTransaction> {
    const gateway = request.gateway ?? 'venmo';
    const amount = Number(request.amount);
    const currency = request.currency ?? 'USD';
    if (amount <= 0 || !Number.isFinite(amount)) throw new Error('Invalid amount');

    const profile = this.goldenProfile?.getOrCreateProfile(agentId, cookieHeader);
    const paymentMethods = profile?.components.paymentMethods ?? [];
    const method = paymentMethods.find((pm) => pm.gateway === gateway) ?? paymentMethods[0];
    if (!method) throw new Error(`No payment method found for gateway: ${gateway}`);

    if (this.fraudDetection) {
      const analysis = await this.fraudDetection.analyzeTransaction({
        agentId,
        amount,
        gateway,
        paymentMethod: { token: method.token, gateway: method.gateway },
        metadata: request.metadata as { deviceId?: string },
      });
      if (analysis.riskScore >= 80) {
        const txn: PaymentTransaction = {
          id: generateId('txn'),
          gateway,
          amount,
          currency,
          status: 'failed',
          timestamp: Date.now(),
          errorCode: 'FRAUD_BLOCK',
          message: analysis.recommendation,
        };
        this.recordTransaction(agentId, txn);
        if (this.goldenProfile) this.goldenProfile.recordPaymentFailure(agentId);
        if (this.goldenProfile) this.goldenProfile.addRiskFlag(agentId, 'Transaction blocked by fraud check');
        return txn;
      }
    }

    const result = await this.executeGatewayPayment(gateway, {
      amount,
      currency,
      description: request.description,
      paymentToken: method.token,
      metadata: { ...request.metadata, agentId },
    });

    const txn: PaymentTransaction = {
      id: generateId('txn'),
      gateway,
      amount,
      currency,
      status: result.status === 'completed' ? 'completed' : 'failed',
      timestamp: Date.now(),
      fee: result.fee,
      netAmount: result.netAmount,
      externalId: result.transactionId,
      errorCode: result.errorCode,
      message: result.message,
    };
    this.recordTransaction(agentId, txn);

    if (txn.status === 'completed') {
      if (this.goldenProfile) this.goldenProfile.recordPaymentSuccess(agentId, amount);
    } else {
      if (this.goldenProfile) this.goldenProfile.recordPaymentFailure(agentId);
    }

    return txn;
  }

  private recordTransaction(agentId: string, txn: PaymentTransaction): void {
    const withAgent = { ...txn, agentId };
    this.transactions.set(txn.id, withAgent);
    const key = `${agentId}:${txn.gateway}`;
    const list = this.recentByAgentGateway.get(key) ?? [];
    list.push(Date.now());
    if (list.length > 100) list.splice(0, list.length - 100);
    this.recentByAgentGateway.set(key, list);
  }

  private async executeGatewayPayment(
    gatewayType: string,
    data: { amount: number; currency: string; description?: string; paymentToken: string; metadata?: Record<string, unknown> }
  ): Promise<{
    status: string;
    transactionId?: string;
    fee?: number;
    netAmount?: number;
    errorCode?: string;
    message?: string;
  }> {
    const gateway = GATEWAYS[gatewayType];
    const fee = gateway
      ? data.amount * (gateway.feeStructure.percentage / 100) + gateway.feeStructure.fixed
      : 0;
    const netAmount = data.amount - fee;

    const successRates: Record<string, number> = { venmo: 0.98, cashapp: 0.99, apple_pay: 0.995 };
    const successRate = successRates[gatewayType] ?? 0.98;
    const success = Math.random() < successRate;

    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    if (success) {
      const externalId = (gatewayType === 'venmo' ? 'VENMO' : gatewayType === 'cashapp' ? 'CASHAPP' : 'APPLE') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      return {
        status: 'completed',
        transactionId: externalId,
        fee,
        netAmount,
      };
    }
    const errors = [
      { errorCode: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' },
      { errorCode: 'NETWORK_ERROR', message: 'Temporary network issue' },
      { errorCode: 'DECLINED', message: 'Payment declined by issuer' },
    ];
    const err = errors[Math.floor(Math.random() * errors.length)];
    return { status: 'failed', ...err };
  }

  async splitPayment(
    agentIds: string[],
    amount: number,
    description: string,
    cookieHeader: string | null
  ): Promise<{
    splitId: string;
    totalAmount: number;
    participantCount: number;
    individualAmount: number;
    transactions: { agentId: string; success: boolean; transaction?: PaymentTransaction; error?: string }[];
  }> {
    const splitAmount = amount / agentIds.length;
    const transactions: { agentId: string; success: boolean; transaction?: PaymentTransaction; error?: string }[] = [];
    for (const agentId of agentIds) {
      try {
        const tx = await this.processPayment(
          agentId,
          { amount: splitAmount, description: `${description} (split)`, metadata: { split: true, totalParticipants: agentIds.length } },
          cookieHeader
        );
        transactions.push({ agentId, success: tx.status === 'completed', transaction: tx });
      } catch (e) {
        transactions.push({ agentId, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return {
      splitId: generateId('split'),
      totalAmount: amount,
      participantCount: agentIds.length,
      individualAmount: splitAmount,
      transactions,
    };
  }

  getTransactions(agentId: string, limit = 50): PaymentTransaction[] {
    return Array.from(this.transactions.values())
      .filter((t) => t.agentId === agentId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(({ agentId: _a, ...tx }) => tx);
  }

  getGateways(): Record<string, GatewayConfig> {
    return { ...GATEWAYS };
  }
}
