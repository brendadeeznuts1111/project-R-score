/**
 * VIP Tier Value Object
 * Domain-Driven Design Implementation
 *
 * Defines VIP membership tiers with associated benefits and requirements
 */

import { ValueObject } from '../../shared/value-object';

export type VipTierLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface VipTierBenefits {
  // Financial Benefits
  balanceLimitMultiplier: number;
  withdrawalFeeDiscount: number;
  depositBonusRate: number;
  monthlyCashbackRate: number;

  // Service Benefits
  dedicatedAccountManager: boolean;
  prioritySupport: boolean;
  exclusiveEventsAccess: boolean;
  birthdayBonus: number;

  // Gaming Benefits
  bonusWagerMultiplier: number;
  freeSpinsMonthly: number;
  exclusiveGamesAccess: boolean;
  tournamentEntryFeeDiscount: number;

  // Communication Benefits
  personalizedNewsletters: boolean;
  exclusivePromotions: boolean;
  directPhoneSupport: boolean;
  customBirthdayOffers: boolean;
}

export interface VipTierRequirements {
  // Qualification Criteria
  minDepositAmount: number;
  minBettingVolume: number;
  minAccountAgeDays: number;
  minLoyaltyPoints: number;

  // Maintenance Criteria
  monthlyDepositRequirement: number;
  monthlyBettingVolume: number;
  accountActivityScore: number;
}

export class VipTier extends ValueObject {
  private constructor(
    private readonly level: VipTierLevel,
    private readonly name: string,
    private readonly benefits: VipTierBenefits,
    private readonly requirements: VipTierRequirements,
    private readonly monthlyFee: number,
    private readonly upgradeBonus: number,
    private readonly isActive: boolean = true
  ) {
    super();
    this.validateTier();
  }

  static create(params: {
    level: VipTierLevel;
    name: string;
    benefits: VipTierBenefits;
    requirements: VipTierRequirements;
    monthlyFee: number;
    upgradeBonus: number;
    isActive?: boolean;
  }): VipTier {
    return new VipTier(
      params.level,
      params.name,
      params.benefits,
      params.requirements,
      params.monthlyFee,
      params.upgradeBonus,
      params.isActive ?? true
    );
  }

  // Predefined VIP Tiers
  static bronze(): VipTier {
    return new VipTier(
      'bronze',
      'Bronze VIP',
      {
        balanceLimitMultiplier: 1.5,
        withdrawalFeeDiscount: 0.1,
        depositBonusRate: 0.02,
        monthlyCashbackRate: 0.005,
        dedicatedAccountManager: false,
        prioritySupport: false,
        exclusiveEventsAccess: false,
        birthdayBonus: 25,
        bonusWagerMultiplier: 1.1,
        freeSpinsMonthly: 10,
        exclusiveGamesAccess: false,
        tournamentEntryFeeDiscount: 0.05,
        personalizedNewsletters: false,
        exclusivePromotions: true,
        directPhoneSupport: false,
        customBirthdayOffers: false,
      },
      {
        minDepositAmount: 500,
        minBettingVolume: 1000,
        minAccountAgeDays: 30,
        minLoyaltyPoints: 100,
        monthlyDepositRequirement: 200,
        monthlyBettingVolume: 500,
        accountActivityScore: 50,
      },
      0, // No monthly fee
      50 // Upgrade bonus
    );
  }

  static silver(): VipTier {
    return new VipTier(
      'silver',
      'Silver VIP',
      {
        balanceLimitMultiplier: 2.0,
        withdrawalFeeDiscount: 0.25,
        depositBonusRate: 0.05,
        monthlyCashbackRate: 0.01,
        dedicatedAccountManager: false,
        prioritySupport: true,
        exclusiveEventsAccess: false,
        birthdayBonus: 75,
        bonusWagerMultiplier: 1.25,
        freeSpinsMonthly: 25,
        exclusiveGamesAccess: false,
        tournamentEntryFeeDiscount: 0.1,
        personalizedNewsletters: true,
        exclusivePromotions: true,
        directPhoneSupport: false,
        customBirthdayOffers: false,
      },
      {
        minDepositAmount: 2500,
        minBettingVolume: 5000,
        minAccountAgeDays: 90,
        minLoyaltyPoints: 500,
        monthlyDepositRequirement: 500,
        monthlyBettingVolume: 1500,
        accountActivityScore: 70,
      },
      0,
      150
    );
  }

