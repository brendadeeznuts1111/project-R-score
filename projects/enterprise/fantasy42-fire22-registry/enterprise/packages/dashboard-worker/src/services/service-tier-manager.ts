/**
 * 🔥 Fire22 Service Tier Manager
 * Automatic tier calculation, upgrades, and benefit management
 */

import {
  ServiceTier,
  ServiceTierConfig,
  CustomerServiceProfile,
  TierHistoryEntry,
  TierUpgradeNotification,
  TierBusinessRules,
} from '../types/service-tiers';

import {
  SERVICE_TIER_CONSTANTS,
  TIER_BUSINESS_RULES,
  TIER_UPGRADE_MESSAGES,
  TIER_DOWNGRADE_WARNINGS,
} from '../constants/service-tier-constants';

import { Customer } from '../types/customer-types';
import { DynamicConfigManager } from '../config/dynamic-config';

export class ServiceTierManager {
  private static instance: ServiceTierManager;
  private configManager = DynamicConfigManager.getInstance();

  private constructor() {}

  public static getInstance(): ServiceTierManager {
    if (!ServiceTierManager.instance) {
      ServiceTierManager.instance = new ServiceTierManager();
    }
    return ServiceTierManager.instance;
  }

  /**
   * Calculate the appropriate service tier for a customer
   */
  public calculateTier(customer: Customer, serviceProfile: CustomerServiceProfile): ServiceTier {
    // Check each tier from highest to lowest
    const tiers = [ServiceTier.TIER_3, ServiceTier.TIER_2, ServiceTier.TIER_1];

    for (const tier of tiers) {
      if (this.meetsRequirements(customer, serviceProfile, tier)) {
        return tier;
      }
    }

    // Default to Tier 1 if no requirements met (shouldn't happen)
    return ServiceTier.TIER_1;
  }

  /**
   * Check if customer meets requirements for a specific tier
   */
  public meetsRequirements(
    customer: Customer,
    serviceProfile: CustomerServiceProfile,
    targetTier: ServiceTier
  ): boolean {
    const tierConfig = SERVICE_TIER_CONSTANTS[targetTier];
    const requirements = tierConfig.requirements;
    const currentPeriod = serviceProfile.currentPeriod;

    // Check excluded customer types
    if (requirements.excludedCustomerTypes?.includes(customer.type)) {
      return false;
    }

    // Check lifetime volume
    if (currentPeriod.lifetimeVolume < requirements.minLifetimeVolume) {
      return false;
    }

    // Check monthly volume
    if (currentPeriod.monthlyVolume < requirements.minMonthlyVolume) {
      return false;
    }

    // Check transaction count
    if (currentPeriod.transactionCount < requirements.minTransactionCount) {
      return false;
    }

    // Check account age
    if (currentPeriod.accountAgeDays < requirements.minAccountAge) {
      return false;
    }

    // Check failed transactions
    if (currentPeriod.failedTransactions > requirements.maxFailedTransactions) {
      return false;
    }

    // Check verification requirement
    if (requirements.requiresVerification && !customer.isVerified) {
      return false;
    }

    // Check referral requirement
    if (
      requirements.requiresReferrals &&
      currentPeriod.referralCount < requirements.requiresReferrals
    ) {
      return false;
    }

    // Check if customer is suspended or banned
    if (customer.isSuspended || customer.type === 'banned') {
      return false;
    }

    return true;
  }

