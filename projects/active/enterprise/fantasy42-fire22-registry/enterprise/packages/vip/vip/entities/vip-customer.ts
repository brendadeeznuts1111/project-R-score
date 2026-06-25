/**
 * VIP Customer Entity
 * Domain-Driven Design Implementation
 *
 * Represents a VIP customer with their tier, benefits, and management
 */

import { DomainEntity } from '../../shared/domain-entity';
import { VipTier, VipTierLevel } from '../value-objects/vip-tier';
import { DomainError } from '../../shared/domain-entity';

export type VipStatus = 'active' | 'inactive' | 'suspended' | 'pending_review';
export type VipQualificationStatus = 'qualified' | 'not_qualified' | 'pending' | 'expired';

export interface VipCustomerStats {
  totalDeposits: number;
  totalBettingVolume: number;
  totalWinnings: number;
  accountAgeDays: number;
  loyaltyPoints: number;
  monthlyDeposits: number;
  monthlyBettingVolume: number;
  activityScore: number;
  lastActivityDate: Date;
}

export interface VipBenefitsTracking {
  monthlyCashbackEarned: number;
  bonusWagerMultiplierUsed: number;
  freeSpinsUsed: number;
  birthdayBonusReceived: number;
  exclusiveEventsAttended: number;
  personalizedOffersRedeemed: number;
}

