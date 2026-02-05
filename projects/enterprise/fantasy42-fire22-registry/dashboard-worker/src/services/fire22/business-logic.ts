/**
 * 🏈 Fire22 Business Logic Service
 * Core business rules and validation for Fire22 operations
 */

import type {
  Fire22Customer,
  Fire22Agent,
  CustomerTier,
  CustomerStatus,
  AgentType,
} from '../../types/fire22/entities';
import { FIRE22_BUSINESS_RULES, FIRE22_CONSTRAINTS } from '../../types/fire22/entities';
import { customerRepository, agentRepository } from '../../repositories/fire22';
import { BUSINESS } from '../../constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BusinessRuleResult {
  success: boolean;
  message: string;
  data?: any;
  requiresApproval?: boolean;
  approvalLevel?: 'agent' | 'manager' | 'admin';
}

export interface TierUpgradeResult {
  eligible: boolean;
  currentTier: CustomerTier;
  newTier: CustomerTier;
  requirements: string[];
  benefits: string[];
}

export interface RiskAssessmentResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: string[];
  recommendations: string[];
  requiresReview: boolean;
}

/**
 * Fire22 Business Logic Service
 * Centralizes all business rules and validation logic
 */
export class Fire22BusinessLogic {
  // !== CUSTOMER BUSINESS RULES !==

  /**
   * Validate customer deposit
   */
  public static validateDeposit(customer: Fire22Customer, amount: number): BusinessRuleResult {
    const errors: string[] = [];

    // Basic amount validation
    if (amount <= 0) {
      errors.push('Deposit amount must be positive');
    }

    if (amount < BUSINESS.TRANSACTION_LIMITS.MIN_DEPOSIT) {
      errors.push(`Minimum deposit is $${BUSINESS.TRANSACTION_LIMITS.MIN_DEPOSIT}`);
    }

    if (amount > BUSINESS.TRANSACTION_LIMITS.MAX_DEPOSIT) {
      errors.push(`Maximum deposit is $${BUSINESS.TRANSACTION_LIMITS.MAX_DEPOSIT}`);
    }

    // Customer status validation
    if (customer.status !== 'active') {
      errors.push('Customer account is not active');
    }

    // KYC requirements
    if (amount > 2000 && customer.kyc_status !== 'approved') {
      errors.push('KYC verification required for deposits over $2,000');
    }

    // Risk level validation
    if (customer.risk_level === 'critical') {
      errors.push('Customer account flagged for risk review');
    }

    let requiresApproval = false;
    let approvalLevel: 'agent' | 'manager' | 'admin' = 'agent';

    // High-value deposits require approval
    if (amount >= 10000) {
      requiresApproval = true;
      approvalLevel = 'manager';
    }

    if (amount >= 50000) {
      approvalLevel = 'admin';
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Deposit validation passed',
      requiresApproval,
      approvalLevel,
    };
  }

  /**
   * Validate customer withdrawal
   */
  public static validateWithdrawal(customer: Fire22Customer, amount: number): BusinessRuleResult {
    const errors: string[] = [];

    // Basic amount validation
    if (amount <= 0) {
      errors.push('Withdrawal amount must be positive');
    }

    if (amount < BUSINESS.TRANSACTION_LIMITS.MIN_WITHDRAWAL) {
      errors.push(`Minimum withdrawal is $${BUSINESS.TRANSACTION_LIMITS.MIN_WITHDRAWAL}`);
    }

    if (amount > BUSINESS.TRANSACTION_LIMITS.MAX_WITHDRAWAL) {
      errors.push(`Maximum withdrawal is $${BUSINESS.TRANSACTION_LIMITS.MAX_WITHDRAWAL}`);
    }

    // Balance validation
    const totalBalance = customer.balance + customer.casino_balance + customer.sports_balance;
    if (amount > totalBalance) {
      errors.push('Insufficient balance');
    }

    // Customer status validation
    if (customer.status !== 'active') {
      errors.push('Customer account is not active');
    }

    // KYC requirements
    if (customer.kyc_status !== 'approved') {
      errors.push('KYC verification required for withdrawals');
    }

    // Negative balance check
    if (customer.total_deposits < customer.total_withdrawals + amount) {
      errors.push('Cannot withdraw more than deposited');
    }

    let requiresApproval = false;
    let approvalLevel: 'agent' | 'manager' | 'admin' = 'agent';

    // Large withdrawals require approval
    if (amount >= 5000) {
      requiresApproval = true;
      approvalLevel = 'manager';
    }

    if (amount >= 25000) {
      approvalLevel = 'admin';
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Withdrawal validation passed',
      requiresApproval,
      approvalLevel,
    };
  }

