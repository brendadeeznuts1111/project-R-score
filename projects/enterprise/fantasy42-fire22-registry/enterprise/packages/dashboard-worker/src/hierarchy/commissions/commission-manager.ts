/**
 * Commission Manager Module
 * Handles commission calculations, structures, payouts, and tier management
 */

import type {
  CommissionStructure,
  CommissionCalculation,
  CommissionCalculationCreate,
  AgentCommissionPayout,
  AgentCommissionPayoutCreate,
  AgentProfile,
  CommissionTier,
  CommissionCondition,
  CommissionAdjustment,
} from '../../../core/types/hierarchy';

export class CommissionManager {
  private commissionStructures: Map<string, CommissionStructure> = new Map();
  private calculations: Map<string, CommissionCalculation> = new Map();
  private payouts: Map<string, AgentCommissionPayout> = new Map();
  private agentCalculations: Map<string, string[]> = new Map(); // agentId -> calculationIds
  private pendingPayouts: Map<string, AgentCommissionPayout> = new Map();

  constructor() {
    this.initializeDefaultStructures();
  }

  /**
   * Create commission structure
   */
  createCommissionStructure(
    structure: Omit<CommissionStructure, 'id' | 'createdAt' | 'updatedAt'>
  ): CommissionStructure {
    const commissionStructure: CommissionStructure = {
      ...structure,
      id: this.generateStructureId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.commissionStructures.set(commissionStructure.id, commissionStructure);
    console.log(
      `💰 Created commission structure: ${commissionStructure.name} (${commissionStructure.id})`
    );
    return commissionStructure;
  }

  /**
   * Update commission structure
   */
  updateCommissionStructure(
    structureId: string,
    updates: Partial<CommissionStructure>
  ): CommissionStructure | null {
    const structure = this.commissionStructures.get(structureId);
    if (!structure) {
      console.warn(`⚠️ Commission structure not found: ${structureId}`);
      return null;
    }

    const updatedStructure: CommissionStructure = {
      ...structure,
      ...updates,
      updatedAt: new Date(),
    };

    this.commissionStructures.set(structureId, updatedStructure);
    console.log(`📝 Updated commission structure: ${updatedStructure.name} (${structureId})`);
    return updatedStructure;
  }

  /**
   * Get commission structure
   */
  getCommissionStructure(structureId: string): CommissionStructure | null {
    return this.commissionStructures.get(structureId) || null;
  }

  /**
   * Get all commission structures
   */
  getAllCommissionStructures(): CommissionStructure[] {
    return Array.from(this.commissionStructures.values());
  }

  /**
   * Calculate commission for agent
   */
  calculateCommission(
    agentId: string,
    structureId: string,
    revenue: number,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): CommissionCalculation {
    const structure = this.commissionStructures.get(structureId);
    if (!structure || !structure.isActive) {
      throw new Error(`Invalid or inactive commission structure: ${structureId}`);
    }

    // Calculate base commission
    let commissionAmount = this.calculateBaseCommission(structure, revenue);

    // Apply conditions
    const conditionAdjustments = this.applyCommissionConditions(structure, revenue, period);
    commissionAmount += conditionAdjustments;

    // Apply overrides if any
    const overrideAdjustments = this.applyCommissionOverrides(agentId, commissionAmount);
    commissionAmount += overrideAdjustments.adjustment;

    const calculation: CommissionCalculation = {
      agentId,
      period,
      startDate,
      endDate,
      baseRevenue: revenue,
      commissionRate: this.getEffectiveCommissionRate(structure, revenue),
      commissionAmount,
      adjustments: [
        ...(conditionAdjustments > 0
          ? [
              {
                type: 'bonus',
                amount: conditionAdjustments,
                reason: 'Condition-based adjustment',
                appliedBy: 'system',
                appliedAt: new Date(),
              },
            ]
          : []),
        ...(overrideAdjustments.adjustment !== 0 ? [overrideAdjustments] : []),
      ],
      finalAmount: commissionAmount,
      status: 'calculated',
      calculatedBy: 'system',
    };

    // Store calculation
    this.calculations.set(calculation.id, calculation);

    // Add to agent calculations index
    if (!this.agentCalculations.has(agentId)) {
      this.agentCalculations.set(agentId, []);
    }
    this.agentCalculations.get(agentId)!.push(calculation.id);

    console.log(`💰 Calculated commission for agent ${agentId}: $${commissionAmount.toFixed(2)}`);
    return calculation;
  }

  /**
   * Create commission payout
   */
  createPayout(payoutData: AgentCommissionPayoutCreate): AgentCommissionPayout {
    const payout: AgentCommissionPayout = {
      ...payoutData,
      id: this.generatePayoutId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: payoutData.processedBy,
      updatedBy: payoutData.processedBy,
    };

    this.payouts.set(payout.id, payout);
    this.pendingPayouts.set(payout.id, payout);

    console.log(
      `💸 Created commission payout: $${payout.netAmount.toFixed(2)} for ${payout.agentId}`
    );
    return payout;
  }

  /**
   * Process commission payout
   */
  processPayout(payoutId: string, processedBy: string): AgentCommissionPayout | null {
    const payout = this.payouts.get(payoutId);
    if (!payout) {
      console.warn(`⚠️ Payout not found: ${payoutId}`);
      return null;
    }

    if (payout.status !== 'pending') {
      console.warn(`⚠️ Payout already processed: ${payoutId} (${payout.status})`);
      return null;
    }

    const updatedPayout: AgentCommissionPayout = {
      ...payout,
      status: 'processing',
      processedBy,
      processedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: processedBy,
    };

    this.payouts.set(payoutId, updatedPayout);
    this.pendingPayouts.delete(payoutId);

    console.log(`⚙️ Processing payout ${payoutId} by ${processedBy}`);
    return updatedPayout;
  }

  /**
   * Complete commission payout
   */
  completePayout(payoutId: string, paymentReference?: string): AgentCommissionPayout | null {
    const payout = this.payouts.get(payoutId);
    if (!payout) {
      console.warn(`⚠️ Payout not found: ${payoutId}`);
      return null;
    }

    if (payout.status !== 'processing') {
      console.warn(`⚠️ Payout not ready for completion: ${payoutId} (${payout.status})`);
      return null;
    }

    const updatedPayout: AgentCommissionPayout = {
      ...payout,
      status: 'completed',
      paymentReference,
      paidAt: new Date(),
      updatedAt: new Date(),
    };

    this.payouts.set(payoutId, updatedPayout);

    console.log(`✅ Completed payout ${payoutId}: ${paymentReference}`);
    return updatedPayout;
  }

  /**
   * Get pending payouts for agent
   */
  getPendingPayouts(agentId: string): AgentCommissionPayout[] {
    return Array.from(this.pendingPayouts.values()).filter(payout => payout.agentId === agentId);
  }

  /**
   * Get commission calculations for agent
   */
  getAgentCommissionCalculations(agentId: string, limit?: number): CommissionCalculation[] {
    const calculationIds = this.agentCalculations.get(agentId) || [];
    let calculations = calculationIds
      .map(id => this.calculations.get(id))
      .filter((calc): calc is CommissionCalculation => calc !== undefined)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    if (limit) {
      calculations = calculations.slice(0, limit);
    }

    return calculations;
  }

  /**
   * Get commission summary for agent
   */
  getCommissionSummary(
    agentId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): {
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
    currentPeriod: number;
    averageCommission: number;
    lastPayoutDate?: Date;
  } {
    const calculations = this.getAgentCommissionCalculations(agentId);
    const payouts = Array.from(this.payouts.values()).filter(payout => payout.agentId === agentId);

    const totalEarned = calculations.reduce((sum, calc) => sum + calc.finalAmount, 0);
    const totalPaid = payouts
      .filter(payout => payout.status === 'completed')
      .reduce((sum, payout) => sum + payout.netAmount, 0);
    const pendingPayout = payouts
      .filter(payout => payout.status === 'pending')
      .reduce((sum, payout) => sum + payout.netAmount, 0);

    // Current period calculations
    const now = new Date();
    const currentPeriodStart = this.getPeriodStart(now, period);
    const currentPeriodCalculations = calculations.filter(
      calc => calc.startDate >= currentPeriodStart && calc.startDate <= now
    );
    const currentPeriod = currentPeriodCalculations.reduce(
      (sum, calc) => sum + calc.finalAmount,
      0
    );

    const completedPayouts = payouts.filter(payout => payout.status === 'completed');
    const lastPayoutDate =
      completedPayouts.length > 0
        ? completedPayouts.sort(
            (a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0)
          )[0].paidAt
        : undefined;

    return {
      totalEarned,
      totalPaid,
      pendingPayout,
      currentPeriod,
      averageCommission: calculations.length > 0 ? totalEarned / calculations.length : 0,
      lastPayoutDate,
    };
  }

  /**
   * Get commission statistics
   */
  getCommissionStatistics(): {
    totalStructures: number;
    activeStructures: number;
    totalCalculations: number;
    totalPayouts: number;
    pendingPayouts: number;
    completedPayouts: number;
    totalCommissionPaid: number;
    averageCommissionRate: number;
  } {
    const structures = Array.from(this.commissionStructures.values());
    const calculations = Array.from(this.calculations.values());
    const payouts = Array.from(this.payouts.values());

    const totalCommissionPaid = payouts
      .filter(payout => payout.status === 'completed')
      .reduce((sum, payout) => sum + payout.netAmount, 0);

    const totalCommissionCalculated = calculations.reduce((sum, calc) => sum + calc.finalAmount, 0);

    return {
      totalStructures: structures.length,
      activeStructures: structures.filter(s => s.isActive).length,
      totalCalculations: calculations.length,
      totalPayouts: payouts.length,
      pendingPayouts: payouts.filter(p => p.status === 'pending').length,
      completedPayouts: payouts.filter(p => p.status === 'completed').length,
      totalCommissionPaid,
      averageCommissionRate:
        calculations.length > 0
          ? (totalCommissionCalculated /
              calculations.reduce((sum, calc) => sum + calc.baseRevenue, 0)) *
            100
          : 0,
    };
  }

  // Private methods

  private initializeDefaultStructures(): void {
    // Create default commission structures
    const structures = [
      {
        name: 'Standard Agent Commission',
        type: 'percentage',
        isActive: true,
        baseRate: 0.15, // 15%
        tiers: [
          { minAmount: 0, maxAmount: 10000, rate: 0.1 },
          { minAmount: 10000, maxAmount: 50000, rate: 0.15 },
          { minAmount: 50000, rate: 0.2 },
        ],
        effectiveFrom: new Date('2024-01-01'),
        conditions: [
          {
            type: 'volume',
            operator: 'gt',
            value: 100000,
            adjustment: 0.02, // +2% for high volume
          },
        ],
      },
      {
        name: 'VIP Agent Commission',
        type: 'percentage',
        isActive: true,
        baseRate: 0.25, // 25%
        tiers: [
          { minAmount: 0, maxAmount: 25000, rate: 0.2 },
          { minAmount: 25000, maxAmount: 100000, rate: 0.25 },
          { minAmount: 100000, rate: 0.3 },
        ],
        effectiveFrom: new Date('2024-01-01'),
      },
    ];

    structures.forEach(structure => {
      this.createCommissionStructure(structure);
    });

    console.log(`✅ Initialized ${structures.length} default commission structures`);
  }

  private generateStructureId(): string {
    return `commission_structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePayoutId(): string {
    return `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateBaseCommission(structure: CommissionStructure, revenue: number): number {
    if (structure.type === 'flat') {
      return structure.baseRate;
    }

    if (structure.type === 'percentage') {
      if (structure.tiers && structure.tiers.length > 0) {
        // Find appropriate tier
        const tier = structure.tiers.find(
          t => revenue >= t.minAmount && (!t.maxAmount || revenue <= t.maxAmount)
        );
        return revenue * (tier?.rate || structure.baseRate);
      }
      return revenue * structure.baseRate;
    }

    return 0;
  }

  private getEffectiveCommissionRate(structure: CommissionStructure, revenue: number): number {
    if (structure.type === 'percentage') {
      if (structure.tiers && structure.tiers.length > 0) {
        const tier = structure.tiers.find(
          t => revenue >= t.minAmount && (!t.maxAmount || revenue <= t.maxAmount)
        );
        return tier?.rate || structure.baseRate;
      }
      return structure.baseRate;
    }
    return 0;
  }

  private applyCommissionConditions(
    structure: CommissionStructure,
    revenue: number,
    period: string
  ): number {
    if (!structure.conditions) return 0;

    let adjustment = 0;

    for (const condition of structure.conditions) {
      if (this.evaluateCondition(condition, revenue, period)) {
        adjustment += condition.adjustment;
      }
    }

    return adjustment;
  }

  private applyCommissionOverrides(
    agentId: string,
    commissionAmount: number
  ): CommissionAdjustment {
    // Check for agent-specific overrides (would be stored in a database)
    // For now, return no adjustment
    return {
      type: 'correction',
      amount: 0,
      reason: 'No overrides applied',
      appliedBy: 'system',
      appliedAt: new Date(),
    };
  }

  private evaluateCondition(
    condition: CommissionCondition,
    revenue: number,
    period: string
  ): boolean {
    const value = condition.value;

    switch (condition.operator) {
      case 'gt':
        return revenue > value;
      case 'gte':
        return revenue >= value;
      case 'lt':
        return revenue < value;
      case 'lte':
        return revenue <= value;
      case 'eq':
        return revenue === value;
      case 'between':
        if (Array.isArray(value)) {
          return revenue >= value[0] && revenue <= value[1];
        }
        return false;
      default:
        return false;
    }
  }

  private getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(date);

    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(date.getDate() - date.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return start;
  }
}
