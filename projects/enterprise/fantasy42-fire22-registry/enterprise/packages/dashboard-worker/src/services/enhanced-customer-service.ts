/**
 * 🔥 Fire22 Enhanced Customer Service
 * Integration of customer types, service tiers, and dynamic fee system
 */

import { Customer, CustomerType, PaymentMethod } from '../types/customer-types';
import { CustomerServiceProfile, ServiceTier } from '../types/service-tiers';
import { DynamicConfigManager } from '../config/dynamic-config';
import { ServiceTierManager } from './service-tier-manager';
import { CustomerService } from './customer-service';

export interface EnhancedTransactionCalculation {
  originalAmount: number;

  // Base fee calculation
  baseFee: number;
  baseFeeBreakdown: any[];

  // Customer type adjustments
  customerTypeAdjustment: number;
  customerTypeRate: number;

  // Service tier benefits
  tierDiscount: number;
  tierDiscountPercentage: number;
  tierName: string;

  // Final amounts
  totalFee: number;
  netAmount: number;
  effectiveFeeRate: number;

  // Detailed breakdown
  fullBreakdown: FeeBreakdownItem[];

  // Applied configurations
  appliedConfigs: string[];
  appliedTierBenefits: string[];
}

export interface FeeBreakdownItem {
  category: 'base_fee' | 'customer_type' | 'service_tier' | 'payment_method' | 'special';
  name: string;
  description: string;
  amount: number;
  percentage?: number;
  calculation: string;
}

export interface CustomerUpgradeEligibility {
  currentTier: ServiceTier;
  nextTierAvailable: ServiceTier | null;
  canUpgrade: boolean;
  requirements: {
    met: string[];
    missing: string[];
    progress: {
      volume: number;
      transactions: number;
      timeRemaining: number;
    };
  };
  estimatedUpgradeDate: Date | null;
  benefits: string[];
}

export class EnhancedCustomerService {
  private configManager = DynamicConfigManager.getInstance();
  private tierManager = ServiceTierManager.getInstance();

