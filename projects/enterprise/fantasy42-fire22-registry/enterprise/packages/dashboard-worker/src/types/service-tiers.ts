/**
 * 🔥 Fire22 Customer Service Tier System
 * 3-tier service level system with configurable benefits and requirements
 */

export enum ServiceTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}

export interface ServiceTierConfig {
  tier: ServiceTier;
  name: string;
  description: string;

  // Requirements to achieve this tier
  requirements: {
    minLifetimeVolume: number;
    minMonthlyVolume: number;
    minTransactionCount: number;
    minAccountAge: number; // days
    maxFailedTransactions: number;
    requiresVerification: boolean;
    requiresReferrals?: number;
    excludedCustomerTypes?: string[];
  };

  // Service Level Benefits
  benefits: {
    // Response Times
    supportResponseTime: string; // e.g., "4-8 hours"
    supportResponseTimeMinutes: number; // for SLA tracking
    priorityQueue: boolean;
    dedicatedSupport: boolean;

    // Transaction Benefits
    feeDiscountPercentage: number; // Additional discount on all fees
    higherLimits: boolean;
    limitMultiplier: number; // Multiply base limits by this
    fastTrackApproval: boolean;
    skipManualReview: boolean;

    // Features & Access
    betaFeatureAccess: boolean;
    customPaymentMethods: boolean;
    bulkTransactionSupport: boolean;
    apiAccess: boolean;
    whiteGloveService: boolean;
    personalAccountManager: boolean;

    // Communication
    telegram: {
      privateSupportGroup: boolean;
      directMessageSupport: boolean;
      priorityNotifications: boolean;
      customNotifications: boolean;
    };

    // Rewards & Recognition
    monthlyBonus: number; // Fixed bonus amount
    loyaltyPointsMultiplier: number;
    exclusiveEvents: boolean;
    birthdayRewards: boolean;
    anniversaryRewards: boolean;
  };

  // Visual Identity
  display: {
    badge: string;
    color: string;
    icon: string;
    backgroundGradient: string;
  };

  // SLA Commitments
  sla: {
    uptime: number; // 99.9%
    supportResponseTime: number; // minutes
    transactionProcessingTime: number; // minutes
    issueResolutionTime: number; // hours
    escalationTime: number; // minutes
  };

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CustomerServiceProfile {
  customerId: string;
  currentTier: ServiceTier;

  // Tier History
  tierHistory: TierHistoryEntry[];

  // Current Period Metrics (for tier calculation)
  currentPeriod: {
    startDate: Date;
    lifetimeVolume: number;
    monthlyVolume: number;
    transactionCount: number;
    failedTransactions: number;
    accountAgeDays: number;
    referralCount: number;
    lastTierReview: Date;
  };

  // Service Quality Metrics
  serviceMetrics: {
    averageResponseTime: number; // minutes
    satisfactionScore: number; // 1-5
    issuesResolved: number;
    escalationsCount: number;
    complimentsReceived: number;
    complaintsReceived: number;
  };

  // Benefits Utilization
  benefitsUsed: {
    feeDiscountUsed: number; // total amount saved
    prioritySupportUsed: number; // times used
    fastTrackUsed: number; // times used
    betaFeaturesAccessed: string[];
    personalManagerInteractions: number;
  };

  // Next Tier Progress
  nextTierProgress: {
    targetTier: ServiceTier | null;
    volumeProgress: number; // percentage
    transactionProgress: number; // percentage
    timeProgress: number; // percentage
    missingRequirements: string[];
    estimatedUpgradeDate: Date | null;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface TierHistoryEntry {
  fromTier: ServiceTier | null;
  toTier: ServiceTier;
  changeDate: Date;
  changeReason: string;
  triggerMetrics: any;
  approvedBy?: string;
  notes?: string;
}

export interface TierUpgradeNotification {
  customerId: string;
  fromTier: ServiceTier;
  toTier: ServiceTier;
  benefits: string[];
  celebrationMessage: string;
  telegramMessage: string;
  emailTemplate: string;
}

// Service Tier Business Rules
export interface TierBusinessRules {
  // Automatic tier review frequency
  reviewFrequencyDays: number;

  // Grace periods before downgrade
  downgradePeriods: {
    [ServiceTier.TIER_3]: number; // days
    [ServiceTier.TIER_2]: number;
    [ServiceTier.TIER_1]: number;
  };

  // Override rules
  manualOverrideAllowed: boolean;
  manualOverrideRequiresApproval: boolean;
  manualOverrideMaxTier: ServiceTier;

  // Suspension rules
  suspendTierOnRisk: boolean;
  suspendTierOnComplaints: number; // threshold

  // Special promotions
  promotionalTierUpgrades: {
    enabled: boolean;
    campaignName?: string;
    temporaryTier?: ServiceTier;
    duration?: number; // days
    criteria?: any;
  };
}
