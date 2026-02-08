/**
 * Fraud detection and risk assessment for payment transactions.
 * Velocity, amount anomaly, device/location checks; risk level and recommendations.
 */

export interface TransactionInput {
  agentId: string;
  amount: number;
  gateway: string;
  paymentMethod?: { token: string; gateway: string };
  metadata?: { deviceId?: string; location?: string };
}

export interface FraudAnalysis {
  riskScore: number;
  level: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  recommendation: string;
  requiresVerification: boolean;
}

export type GetRecentTransactionsFn = (agentId: string, gateway: string, windowMs: number) => number;
export type GetAgentAverageAmountFn = (agentId: string) => number;

export class FraudDetectionSystem {
  private getRecentTransactions: GetRecentTransactionsFn = () => 0;
  private getAgentAverageAmount: GetAgentAverageAmountFn = () => 0;

  setTransactionSource(
    getRecent: GetRecentTransactionsFn,
    getAvgAmount: GetAgentAverageAmountFn
  ): void {
    this.getRecentTransactions = getRecent;
    this.getAgentAverageAmount = getAvgAmount;
  }

  async analyzeTransaction(data: TransactionInput): Promise<FraudAnalysis> {
    const reasons: string[] = [];
    let riskScore = 0;

    const velocity = this.getRecentTransactions(data.agentId, data.gateway, 5 * 60 * 1000);
    if (velocity >= 5) {
      riskScore += 30;
      reasons.push('High transaction velocity');
    } else if (velocity >= 3) {
      riskScore += 15;
      reasons.push('Elevated transaction velocity');
    }

    const avgAmount = this.getAgentAverageAmount(data.agentId);
    if (avgAmount > 0) {
      const ratio = data.amount / avgAmount;
      if (ratio > 3) {
        riskScore += 25;
        reasons.push('Unusual transaction amount');
      } else if (ratio > 2) {
        riskScore += 10;
        reasons.push('Above-average transaction amount');
      }
    }

    if (data.metadata?.deviceId === 'new') {
      riskScore += 15;
      reasons.push('First transaction from new device');
    }

    riskScore = Math.min(100, riskScore);
    const level = this.getRiskLevel(riskScore);
    const recommendation = this.getRecommendation(riskScore);

    return {
      riskScore,
      level,
      reasons,
      recommendation,
      requiresVerification: riskScore > 60,
    };
  }

  getRiskLevel(score: number): FraudAnalysis['level'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  getRecommendation(riskScore: number): string {
    if (riskScore >= 80) return 'BLOCK - High fraud probability';
    if (riskScore >= 60) return 'HOLD - Require additional verification';
    if (riskScore >= 40) return 'MONITOR - Watch for patterns';
    if (riskScore >= 20) return 'PROCEED - Low risk';
    return 'PROCEED - Minimal risk';
  }
}