export class VipCustomer extends DomainEntity {
  private constructor(
    id: string,
    private readonly customerId: string,
    private currentTier: VipTier,
    private status: VipStatus,
    private qualificationStatus: VipQualificationStatus,
    private stats: VipCustomerStats,
    private benefitsTracking: VipBenefitsTracking,
    private readonly accountManagerId?: string,
    private communicationPreferences: VipCommunicationPreferences,
    private upgradeHistory: VipTierUpgrade[],
    private reviewHistory: VipReview[],
    private nextReviewDate?: Date,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(params: {
    customerId: string;
    initialTier: VipTier;
    stats: VipCustomerStats;
    accountManagerId?: string;
    communicationPreferences?: Partial<VipCommunicationPreferences>;
  }): VipCustomer {
    const now = new Date();
    const defaultPrefs: VipCommunicationPreferences = {
      emailMarketing: true,
      smsMarketing: false,
      personalizedNewsletters: true,
      exclusivePromotions: true,
      birthdayNotifications: true,
      accountManagerUpdates: true,
      eventInvitations: true,
      preferredLanguage: 'en',
      preferredContactTime: 'business_hours',
    };

    return new VipCustomer(
      crypto.randomUUID(),
      params.customerId,
      params.initialTier,
      'active',
      'qualified',
      params.stats,
      {
        monthlyCashbackEarned: 0,
        bonusWagerMultiplierUsed: 0,
        freeSpinsUsed: 0,
        birthdayBonusReceived: 0,
        exclusiveEventsAttended: 0,
        personalizedOffersRedeemed: 0,
      },
      params.accountManagerId,
      { ...defaultPrefs, ...params.communicationPreferences },
      [],
      [],
      this.calculateNextReviewDate(now),
      now,
      now
    );
  }

  // Business methods
  upgradeTier(newTier: VipTier, reason: string, approvedBy: string): void {
    if (!this.currentTier.canUpgradeTo(newTier)) {
      throw new DomainError('Cannot upgrade to lower or same tier', 'INVALID_TIER_UPGRADE');
    }

    if (!this.isEligibleForTier(newTier)) {
      throw new DomainError(
        'Customer does not meet requirements for this tier',
        'INSUFFICIENT_QUALIFICATION'
      );
    }

    const upgrade: VipTierUpgrade = {
      id: crypto.randomUUID(),
      fromTier: this.currentTier.getLevel(),
      toTier: newTier.getLevel(),
      upgradeDate: new Date(),
      reason,
      approvedBy,
      bonusAwarded: newTier.getUpgradeBonus(),
    };

    this.upgradeHistory.push(upgrade);
    this.currentTier = newTier;
    this.nextReviewDate = this.calculateNextReviewDate(new Date());

    // Award upgrade bonus
    this.awardUpgradeBonus(newTier.getUpgradeBonus());

    this.markAsModified();
  }

  downgradeTier(newTier: VipTier, reason: string, approvedBy: string): void {
    if (!this.currentTier.canDowngradeTo(newTier)) {
      throw new DomainError('Cannot downgrade to higher or same tier', 'INVALID_TIER_DOWNGRADE');
    }

    const downgrade: VipTierUpgrade = {
      id: crypto.randomUUID(),
      fromTier: this.currentTier.getLevel(),
      toTier: newTier.getLevel(),
      upgradeDate: new Date(),
      reason,
      approvedBy,
      bonusAwarded: 0,
    };

    this.upgradeHistory.push(downgrade);
    this.currentTier = newTier;
    this.nextReviewDate = this.calculateNextReviewDate(new Date());

    this.markAsModified();
  }

  suspend(reason: string, suspendedBy: string): void {
    this.status = 'suspended';

    const review: VipReview = {
      id: crypto.randomUUID(),
      reviewType: 'suspension',
      reviewDate: new Date(),
      reviewerId: suspendedBy,
      decision: 'suspended',
      reason,
      notes: `Account suspended: ${reason}`,
    };

    this.reviewHistory.push(review);
    this.markAsModified();
  }

  reactivate(reactivatedBy: string): void {
    if (this.status !== 'suspended') {
      throw new DomainError(
        'Only suspended accounts can be reactivated',
        'INVALID_STATUS_TRANSITION'
      );
    }

    this.status = 'active';

    const review: VipReview = {
      id: crypto.randomUUID(),
      reviewType: 'reactivation',
      reviewDate: new Date(),
      reviewerId: reactivatedBy,
      decision: 'reactivated',
      reason: 'Account reactivation',
      notes: 'Account reactivated from suspended status',
    };

    this.reviewHistory.push(review);
    this.markAsModified();
  }

  updateStats(newStats: Partial<VipCustomerStats>): void {
    this.stats = { ...this.stats, ...newStats };

    // Recalculate qualification status
    this.updateQualificationStatus();

    this.markAsModified();
  }

  trackBenefitUsage(benefit: keyof VipBenefitsTracking, amount: number): void {
    this.benefitsTracking[benefit] += amount;
    this.markAsModified();
  }

  awardBirthdayBonus(): void {
    const birthdayBonus = this.currentTier.getBenefits().birthdayBonus;
    if (birthdayBonus > 0) {
      this.trackBenefitUsage('birthdayBonusReceived', birthdayBonus);
      // Note: Actual bonus awarding would be handled by balance domain
    }
  }

  updateCommunicationPreferences(preferences: Partial<VipCommunicationPreferences>): void {
    this.communicationPreferences = {
      ...this.communicationPreferences,
      ...preferences,
    };
    this.markAsModified();
  }

  assignAccountManager(managerId: string, assignedBy: string): void {
    this.accountManagerId = managerId;

    const review: VipReview = {
      id: crypto.randomUUID(),
      reviewType: 'manager_assignment',
      reviewDate: new Date(),
      reviewerId: assignedBy,
      decision: 'assigned',
      reason: 'Account manager assignment',
      notes: `Assigned account manager: ${managerId}`,
    };

    this.reviewHistory.push(review);
    this.markAsModified();
  }

  // Helper methods
  private isEligibleForTier(tier: VipTier): boolean {
    return tier.isEligibleForUpgrade(this.stats);
  }

  private updateQualificationStatus(): void {
    if (this.currentTier.meetsMaintenanceCriteria(this.stats)) {
      this.qualificationStatus = 'qualified';
    } else if (
      this.stats.activityScore <
      this.currentTier.getRequirements().accountActivityScore * 0.8
    ) {
      this.qualificationStatus = 'pending_review';
    } else {
      this.qualificationStatus = 'not_qualified';
    }
  }

  private awardUpgradeBonus(amount: number): void {
    this.trackBenefitUsage('birthdayBonusReceived', amount);
    // Note: Actual bonus awarding would be handled by balance domain
  }

  private static calculateNextReviewDate(fromDate: Date): Date {
    const nextReview = new Date(fromDate);
    nextReview.setMonth(nextReview.getMonth() + 3); // Quarterly reviews
    return nextReview;
  }

  // Getters
  getCustomerId(): string {
    return this.customerId;
  }
  getCurrentTier(): VipTier {
    return this.currentTier;
  }
  getStatus(): VipStatus {
    return this.status;
  }
  getQualificationStatus(): VipQualificationStatus {
    return this.qualificationStatus;
  }
  getStats(): VipCustomerStats {
    return { ...this.stats };
  }
  getBenefitsTracking(): VipBenefitsTracking {
    return { ...this.benefitsTracking };
  }
  getAccountManagerId(): string | undefined {
    return this.accountManagerId;
  }
  getCommunicationPreferences(): VipCommunicationPreferences {
    return { ...this.communicationPreferences };
  }
  getUpgradeHistory(): VipTierUpgrade[] {
    return [...this.upgradeHistory];
  }
  getReviewHistory(): VipReview[] {
    return [...this.reviewHistory];
  }
  getNextReviewDate(): Date | undefined {
    return this.nextReviewDate;
  }

  // Business rules
  isActive(): boolean {
    return this.status === 'active';
  }

  isQualified(): boolean {
    return this.qualificationStatus === 'qualified' && this.isActive();
  }

  needsReview(): boolean {
    return this.nextReviewDate ? new Date() >= this.nextReviewDate : false;
  }

  canReceiveBenefits(): boolean {
    return this.isActive() && this.isQualified();
  }

  getMonthlyCashback(): number {
    return this.currentTier.calculateMonthlyCashback(this.stats.monthlyDeposits);
  }

  getEffectiveBalanceLimit(baseLimit: number): number {
    return this.currentTier.getEffectiveBalanceLimit(baseLimit);
  }

  toJSON(): any {
    return {
      id: this.getId(),
      customerId: this.customerId,
      currentTier: {
        level: this.currentTier.getLevel(),
        name: this.currentTier.getName(),
      },
      status: this.status,
      qualificationStatus: this.qualificationStatus,
      stats: this.stats,
      benefitsTracking: this.benefitsTracking,
      accountManagerId: this.accountManagerId,
      communicationPreferences: this.communicationPreferences,
      upgradeHistory: this.upgradeHistory,
      reviewHistory: this.reviewHistory,
      nextReviewDate: this.nextReviewDate?.toISOString(),
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}

// Supporting interfaces
export interface VipCommunicationPreferences {
  emailMarketing: boolean;
  smsMarketing: boolean;
  personalizedNewsletters: boolean;
  exclusivePromotions: boolean;
  birthdayNotifications: boolean;
  accountManagerUpdates: boolean;
  eventInvitations: boolean;
  preferredLanguage: string;
  preferredContactTime: 'anytime' | 'business_hours' | 'evenings';
}

export interface VipTierUpgrade {
  id: string;
  fromTier: VipTierLevel;
  toTier: VipTierLevel;
  upgradeDate: Date;
  reason: string;
  approvedBy: string;
  bonusAwarded: number;
}

export interface VipReview {
  id: string;
  reviewType:
    | 'annual'
    | 'upgrade'
    | 'downgrade'
    | 'suspension'
    | 'reactivation'
    | 'manager_assignment';
  reviewDate: Date;
  reviewerId: string;
  decision: 'approved' | 'denied' | 'suspended' | 'reactivated' | 'assigned' | 'maintained';
  reason: string;
  notes?: string;
}