  static gold(): VipTier {
    return new VipTier(
      'gold',
      'Gold VIP',
      {
        balanceLimitMultiplier: 3.0,
        withdrawalFeeDiscount: 0.5,
        depositBonusRate: 0.1,
        monthlyCashbackRate: 0.025,
        dedicatedAccountManager: true,
        prioritySupport: true,
        exclusiveEventsAccess: true,
        birthdayBonus: 200,
        bonusWagerMultiplier: 1.5,
        freeSpinsMonthly: 50,
        exclusiveGamesAccess: true,
        tournamentEntryFeeDiscount: 0.25,
        personalizedNewsletters: true,
        exclusivePromotions: true,
        directPhoneSupport: true,
        customBirthdayOffers: true,
      },
      {
        minDepositAmount: 10000,
        minBettingVolume: 25000,
        minAccountAgeDays: 180,
        minLoyaltyPoints: 2500,
        monthlyDepositRequirement: 2000,
        monthlyBettingVolume: 5000,
        accountActivityScore: 85,
      },
      0,
      500
    );
  }

  static platinum(): VipTier {
    return new VipTier(
      'platinum',
      'Platinum VIP',
      {
        balanceLimitMultiplier: 5.0,
        withdrawalFeeDiscount: 0.75,
        depositBonusRate: 0.15,
        monthlyCashbackRate: 0.05,
        dedicatedAccountManager: true,
        prioritySupport: true,
        exclusiveEventsAccess: true,
        birthdayBonus: 500,
        bonusWagerMultiplier: 2.0,
        freeSpinsMonthly: 100,
        exclusiveGamesAccess: true,
        tournamentEntryFeeDiscount: 0.5,
        personalizedNewsletters: true,
        exclusivePromotions: true,
        directPhoneSupport: true,
        customBirthdayOffers: true,
      },
      {
        minDepositAmount: 50000,
        minBettingVolume: 100000,
        minAccountAgeDays: 365,
        minLoyaltyPoints: 10000,
        monthlyDepositRequirement: 10000,
        monthlyBettingVolume: 25000,
        accountActivityScore: 95,
      },
      0,
      2000
    );
  }

  static diamond(): VipTier {
    return new VipTier(
      'diamond',
      'Diamond VIP',
      {
        balanceLimitMultiplier: 10.0,
        withdrawalFeeDiscount: 1.0, // 100% discount
        depositBonusRate: 0.25,
        monthlyCashbackRate: 0.1,
        dedicatedAccountManager: true,
        prioritySupport: true,
        exclusiveEventsAccess: true,
        birthdayBonus: 1000,
        bonusWagerMultiplier: 3.0,
        freeSpinsMonthly: 500,
        exclusiveGamesAccess: true,
        tournamentEntryFeeDiscount: 1.0, // 100% discount
        personalizedNewsletters: true,
        exclusivePromotions: true,
        directPhoneSupport: true,
        customBirthdayOffers: true,
      },
      {
        minDepositAmount: 250000,
        minBettingVolume: 500000,
        minAccountAgeDays: 730,
        minLoyaltyPoints: 50000,
        monthlyDepositRequirement: 50000,
        monthlyBettingVolume: 100000,
        accountActivityScore: 99,
      },
      0,
      10000
    );
  }

  private validateTier(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('VIP tier name cannot be empty');
    }

    if (this.monthlyFee < 0) {
      throw new Error('Monthly fee cannot be negative');
    }