  /**
   * Validate bet placement
   */
  public static validateBetPlacement(
    customer: Fire22Customer,
    betAmount: number,
    betType: string = 'straight',
    sport: string = 'football'
  ): BusinessRuleResult {
    const errors: string[] = [];

    // Basic validations
    if (betAmount <= 0) {
      errors.push('Bet amount must be positive');
    }

    // Customer status
    if (customer.status !== 'active') {
      errors.push('Customer account is not active');
    }

    // Balance check
    const totalBalance = customer.balance + customer.sports_balance;
    if (betAmount > totalBalance) {
      errors.push('Insufficient balance for bet');
    }

    // Get betting limits for customer tier
    const tierLimits = FIRE22_BUSINESS_RULES.DEFAULT_BETTING_LIMITS[customer.tier];

    if (betAmount < tierLimits.min) {
      errors.push(`Minimum bet for ${customer.tier} tier is $${tierLimits.min}`);
    }

    if (betAmount > tierLimits.max) {
      errors.push(`Maximum bet for ${customer.tier} tier is $${tierLimits.max}`);
    }

    // Risk level restrictions
    if (customer.risk_level === 'critical') {
      errors.push('Betting suspended due to risk assessment');
    }

    if (customer.risk_level === 'high' && betAmount > 1000) {
      errors.push('High-risk customers limited to $1,000 bets');
    }

    let requiresApproval = false;
    let approvalLevel: 'agent' | 'manager' | 'admin' = 'agent';

    // Large bets require approval
    if (betAmount >= 5000) {
      requiresApproval = true;
      approvalLevel = 'manager';
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Bet validation passed',
      requiresApproval,
      approvalLevel,
    };
  }

  /**
   * Calculate tier upgrade eligibility
   */
  public static calculateTierUpgrade(customer: Fire22Customer): TierUpgradeResult {
    const currentVolume = customer.lifetime_volume;
    const thresholds = FIRE22_BUSINESS_RULES.VIP_TIER_THRESHOLD;

    let eligibleTier: CustomerTier = 'bronze';
    let eligible = false;

    // Determine eligible tier based on volume
    if (currentVolume >= thresholds.vip) eligibleTier = 'vip';
    else if (currentVolume >= thresholds.diamond) eligibleTier = 'diamond';
    else if (currentVolume >= thresholds.platinum) eligibleTier = 'platinum';
    else if (currentVolume >= thresholds.gold) eligibleTier = 'gold';
    else if (currentVolume >= thresholds.silver) eligibleTier = 'silver';
    else eligibleTier = 'bronze';

    // Check if upgrade is needed
    const tierOrder: CustomerTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'vip'];
    const currentTierIndex = tierOrder.indexOf(customer.tier);
    const eligibleTierIndex = tierOrder.indexOf(eligibleTier);

    eligible = eligibleTierIndex > currentTierIndex;

    // Generate requirements and benefits
    const requirements: string[] = [];
    const benefits: string[] = [];

    if (eligible) {
      const nextTierLimits = FIRE22_BUSINESS_RULES.DEFAULT_BETTING_LIMITS[eligibleTier];
      const currentLimits = FIRE22_BUSINESS_RULES.DEFAULT_BETTING_LIMITS[customer.tier];

      benefits.push(`Increased betting limit: $${nextTierLimits.max} (from $${currentLimits.max})`);
      benefits.push('Priority customer support');

      if (eligibleTier === 'vip' || eligibleTier === 'diamond') {
        benefits.push('VIP account manager');
        benefits.push('Exclusive promotions');
        benefits.push('Higher withdrawal limits');
      }
    } else {
      const nextTierIndex = currentTierIndex + 1;
      if (nextTierIndex < tierOrder.length) {
        const nextTier = tierOrder[nextTierIndex];
        const requiredVolume = thresholds[nextTier];
        const remainingVolume = requiredVolume - currentVolume;

        requirements.push(`$${remainingVolume.toLocaleString()} more in lifetime volume`);
        requirements.push('Maintain good account standing');
      }
    }