  /**
   * Process tier upgrade/downgrade for a customer
   */
  public async processTierChange(
    customerId: string,
    customer: Customer,
    serviceProfile: CustomerServiceProfile
  ): Promise<{
    tierChanged: boolean;
    oldTier: ServiceTier;
    newTier: ServiceTier;
    notification?: TierUpgradeNotification;
    benefits: string[];
  }> {
    const oldTier = serviceProfile.currentTier;
    const newTier = this.calculateTier(customer, serviceProfile);

    if (oldTier === newTier) {
      return {
        tierChanged: false,
        oldTier,
        newTier,
        benefits: [],
      };
    }

    // Create tier history entry
    const historyEntry: TierHistoryEntry = {
      fromTier: oldTier,
      toTier: newTier,
      changeDate: new Date(),
      changeReason:
        newTier > oldTier
          ? 'Automatic upgrade based on activity'
          : 'Automatic downgrade due to inactivity',
      triggerMetrics: {
        lifetimeVolume: serviceProfile.currentPeriod.lifetimeVolume,
        monthlyVolume: serviceProfile.currentPeriod.monthlyVolume,
        transactionCount: serviceProfile.currentPeriod.transactionCount,
        accountAge: serviceProfile.currentPeriod.accountAgeDays,
      },
    };

    // Update service profile
    serviceProfile.currentTier = newTier;
    serviceProfile.tierHistory.push(historyEntry);
    serviceProfile.updatedAt = new Date();

    // Calculate next tier progress
    serviceProfile.nextTierProgress = this.calculateNextTierProgress(customer, serviceProfile);

    // Get benefits
    const benefits = this.getTierBenefits(newTier);

    // Create notification for upgrades
    let notification: TierUpgradeNotification | undefined;
    if (newTier > oldTier && TIER_UPGRADE_MESSAGES[newTier]) {
      notification = {
        customerId,
        fromTier: oldTier,
        toTier: newTier,
        benefits: benefits.map(b => b.description),
        celebrationMessage: TIER_UPGRADE_MESSAGES[newTier].message,
        telegramMessage: TIER_UPGRADE_MESSAGES[newTier].telegramMessage.replace(
          '{customerName}',
          customer.username
        ),
        emailTemplate: TIER_UPGRADE_MESSAGES[newTier].message,
      };
    }

    return {
      tierChanged: true,
      oldTier,
      newTier,
      notification,
      benefits: benefits.map(b => b.description),
    };
  }

  /**
   * Get tier configuration
   */
  public getTierConfig(tier: ServiceTier): ServiceTierConfig {
    return SERVICE_TIER_CONSTANTS[tier];
  }

  /**
   * Get all tier benefits for display
   */
  public getTierBenefits(tier: ServiceTier): Array<{
    category: string;
    benefit: string;
    description: string;
    value?: string;
  }> {
    const config = SERVICE_TIER_CONSTANTS[tier];
    const benefits = config.benefits;
    const result = [];

    // Support Benefits
    result.push({
      category: 'Support',
      benefit: 'Response Time',
      description: `${benefits.supportResponseTime} response time`,
      value: benefits.supportResponseTime,
    });

    if (benefits.priorityQueue) {
      result.push({
        category: 'Support',
        benefit: 'Priority Queue',
        description: 'Skip the line with priority support queue',
      });
    }

    if (benefits.dedicatedSupport) {
      result.push({
        category: 'Support',
        benefit: 'Dedicated Support',
        description: 'Personal dedicated support representative',
      });
    }

    if (benefits.personalAccountManager) {
      result.push({
        category: 'Support',
        benefit: 'Account Manager',
        description: 'Personal account manager for white-glove service',
      });
    }

    // Transaction Benefits
    if (benefits.feeDiscountPercentage > 0) {
      result.push({
        category: 'Fees',
        benefit: 'Fee Discount',
        description: `Additional ${(benefits.feeDiscountPercentage * 100).toFixed(1)}% discount on all fees`,
        value: `${(benefits.feeDiscountPercentage * 100).toFixed(1)}%`,
      });
    }

    if (benefits.higherLimits) {
      result.push({
        category: 'Limits',
        benefit: 'Higher Limits',
        description: `${benefits.limitMultiplier}x higher transaction limits`,
        value: `${benefits.limitMultiplier}x`,
      });
    }

    if (benefits.fastTrackApproval) {
      result.push({
        category: 'Processing',
        benefit: 'Fast Track',
        description: 'Fast-track approval for transactions',
      });
    }

    if (benefits.skipManualReview) {
      result.push({
        category: 'Processing',
        benefit: 'Auto Approval',
        description: 'Skip manual review for most transactions',
      });
    }

    // Feature Benefits
    if (benefits.betaFeatureAccess) {
      result.push({
        category: 'Features',
        benefit: 'Beta Access',
        description: 'Early access to new features and tools',
      });
    }

    if (benefits.apiAccess) {
      result.push({
        category: 'Features',
        benefit: 'API Access',
        description: 'Full programmatic API access',
      });
    }

    if (benefits.bulkTransactionSupport) {
      result.push({
        category: 'Features',
        benefit: 'Bulk Transactions',
        description: 'Support for bulk transaction processing',
      });
    }

    // Communication Benefits
    if (benefits.telegram.privateSupportGroup) {
      result.push({
        category: 'Communication',
        benefit: 'Private Support Group',
        description: 'Access to exclusive Telegram support group',
      });
    }

    if (benefits.telegram.directMessageSupport) {
      result.push({
        category: 'Communication',
        benefit: 'Direct Messaging',
        description: 'Direct message support via Telegram',
      });
    }

    // Rewards
    if (benefits.monthlyBonus > 0) {
      result.push({
        category: 'Rewards',
        benefit: 'Monthly Bonus',
        description: `$${benefits.monthlyBonus} monthly bonus`,
        value: `$${benefits.monthlyBonus}`,
      });
    }

    if (benefits.loyaltyPointsMultiplier > 1) {
      result.push({
        category: 'Rewards',
        benefit: 'Loyalty Points',
        description: `${benefits.loyaltyPointsMultiplier}x loyalty points multiplier`,
        value: `${benefits.loyaltyPointsMultiplier}x`,
      });
    }

    if (benefits.exclusiveEvents) {
      result.push({
        category: 'Rewards',
        benefit: 'Exclusive Events',
        description: 'Invitations to exclusive customer events',
      });
    }

    if (benefits.birthdayRewards) {
      result.push({
        category: 'Rewards',
        benefit: 'Birthday Rewards',
        description: 'Special birthday bonuses and gifts',
      });
    }

    if (benefits.anniversaryRewards) {
      result.push({
        category: 'Rewards',
        benefit: 'Anniversary Rewards',
        description: 'Account anniversary celebration rewards',
      });
    }

    return result;
  }