  /**
   * Calculate transaction fee with full integration of customer type, service tier, and dynamic config
   */
  public async calculateEnhancedTransactionFee(
    customer: Customer,
    serviceProfile: CustomerServiceProfile,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionType: 'deposit' | 'withdrawal' | 'p2p_transfer'
  ): Promise<EnhancedTransactionCalculation> {
    // Step 1: Calculate base dynamic fee
    const baseFeeCalculation = this.configManager.calculateTransactionFee({
      amount,
      customerType: customer.type,
      paymentMethod,
      transactionType,
      customerVolume: customer.lifetimeVolume,
    });

    // Step 2: Apply customer type adjustments
    const customerTypeAdjustment = CustomerService.calculateCommission(
      customer,
      amount,
      paymentMethod
    );

    // Step 3: Apply service tier benefits
    const tierBenefits = this.tierManager.getTierConfig(serviceProfile.currentTier).benefits;
    const tierDiscount = baseFeeCalculation.totalFee * tierBenefits.feeDiscountPercentage;

    // Step 4: Calculate final amounts
    const totalFee = Math.max(0, baseFeeCalculation.totalFee - tierDiscount);
    const netAmount = amount - totalFee;
    const effectiveFeeRate = (totalFee / amount) * 100;

    // Step 5: Build detailed breakdown
    const fullBreakdown: FeeBreakdownItem[] = [];

    // Add base fees
    baseFeeCalculation.breakdown.forEach(item => {
      fullBreakdown.push({
        category: 'base_fee',
        name: item.configName,
        description: item.configName,
        amount: item.amount,
        percentage: item.basePercentage * 100,
        calculation: item.calculation,
      });
    });

    // Add customer type adjustment
    if (customerTypeAdjustment.commissionAmount > 0) {
      fullBreakdown.push({
        category: 'customer_type',
        name: 'Customer Type Commission',
        description: `${customer.type.toUpperCase()} customer commission rate`,
        amount: customerTypeAdjustment.commissionAmount,
        percentage: customerTypeAdjustment.totalRate * 100,
        calculation: `${amount} × ${(customerTypeAdjustment.totalRate * 100).toFixed(2)}% = $${customerTypeAdjustment.commissionAmount.toFixed(2)}`,
      });
    }

    // Add service tier discount
    if (tierDiscount > 0) {
      const tierConfig = this.tierManager.getTierConfig(serviceProfile.currentTier);
      fullBreakdown.push({
        category: 'service_tier',
        name: `${tierConfig.name} Discount`,
        description: `Service tier ${serviceProfile.currentTier} fee discount`,
        amount: -tierDiscount,
        percentage: -tierBenefits.feeDiscountPercentage * 100,
        calculation: `${baseFeeCalculation.totalFee.toFixed(2)} × ${(tierBenefits.feeDiscountPercentage * 100).toFixed(1)}% = -$${tierDiscount.toFixed(2)}`,
      });
    }

    // Collect applied configurations and benefits
    const appliedTierBenefits: string[] = [];
    if (tierDiscount > 0) {
      appliedTierBenefits.push(
        `${(tierBenefits.feeDiscountPercentage * 100).toFixed(1)}% tier discount`
      );
    }
    if (tierBenefits.fastTrackApproval) {
      appliedTierBenefits.push('Fast-track approval');
    }
    if (tierBenefits.skipManualReview) {
      appliedTierBenefits.push('Skip manual review');
    }

    return {
      originalAmount: amount,
      baseFee: baseFeeCalculation.totalFee,
      baseFeeBreakdown: baseFeeCalculation.breakdown,
      customerTypeAdjustment: customerTypeAdjustment.commissionAmount,
      customerTypeRate: customerTypeAdjustment.totalRate,
      tierDiscount,
      tierDiscountPercentage: tierBenefits.feeDiscountPercentage,
      tierName: this.tierManager.getTierConfig(serviceProfile.currentTier).name,
      totalFee,
      netAmount,
      effectiveFeeRate,
      fullBreakdown,
      appliedConfigs: baseFeeCalculation.appliedConfigs,
      appliedTierBenefits,
    };
  }