    return {
      eligible,
      currentTier: customer.tier,
      newTier: eligible ? eligibleTier : customer.tier,
      requirements,
      benefits,
    };
  }

  /**
   * Assess customer risk
   */
  public static assessCustomerRisk(customer: Fire22Customer): RiskAssessmentResult {
    let riskScore = 0;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Betting patterns
    if (customer.lifetime_volume > 100000) {
      riskScore += 20;
      factors.push('High betting volume');
    }

    if (customer.total_bets_placed > 1000) {
      riskScore += 15;
      factors.push('High betting frequency');
    }

    // Financial patterns
    const netPosition = customer.total_deposits - customer.total_withdrawals;
    if (netPosition < 0) {
      riskScore += 25;
      factors.push('Negative net position');
    }

    if (customer.balance > 50000) {
      riskScore += 15;
      factors.push('High account balance');
    }

    // Account compliance
    if (customer.kyc_status !== 'approved') {
      riskScore += 30;
      factors.push('KYC not approved');
    }

    if (customer.aml_status === 'flagged') {
      riskScore += 40;
      factors.push('AML flag active');
    }

    // Activity patterns
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(customer.last_activity).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActivity < 1 && customer.total_bets_placed > 50) {
      riskScore += 20;
      factors.push('Excessive daily activity');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const thresholds = FIRE22_BUSINESS_RULES.RISK_LEVEL_THRESHOLDS;

    if (riskScore >= thresholds.critical) {
      riskLevel = 'critical';
      recommendations.push('Immediate manual review required');
      recommendations.push('Suspend betting privileges');
      recommendations.push('Enhanced monitoring');
    } else if (riskScore >= thresholds.high) {
      riskLevel = 'high';
      recommendations.push('Weekly review required');
      recommendations.push('Enhanced transaction monitoring');
      recommendations.push('Reduce betting limits');
    } else if (riskScore >= thresholds.medium) {
      riskLevel = 'medium';
      recommendations.push('Monthly review recommended');
      recommendations.push('Standard monitoring');
    } else {
      riskLevel = 'low';
      recommendations.push('Standard processing');
    }

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      factors,
      recommendations,
      requiresReview: riskLevel === 'critical' || riskLevel === 'high',
    };
  }

  // !== AGENT BUSINESS RULES !==

  /**
   * Validate agent bet approval
   */
  public static validateAgentBetApproval(
    agent: Fire22Agent,
    customer: Fire22Customer,
    betAmount: number
  ): BusinessRuleResult {
    const errors: string[] = [];

    // Agent status validation
    if (agent.status !== 'active') {
      errors.push('Agent account is not active');
    }

    // Bet limit validation
    if (betAmount > agent.max_bet_limit) {
      errors.push(`Bet amount exceeds agent limit of $${agent.max_bet_limit}`);
    }

    // Customer relationship validation
    if (customer.agent_id !== agent.agent_id) {
      errors.push('Agent not authorized for this customer');
    }

    // Performance-based restrictions
    if (agent.performance_score < 50) {
      errors.push('Agent performance below approval threshold');
    }

    let requiresApproval = false;
    let approvalLevel: 'agent' | 'manager' | 'admin' = 'agent';

    // Large bets require higher approval
    if (betAmount > agent.max_bet_limit * 0.8) {
      requiresApproval = true;
      approvalLevel = 'manager';
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Agent approval validation passed',
      requiresApproval,
      approvalLevel,
    };
  }

  /**
   * Calculate agent commission
   */
  public static calculateAgentCommission(
    agent: Fire22Agent,
    customerVolume: number,
    customerTier: CustomerTier
  ): BusinessRuleResult {
    let baseCommissionRate = agent.commission_rate;

    // Tier-based commission adjustments
    const tierMultipliers = {
      bronze: 1.0,
      silver: 1.1,
      gold: 1.2,
      platinum: 1.3,
      diamond: 1.5,
      vip: 2.0,
    };

    const adjustedRate = baseCommissionRate * tierMultipliers[customerTier];
    const commissionAmount = customerVolume * adjustedRate;

    // Performance bonus
    let performanceBonus = 0;
    if (agent.performance_score >= 90) {
      performanceBonus = commissionAmount * 0.2; // 20% bonus
    } else if (agent.performance_score >= 80) {
      performanceBonus = commissionAmount * 0.1; // 10% bonus
    }

    const totalCommission = commissionAmount + performanceBonus;

    return {
      success: true,
      message: 'Commission calculated successfully',
      data: {
        baseRate: baseCommissionRate,
        adjustedRate,
        baseCommission: commissionAmount,
        performanceBonus,
        totalCommission,
        customerTier,
        customerVolume,
      },
    };
  }

  /**
   * Validate agent hierarchy changes
   */
  public static validateHierarchyChange(
    agent: Fire22Agent,
    newParentId?: string,
    newLevel?: number
  ): BusinessRuleResult {
    const errors: string[] = [];

    // Level validation
    if (newLevel !== undefined) {
      if (newLevel < 1 || newLevel > 8) {
        errors.push('Agent level must be between 1-8');
      }

      // Master agents must be level 5 or higher
      if (agent.agent_type === 'master_agent' && newLevel < 5) {
        errors.push('Master agents must be level 5 or higher');
      }
    }

    // Parent validation
    if (newParentId) {
      // Cannot be parent of self
      if (newParentId === agent.agent_id) {
        errors.push('Agent cannot be parent of itself');
      }

      // Level hierarchy validation would require parent lookup
      // This would be implemented with actual database access
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Hierarchy change validation passed',
    };
  }

  // !== SYSTEM BUSINESS RULES !==

  /**
   * Validate system limits
   */
  public static validateSystemLimits(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // This would check system-wide limits
    // Implementation would require database queries for current counts

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Apply automatic business rules
   */
  public static async applyAutomaticRules(
    triggeredBy: 'deposit' | 'withdrawal' | 'bet' | 'login',
    customerId: string,
    data?: any
  ): Promise<BusinessRuleResult[]> {
    const results: BusinessRuleResult[] = [];

    try {
      // Get customer data
      const customerResult = await customerRepository.findByFire22Id(customerId);
      if (!customerResult.success || !customerResult.data) {
        return [
          {
            success: false,
            message: 'Customer not found for automatic rules',
          },
        ];
      }

      const customer = customerResult.data;

      // Apply tier upgrade check
      const tierUpgrade = this.calculateTierUpgrade(customer);
      if (tierUpgrade.eligible) {
        results.push({
          success: true,
          message: `Customer eligible for tier upgrade to ${tierUpgrade.newTier}`,
          data: tierUpgrade,
          requiresApproval: true,
          approvalLevel: 'manager',
        });
      }

      // Apply risk assessment
      const riskAssessment = this.assessCustomerRisk(customer);
      if (riskAssessment.requiresReview) {
        results.push({
          success: true,
          message: `Customer requires risk review: ${riskAssessment.riskLevel} risk`,
          data: riskAssessment,
          requiresApproval: true,
          approvalLevel: riskAssessment.riskLevel === 'critical' ? 'admin' : 'manager',
        });
      }

      // Apply trigger-specific rules
      switch (triggeredBy) {
        case 'deposit':
          if (data?.amount >= 10000) {
            results.push({
              success: true,
              message: 'Large deposit detected - enhanced monitoring applied',
              requiresApproval: true,
              approvalLevel: 'manager',
            });
          }
          break;

        case 'bet':
          if (data?.amount >= 5000) {
            results.push({
              success: true,
              message: 'Large bet detected - manual review required',
              requiresApproval: true,
              approvalLevel: 'manager',
            });
          }
          break;
      }

      return results;
    } catch (error) {
      return [
        {
          success: false,
          message: `Failed to apply automatic rules: ${error.message}`,
        },
      ];
    }
  }

  // !== UTILITY METHODS !==

  /**
   * Format currency for display
   */
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Calculate percentage change
   */
  public static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Generate business rule summary
   */
  public static generateBusinessRuleSummary(customer: Fire22Customer): string {
    const tierUpgrade = this.calculateTierUpgrade(customer);
    const riskAssessment = this.assessCustomerRisk(customer);

    const summary: string[] = [];

    summary.push(`Customer: ${customer.login}`);
    summary.push(
      `Tier: ${customer.tier}${tierUpgrade.eligible ? ` (eligible for ${tierUpgrade.newTier})` : ''}`
    );
    summary.push(`Risk Level: ${riskAssessment.riskLevel} (${riskAssessment.riskScore}/100)`);
    summary.push(`Balance: ${this.formatCurrency(customer.balance)}`);
    summary.push(`Lifetime Volume: ${this.formatCurrency(customer.lifetime_volume)}`);

    if (riskAssessment.requiresReview) {
      summary.push('⚠️ Requires manual review');
    }

    return summary.join(' | ');
  }
}

export default Fire22BusinessLogic;