  /**
   * Calculate next tier progress
   */
  public calculateNextTierProgress(
    customer: Customer,
    serviceProfile: CustomerServiceProfile
  ): CustomerServiceProfile['nextTierProgress'] {
    const currentTier = serviceProfile.currentTier;
    const nextTier = currentTier === ServiceTier.TIER_3 ? null : ((currentTier + 1) as ServiceTier);

    if (!nextTier) {
      return {
        targetTier: null,
        volumeProgress: 100,
        transactionProgress: 100,
        timeProgress: 100,
        missingRequirements: [],
        estimatedUpgradeDate: null,
      };
    }

    const nextTierConfig = SERVICE_TIER_CONSTANTS[nextTier];
    const requirements = nextTierConfig.requirements;
    const currentPeriod = serviceProfile.currentPeriod;

    // Calculate progress percentages
    const volumeProgress = Math.min(
      100,
      (currentPeriod.lifetimeVolume / requirements.minLifetimeVolume) * 100
    );

    const transactionProgress = Math.min(
      100,
      (currentPeriod.transactionCount / requirements.minTransactionCount) * 100
    );

    const timeProgress = Math.min(
      100,
      (currentPeriod.accountAgeDays / requirements.minAccountAge) * 100
    );

    // Find missing requirements
    const missingRequirements: string[] = [];

    if (currentPeriod.lifetimeVolume < requirements.minLifetimeVolume) {
      const needed = requirements.minLifetimeVolume - currentPeriod.lifetimeVolume;
      missingRequirements.push(`Need $${needed.toLocaleString()} more lifetime volume`);
    }

    if (currentPeriod.monthlyVolume < requirements.minMonthlyVolume) {
      const needed = requirements.minMonthlyVolume - currentPeriod.monthlyVolume;
      missingRequirements.push(`Need $${needed.toLocaleString()} more monthly volume`);
    }

    if (currentPeriod.transactionCount < requirements.minTransactionCount) {
      const needed = requirements.minTransactionCount - currentPeriod.transactionCount;
      missingRequirements.push(`Need ${needed} more transactions`);
    }

    if (currentPeriod.accountAgeDays < requirements.minAccountAge) {
      const needed = requirements.minAccountAge - currentPeriod.accountAgeDays;
      missingRequirements.push(`Need ${needed} more days account age`);
    }

    if (requirements.requiresVerification && !customer.isVerified) {
      missingRequirements.push('Account verification required');
    }

    if (
      requirements.requiresReferrals &&
      currentPeriod.referralCount < requirements.requiresReferrals
    ) {
      const needed = requirements.requiresReferrals - currentPeriod.referralCount;
      missingRequirements.push(`Need ${needed} more referrals`);
    }

    // Estimate upgrade date based on current activity
    let estimatedUpgradeDate: Date | null = null;
    if (missingRequirements.length === 0) {
      estimatedUpgradeDate = new Date(); // Can upgrade now
    } else {
      // Simple estimation based on current monthly volume
      const monthsNeeded = Math.max(
        (requirements.minLifetimeVolume - currentPeriod.lifetimeVolume) /
          Math.max(currentPeriod.monthlyVolume, 1000),
        (requirements.minAccountAge - currentPeriod.accountAgeDays) / 30
      );

      if (monthsNeeded < 12) {
        // Only estimate if less than a year
        estimatedUpgradeDate = new Date();
        estimatedUpgradeDate.setMonth(estimatedUpgradeDate.getMonth() + Math.ceil(monthsNeeded));
      }
    }

    return {
      targetTier: nextTier,
      volumeProgress,
      transactionProgress,
      timeProgress,
      missingRequirements,
      estimatedUpgradeDate,
    };
  }