  /**
   * Check customer upgrade eligibility with detailed progress
   */
  public checkUpgradeEligibility(
    customer: Customer,
    serviceProfile: CustomerServiceProfile
  ): CustomerUpgradeEligibility {
    const currentTier = serviceProfile.currentTier;
    const nextTier = currentTier === ServiceTier.TIER_3 ? null : ((currentTier + 1) as ServiceTier);

    if (!nextTier) {
      return {
        currentTier,
        nextTierAvailable: null,
        canUpgrade: false,
        requirements: {
          met: [],
          missing: [],
          progress: { volume: 100, transactions: 100, timeRemaining: 0 },
        },
        estimatedUpgradeDate: null,
        benefits: [],
      };
    }

    const nextTierConfig = this.tierManager.getTierConfig(nextTier);
    const requirements = nextTierConfig.requirements;
    const currentPeriod = serviceProfile.currentPeriod;

    const met: string[] = [];
    const missing: string[] = [];

    // Check lifetime volume
    if (currentPeriod.lifetimeVolume >= requirements.minLifetimeVolume) {
      met.push(`Lifetime volume: $${currentPeriod.lifetimeVolume.toLocaleString()}`);
    } else {
      const needed = requirements.minLifetimeVolume - currentPeriod.lifetimeVolume;
      missing.push(`Need $${needed.toLocaleString()} more lifetime volume`);
    }

    // Check monthly volume
    if (currentPeriod.monthlyVolume >= requirements.minMonthlyVolume) {
      met.push(`Monthly volume: $${currentPeriod.monthlyVolume.toLocaleString()}`);
    } else {
      const needed = requirements.minMonthlyVolume - currentPeriod.monthlyVolume;
      missing.push(`Need $${needed.toLocaleString()} more monthly volume`);
    }

    // Check transaction count
    if (currentPeriod.transactionCount >= requirements.minTransactionCount) {
      met.push(`Transaction count: ${currentPeriod.transactionCount}`);
    } else {
      const needed = requirements.minTransactionCount - currentPeriod.transactionCount;
      missing.push(`Need ${needed} more transactions`);
    }

    // Check account age
    if (currentPeriod.accountAgeDays >= requirements.minAccountAge) {
      met.push(`Account age: ${currentPeriod.accountAgeDays} days`);
    } else {
      const needed = requirements.minAccountAge - currentPeriod.accountAgeDays;
      missing.push(`Need ${needed} more days`);
    }

    // Check verification
    if (requirements.requiresVerification) {
      if (customer.isVerified) {
        met.push('Account verified');
      } else {
        missing.push('Account verification required');
      }
    }

    // Check referrals
    if (requirements.requiresReferrals) {
      if (currentPeriod.referralCount >= requirements.requiresReferrals) {
        met.push(`Referrals: ${currentPeriod.referralCount}`);
      } else {
        const needed = requirements.requiresReferrals - currentPeriod.referralCount;
        missing.push(`Need ${needed} more referrals`);
      }
    }

    // Calculate progress
    const volumeProgress = Math.min(
      100,
      (currentPeriod.lifetimeVolume / requirements.minLifetimeVolume) * 100
    );
    const transactionProgress = Math.min(
      100,
      (currentPeriod.transactionCount / requirements.minTransactionCount) * 100
    );
    const timeRemaining = Math.max(0, requirements.minAccountAge - currentPeriod.accountAgeDays);

    // Estimate upgrade date
    let estimatedUpgradeDate: Date | null = null;
    if (missing.length === 0) {
      estimatedUpgradeDate = new Date();
    } else if (timeRemaining === 0) {
      // Only volume/transaction requirements remaining
      const monthsNeeded = Math.max(
        (requirements.minLifetimeVolume - currentPeriod.lifetimeVolume) /
          Math.max(currentPeriod.monthlyVolume, 1000),
        (requirements.minTransactionCount - currentPeriod.transactionCount) /
          Math.max(currentPeriod.transactionCount / 30, 1)
      );

      if (monthsNeeded < 24) {
        estimatedUpgradeDate = new Date();
        estimatedUpgradeDate.setMonth(estimatedUpgradeDate.getMonth() + Math.ceil(monthsNeeded));
      }
    }

    // Get benefits of next tier
    const benefits = this.tierManager.getTierBenefits(nextTier);

    return {
      currentTier,
      nextTierAvailable: nextTier,
      canUpgrade: missing.length === 0,
      requirements: {
        met,
        missing,
        progress: {
          volume: volumeProgress,
          transactions: transactionProgress,
          timeRemaining,
        },
      },
      estimatedUpgradeDate,
      benefits: benefits.map(b => b.description),
    };
  }

  /**
   * Get customer's complete service summary
   */
  public getCustomerServiceSummary(
    customer: Customer,
    serviceProfile: CustomerServiceProfile
  ): {
    customer: {
      name: string;
      type: string;
      tier: number;
      tierName: string;
      verified: boolean;
      lifetimeVolume: number;
    };
    currentBenefits: Array<{ category: string; benefit: string; description: string }>;
    upgradeEligibility: CustomerUpgradeEligibility;
    recentActivity: {
      monthlyVolume: number;
      transactionCount: number;
      failedTransactions: number;
    };
    serviceMetrics: {
      satisfactionScore: number;
      averageResponseTime: number;
      issuesResolved: number;
    };
  } {
    const tierConfig = this.tierManager.getTierConfig(serviceProfile.currentTier);
    const currentBenefits = this.tierManager.getTierBenefits(serviceProfile.currentTier);
    const upgradeEligibility = this.checkUpgradeEligibility(customer, serviceProfile);

    return {
      customer: {
        name: customer.username,
        type: customer.type,
        tier: serviceProfile.currentTier,
        tierName: tierConfig.name,
        verified: customer.isVerified,
        lifetimeVolume: customer.lifetimeVolume,
      },
      currentBenefits,
      upgradeEligibility,
      recentActivity: {
        monthlyVolume: serviceProfile.currentPeriod.monthlyVolume,
        transactionCount: serviceProfile.currentPeriod.transactionCount,
        failedTransactions: serviceProfile.currentPeriod.failedTransactions,
      },
      serviceMetrics: serviceProfile.serviceMetrics,
    };
  }

