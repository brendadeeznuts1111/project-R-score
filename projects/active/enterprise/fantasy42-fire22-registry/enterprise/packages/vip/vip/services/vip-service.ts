/**
 * VIP Service
 * Domain-Driven Design Implementation
 *
 * Business logic for VIP customer management, tier qualification, and benefits processing
 */

import { VipCustomer, VipCustomerStats, VipStatus } from '../entities/vip-customer';
import { VipTier, VipTierLevel } from '../value-objects/vip-tier';
import { VipCustomerRepository } from '../repositories/vip-customer-repository';
import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';

export interface VipQualificationRequest {
  customerId: string;
  stats: VipCustomerStats;
  requestedTier?: VipTierLevel;
}

export interface VipUpgradeRequest {
  customerId: string;
  targetTier: VipTierLevel;
  reason: string;
  approvedBy: string;
}

export interface VipBenefitsCalculation {
  monthlyCashback: number;
  depositBonus: number;
  effectiveBalanceLimit: number;
  availableBenefits: string[];
}

export class VipService {
  constructor(
    private repository: VipCustomerRepository,
    private eventPublisher: DomainEvents
  ) {}

  /**
   * Onboard a new VIP customer
   */
  async onboardVipCustomer(params: {
    customerId: string;
    initialTier: VipTierLevel;
    stats: VipCustomerStats;
    accountManagerId?: string;
    communicationPreferences?: any;
  }): Promise<VipCustomer> {
    try {
      // Validate initial tier qualification
      const requestedTier = this.getTierByLevel(params.initialTier);
      if (!requestedTier.isEligibleForUpgrade(params.stats)) {
        throw new DomainError(
          'Customer does not meet requirements for initial VIP tier',
          'INSUFFICIENT_QUALIFICATION'
        );
      }

      // Check if customer already exists
      const existingCustomer = await this.repository.findByCustomerId(params.customerId);
      if (existingCustomer) {
        throw new DomainError('Customer is already a VIP member', 'CUSTOMER_ALREADY_VIP');
      }

      // Create new VIP customer
      const vipCustomer = VipCustomer.create({
        customerId: params.customerId,
        initialTier: requestedTier,
        stats: params.stats,
        accountManagerId: params.accountManagerId,
        communicationPreferences: params.communicationPreferences,
      });

      await this.repository.save(vipCustomer);

      // Publish domain event
      await this.eventPublisher.publish('vip.customer.onboarded', {
        vipCustomerId: vipCustomer.getId(),
        customerId: params.customerId,
        tier: params.initialTier,
        accountManagerId: params.accountManagerId,
      });

      return vipCustomer;
    } catch (error) {
      console.error('❌ VIP Service: Failed to onboard VIP customer:', error);
      throw error;
    }
  }

  /**
   * Evaluate VIP qualification for existing or potential customers
   */
  async evaluateVipQualification(request: VipQualificationRequest): Promise<{
    isEligible: boolean;
    recommendedTier: VipTierLevel;
    qualificationDetails: any;
    nextSteps: string[];
  }> {
    try {
      const tiers = this.getAllTiers();
      let highestEligibleTier: VipTierLevel = 'bronze';
      const qualificationDetails: any = {};

      // Evaluate against each tier
      for (const tier of tiers) {
        const isEligible = tier.isEligibleForUpgrade(request.stats);
        qualificationDetails[tier.getLevel()] = {
          eligible: isEligible,
          requirements: tier.getRequirements(),
          customerStats: request.stats,
        };

        if (
          isEligible &&
          this.getTierOrder(tier.getLevel()) > this.getTierOrder(highestEligibleTier)
        ) {
          highestEligibleTier = tier.getLevel();
        }
      }

      // Determine recommended tier
      let recommendedTier = highestEligibleTier;
      if (
        request.requestedTier &&
        this.isTierHigherOrEqual(request.requestedTier, highestEligibleTier)
      ) {
        recommendedTier = request.requestedTier;
      }

      // Generate next steps
      const nextSteps = this.generateQualificationNextSteps(
        qualificationDetails,
        highestEligibleTier
      );

      return {
        isEligible: highestEligibleTier !== 'bronze',
        recommendedTier,
        qualificationDetails,
        nextSteps,
      };
    } catch (error) {
      console.error('❌ VIP Service: Failed to evaluate VIP qualification:', error);
      throw error;
    }
  }