    if (this.upgradeBonus < 0) {
      throw new Error('Upgrade bonus cannot be negative');
    }

    // Validate benefits ranges
    if (this.benefits.balanceLimitMultiplier <= 0) {
      throw new Error('Balance limit multiplier must be positive');
    }

    if (this.benefits.withdrawalFeeDiscount < 0 || this.benefits.withdrawalFeeDiscount > 1) {
      throw new Error('Withdrawal fee discount must be between 0 and 1');
    }
  }

  // Business methods
  canUpgradeTo(nextTier: VipTier): boolean {
    return this.getTierOrder(this.level) < this.getTierOrder(nextTier.level);
  }

  canDowngradeTo(previousTier: VipTier): boolean {
    return this.getTierOrder(this.level) > this.getTierOrder(previousTier.level);
  }

  getUpgradeBonus(): number {
    return this.upgradeBonus;
  }

  calculateMonthlyCashback(amount: number): number {
    return amount * this.benefits.monthlyCashbackRate;
  }

  calculateDepositBonus(amount: number): number {
    return amount * this.benefits.depositBonusRate;
  }

  getEffectiveBalanceLimit(baseLimit: number): number {
    return baseLimit * this.benefits.balanceLimitMultiplier;
  }

  getEffectiveWithdrawalFee(baseFee: number): number {
    return baseFee * (1 - this.benefits.withdrawalFeeDiscount);
  }

  private getTierOrder(level: VipTierLevel): number {
    const order = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 };
    return order[level];
  }

  // Getters
  getLevel(): VipTierLevel {
    return this.level;
  }
  getName(): string {
    return this.name;
  }
  getBenefits(): VipTierBenefits {
    return { ...this.benefits };
  }
  getRequirements(): VipTierRequirements {
    return { ...this.requirements };
  }
  getMonthlyFee(): number {
    return this.monthlyFee;
  }
  getIsActive(): boolean {
    return this.isActive;
  }

  // Business rules
  isEligibleForUpgrade(customerStats: {
    totalDeposits: number;
    totalBettingVolume: number;
    accountAgeDays: number;
    loyaltyPoints: number;
    monthlyDeposits: number;
    monthlyBettingVolume: number;
    activityScore: number;
  }): boolean {
    const reqs = this.requirements;

    return (
      customerStats.totalDeposits >= reqs.minDepositAmount &&
      customerStats.totalBettingVolume >= reqs.minBettingVolume &&
      customerStats.accountAgeDays >= reqs.minAccountAgeDays &&
      customerStats.loyaltyPoints >= reqs.minLoyaltyPoints &&
      customerStats.monthlyDeposits >= reqs.monthlyDepositRequirement &&
      customerStats.monthlyBettingVolume >= reqs.monthlyBettingVolume &&
      customerStats.activityScore >= reqs.accountActivityScore
    );
  }

  meetsMaintenanceCriteria(customerStats: {
    monthlyDeposits: number;
    monthlyBettingVolume: number;
    activityScore: number;
  }): boolean {
    const reqs = this.requirements;

    return (
      customerStats.monthlyDeposits >= reqs.monthlyDepositRequirement &&
      customerStats.monthlyBettingVolume >= reqs.monthlyBettingVolume &&
      customerStats.activityScore >= reqs.accountActivityScore
    );
  }

  // Value object equality
  equals(other: ValueObject): boolean {
    if (!(other instanceof VipTier)) return false;

    return (
      this.level === other.level &&
      this.name === other.name &&
      this.monthlyFee === other.monthlyFee &&
      this.upgradeBonus === other.upgradeBonus &&
      this.isActive === other.isActive &&
      JSON.stringify(this.benefits) === JSON.stringify(other.benefits) &&
      JSON.stringify(this.requirements) === JSON.stringify(other.requirements)
    );
  }

  toString(): string {
    return `${this.name} (${this.level})`;
  }
}