  /**
   * Process automatic tier reviews for all customers
   */
  public async processAutomaticTierReviews(): Promise<{
    customersReviewed: number;
    upgradesProcessed: number;
    downgradesProcessed: number;
    notificationsSent: number;
  }> {
    // This would typically fetch customers from database
    // For now, return a summary structure

    const summary = {
      customersReviewed: 0,
      upgradesProcessed: 0,
      downgradesProcessed: 0,
      notificationsSent: 0,
    };

    // In a real implementation:
    // 1. Fetch customers who need tier review
    // 2. Process each customer's tier change
    // 3. Send upgrade/downgrade notifications
    // 4. Update customer records
    // 5. Log all changes for audit

    return summary;
  }

  /**
   * Generate tier comparison chart
   */
  public generateTierComparison(): Array<{
    feature: string;
    tier1: string;
    tier2: string;
    tier3: string;
    category: string;
  }> {
    const tier1 = this.tierManager.getTierConfig(ServiceTier.TIER_1);
    const tier2 = this.tierManager.getTierConfig(ServiceTier.TIER_2);
    const tier3 = this.tierManager.getTierConfig(ServiceTier.TIER_3);

    return [
      {
        feature: 'Support Response Time',
        tier1: tier1.benefits.supportResponseTime,
        tier2: tier2.benefits.supportResponseTime,
        tier3: tier3.benefits.supportResponseTime,
        category: 'Support',
      },
      {
        feature: 'Fee Discount',
        tier1: '0%',
        tier2: `${(tier2.benefits.feeDiscountPercentage * 100).toFixed(1)}%`,
        tier3: `${(tier3.benefits.feeDiscountPercentage * 100).toFixed(1)}%`,
        category: 'Fees',
      },
      {
        feature: 'Transaction Limits',
        tier1: '1x (Standard)',
        tier2: `${tier2.benefits.limitMultiplier}x`,
        tier3: `${tier3.benefits.limitMultiplier}x`,
        category: 'Limits',
      },
      {
        feature: 'Priority Queue',
        tier1: tier1.benefits.priorityQueue ? '✅' : '❌',
        tier2: tier2.benefits.priorityQueue ? '✅' : '❌',
        tier3: tier3.benefits.priorityQueue ? '✅' : '❌',
        category: 'Support',
      },
      {
        feature: 'Personal Manager',
        tier1: tier1.benefits.personalAccountManager ? '✅' : '❌',
        tier2: tier2.benefits.personalAccountManager ? '✅' : '❌',
        tier3: tier3.benefits.personalAccountManager ? '✅' : '❌',
        category: 'Support',
      },
      {
        feature: 'Monthly Bonus',
        tier1: `$${tier1.benefits.monthlyBonus}`,
        tier2: `$${tier2.benefits.monthlyBonus}`,
        tier3: `$${tier3.benefits.monthlyBonus}`,
        category: 'Rewards',
      },
      {
        feature: 'API Access',
        tier1: tier1.benefits.apiAccess ? '✅' : '❌',
        tier2: tier2.benefits.apiAccess ? '✅' : '❌',
        tier3: tier3.benefits.apiAccess ? '✅' : '❌',
        category: 'Features',
      },
      {
        feature: 'Beta Features',
        tier1: tier1.benefits.betaFeatureAccess ? '✅' : '❌',
        tier2: tier2.benefits.betaFeatureAccess ? '✅' : '❌',
        tier3: tier3.benefits.betaFeatureAccess ? '✅' : '❌',
        category: 'Features',
      },
    ];
  }
}

export default EnhancedCustomerService;