  /**
   * Process VIP tier upgrade
   */
  async processVipUpgrade(request: VipUpgradeRequest): Promise<VipCustomer> {
    try {
      const vipCustomer = await this.repository.findByCustomerId(request.customerId);
      if (!vipCustomer) {
        throw new DomainError('VIP customer not found', 'VIP_CUSTOMER_NOT_FOUND');
      }

      if (!vipCustomer.isActive()) {
        throw new DomainError('VIP customer account is not active', 'VIP_CUSTOMER_INACTIVE');
      }

      const targetTier = this.getTierByLevel(request.targetTier);

      // Perform upgrade
      vipCustomer.upgradeTier(targetTier, request.reason, request.approvedBy);

      await this.repository.save(vipCustomer);

      // Publish domain event
      await this.eventPublisher.publish('vip.customer.upgraded', {
        vipCustomerId: vipCustomer.getId(),
        customerId: request.customerId,
        fromTier: vipCustomer.getUpgradeHistory().slice(-1)[0].fromTier,
        toTier: request.targetTier,
        upgradeBonus: targetTier.getUpgradeBonus(),
        approvedBy: request.approvedBy,
      });

      return vipCustomer;
    } catch (error) {
      console.error('❌ VIP Service: Failed to process VIP upgrade:', error);
      throw error;
    }
  }

  /**
   * Calculate VIP benefits for a customer
   */
  async calculateVipBenefits(
    customerId: string,
    baseBalanceLimit: number
  ): Promise<VipBenefitsCalculation> {
    try {
      const vipCustomer = await this.repository.findByCustomerId(customerId);
      if (!vipCustomer || !vipCustomer.canReceiveBenefits()) {
        return {
          monthlyCashback: 0,
          depositBonus: 0,
          effectiveBalanceLimit: baseBalanceLimit,
          availableBenefits: [],
        };
      }

      const tier = vipCustomer.getCurrentTier();
      const benefits = tier.getBenefits();
      const stats = vipCustomer.getStats();

      const monthlyCashback = tier.calculateMonthlyCashback(stats.monthlyDeposits);
      const effectiveBalanceLimit = tier.getEffectiveBalanceLimit(baseBalanceLimit);

      // Determine available benefits
      const availableBenefits: string[] = [];
      if (benefits.dedicatedAccountManager) availableBenefits.push('Dedicated Account Manager');
      if (benefits.prioritySupport) availableBenefits.push('Priority Support');
      if (benefits.exclusiveEventsAccess) availableBenefits.push('Exclusive Events Access');
      if (benefits.freeSpinsMonthly > 0)
        availableBenefits.push(`${benefits.freeSpinsMonthly} Free Spins Monthly`);
      if (benefits.personalizedNewsletters) availableBenefits.push('Personalized Newsletters');
      if (benefits.directPhoneSupport) availableBenefits.push('Direct Phone Support');
      if (benefits.customBirthdayOffers) availableBenefits.push('Custom Birthday Offers');

      return {
        monthlyCashback,
        depositBonus: benefits.depositBonusRate * 100, // Convert to percentage
        effectiveBalanceLimit,
        availableBenefits,
      };
    } catch (error) {
      console.error('❌ VIP Service: Failed to calculate VIP benefits:', error);
      throw error;
    }
  }

  /**
   * Process monthly VIP maintenance and reviews
   */
  async processMonthlyVipMaintenance(): Promise<{
    reviewsCompleted: number;
    upgradesProcessed: number;
    downgradesProcessed: number;
    suspensionsProcessed: number;
  }> {
    try {
      const vipCustomers = await this.repository.findAllActive();
      let reviewsCompleted = 0;
      let upgradesProcessed = 0;
      let downgradesProcessed = 0;
      let suspensionsProcessed = 0;

      for (const vipCustomer of vipCustomers) {
        try {
          // Check if review is needed
          if (vipCustomer.needsReview()) {
            await this.performVipReview(vipCustomer);
            reviewsCompleted++;
          }

          // Check maintenance criteria
          const currentTier = vipCustomer.getCurrentTier();
          const stats = vipCustomer.getStats();

          if (!currentTier.meetsMaintenanceCriteria(stats)) {
            // Determine appropriate action
            const qualification = await this.evaluateVipQualification({
              customerId: vipCustomer.getCustomerId(),
              stats,
            });

            if (qualification.recommendedTier !== currentTier.getLevel()) {
              const tierOrder = this.getTierOrder(qualification.recommendedTier);
              const currentOrder = this.getTierOrder(currentTier.getLevel());

              if (tierOrder > currentOrder) {
                // Upgrade
                await this.processVipUpgrade({
                  customerId: vipCustomer.getCustomerId(),
                  targetTier: qualification.recommendedTier,
                  reason: 'Maintenance review upgrade',
                  approvedBy: 'system',
                });
                upgradesProcessed++;
              } else if (tierOrder < currentOrder - 1) {
                // Downgrade only if significantly below
                const downgradeTier = this.getTierByLevel(qualification.recommendedTier);
                vipCustomer.downgradeTier(downgradeTier, 'Maintenance review downgrade', 'system');
                await this.repository.save(vipCustomer);
                downgradesProcessed++;
              }
            }
          }

          // Process birthday bonuses
          if (this.isBirthdayMonth(vipCustomer.getStats().lastActivityDate)) {
            vipCustomer.awardBirthdayBonus();
            await this.repository.save(vipCustomer);
          }
        } catch (error) {
          console.error(
            `❌ VIP Service: Error processing VIP customer ${vipCustomer.getId()}:`,
            error
          );
        }
      }

      return {
        reviewsCompleted,
        upgradesProcessed,
        downgradesProcessed,
        suspensionsProcessed,
      };
    } catch (error) {
      console.error('❌ VIP Service: Failed to process monthly VIP maintenance:', error);
      throw error;
    }
  }