  /**
   * Apply tier benefits to fee calculation
   */
  public applyTierBenefits(baseCalculation: any, serviceProfile: CustomerServiceProfile): any {
    const tierConfig = SERVICE_TIER_CONSTANTS[serviceProfile.currentTier];
    const benefits = tierConfig.benefits;

    // Apply fee discount
    if (benefits.feeDiscountPercentage > 0) {
      const discount = baseCalculation.totalFee * benefits.feeDiscountPercentage;
      const newFee = baseCalculation.totalFee - discount;

      return {
        ...baseCalculation,
        totalFee: newFee,
        netAmount: baseCalculation.originalAmount - newFee,
        tierDiscount: discount,
        tierDiscountPercentage: benefits.feeDiscountPercentage,
        breakdown: [
          ...baseCalculation.breakdown,
          {
            configId: `tier_${serviceProfile.currentTier}_discount`,
            configName: `${tierConfig.name} Tier Discount`,
            basePercentage: -benefits.feeDiscountPercentage,
            fixedFee: 0,
            amount: -discount,
            calculation: `Tier ${serviceProfile.currentTier} discount: -${(benefits.feeDiscountPercentage * 100).toFixed(1)}%`,
          },
        ],
      };
    }

    return baseCalculation;
  }

  /**
   * Check if customer needs tier review
   */
  public needsTierReview(serviceProfile: CustomerServiceProfile): boolean {
    const daysSinceLastReview = Math.floor(
      (Date.now() - serviceProfile.currentPeriod.lastTierReview.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastReview >= TIER_BUSINESS_RULES.reviewFrequencyDays;
  }

  /**
   * Generate tier upgrade notification for Telegram
   */
  public generateTelegramTierNotification(notification: TierUpgradeNotification): string {
    const tierConfig = SERVICE_TIER_CONSTANTS[notification.toTier];
    const upgradeMessage = TIER_UPGRADE_MESSAGES[notification.toTier];

    if (!upgradeMessage) {
      return `🎉 Congratulations! You've been upgraded to ${tierConfig.name}!`;
    }

    return upgradeMessage.telegramMessage;
  }

  /**
   * Get tier requirements summary
   */
  public getTierRequirements(tier: ServiceTier): string[] {
    const config = SERVICE_TIER_CONSTANTS[tier];
    const req = config.requirements;
    const requirements: string[] = [];

    if (req.minLifetimeVolume > 0) {
      requirements.push(`$${req.minLifetimeVolume.toLocaleString()} lifetime volume`);
    }

    if (req.minMonthlyVolume > 0) {
      requirements.push(`$${req.minMonthlyVolume.toLocaleString()} monthly volume`);
    }

    if (req.minTransactionCount > 0) {
      requirements.push(`${req.minTransactionCount} transactions`);
    }

    if (req.minAccountAge > 0) {
      requirements.push(`${req.minAccountAge} days account age`);
    }

    if (req.requiresVerification) {
      requirements.push('Account verification');
    }

    if (req.requiresReferrals) {
      requirements.push(`${req.requiresReferrals} referrals`);
    }

    return requirements;
  }
}

export default ServiceTierManager;