  /**
   * Get VIP analytics and reporting data
   */
  async getVipAnalytics(): Promise<{
    totalVipCustomers: number;
    tierDistribution: Record<VipTierLevel, number>;
    revenueByTier: Record<VipTierLevel, number>;
    benefitsUtilization: any;
    churnRate: number;
    averageLifetimeValue: number;
  }> {
    try {
      const vipCustomers = await this.repository.findAll();

      const tierDistribution: Record<VipTierLevel, number> = {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        diamond: 0,
      };

      let totalRevenue = 0;
      let totalBenefitsUtilization = 0;

      for (const customer of vipCustomers) {
        const tier = customer.getCurrentTier().getLevel();
        tierDistribution[tier]++;

        // Calculate revenue (simplified - would include deposits, winnings, etc.)
        const stats = customer.getStats();
        totalRevenue += stats.totalDeposits + stats.totalWinnings;

        // Calculate benefits utilization
        const benefits = customer.getBenefitsTracking();
        totalBenefitsUtilization += Object.values(benefits).reduce((sum, val) => sum + val, 0);
      }

      return {
        totalVipCustomers: vipCustomers.length,
        tierDistribution,
        revenueByTier: tierDistribution, // Simplified - would calculate actual revenue per tier
        benefitsUtilization: {
          totalUtilization: totalBenefitsUtilization,
          averageUtilizationPerCustomer: totalBenefitsUtilization / vipCustomers.length,
        },
        churnRate: 0.05, // Would calculate from actual data
        averageLifetimeValue: totalRevenue / vipCustomers.length,
      };
    } catch (error) {
      console.error('❌ VIP Service: Failed to get VIP analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private getTierByLevel(level: VipTierLevel): VipTier {
    const tierMap = {
      bronze: VipTier.bronze(),
      silver: VipTier.silver(),
      gold: VipTier.gold(),
      platinum: VipTier.platinum(),
      diamond: VipTier.diamond(),
    };
    return tierMap[level];
  }

  private getAllTiers(): VipTier[] {
    return [
      VipTier.bronze(),
      VipTier.silver(),
      VipTier.gold(),
      VipTier.platinum(),
      VipTier.diamond(),
    ];
  }

  private getTierOrder(level: VipTierLevel): number {
    const order = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 };
    return order[level];
  }

  private isTierHigherOrEqual(tier1: VipTierLevel, tier2: VipTierLevel): boolean {
    return this.getTierOrder(tier1) >= this.getTierOrder(tier2);
  }

  private generateQualificationNextSteps(
    details: any,
    highestEligibleTier: VipTierLevel
  ): string[] {
    const nextSteps: string[] = [];

    if (highestEligibleTier === 'bronze') {
      nextSteps.push('Increase deposit amount to $500+');
      nextSteps.push('Build betting volume to $1,000+');
      nextSteps.push('Maintain active account for 30+ days');
    } else {
      nextSteps.push(`Apply for ${highestEligibleTier} VIP tier`);
      nextSteps.push('Schedule consultation with account manager');
    }

    return nextSteps;
  }

  private async performVipReview(vipCustomer: VipCustomer): Promise<void> {
    // In a real implementation, this would involve more complex review logic
    // For now, we'll just update the next review date
    vipCustomer.updateStats({}); // Trigger status update
    await this.repository.save(vipCustomer);
  }

  private isBirthdayMonth(lastActivity: Date): boolean {
    const now = new Date();
    // Simplified birthday check - would use actual customer birthday
    return now.getMonth() === lastActivity.getMonth();
  }
}
