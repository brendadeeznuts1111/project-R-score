// barber-fusion-types.ts - Type Definitions for Account Age, Barber Action, Fusion Impact

// ==================== ACCOUNT AGE TIER ====================

/**
 * Account Age Classification
 * Determines how a customer's CashApp/account maturity affects their treatment
 */
export type AccountAgeTier =
  | 'new' // 0-7 days: First week, high scrutiny, nurture mode
  | 'recent' // 8-30 days: Building trust, test loyalty
  | 'growing' // 31-90 days: Proven customer, standard treatment
  | 'established' // 91-365 days: Regular, eligible for premium tiers
  | 'veteran'; // 365+ days: Loyal, whale/high-volume eligible

/**
 * Account Age Properties - Detailed column definitions
 */
export interface AccountAgeProperties {
  /** Unique tier identifier */
  tier: AccountAgeTier;

  /** Human-readable label */
  label: string;

  /** Day range [min, max] */
  dayRange: [number, number | null];

  /** Trust score multiplier (0-1) */
  trustMultiplier: number;

  /** Risk level assessment */
  riskLevel: 'high' | 'medium' | 'low' | 'minimal';

  /** CashApp daily send limit */
  cashappDailyLimit: number;

  /** CashApp weekly send limit */
  cashappWeeklyLimit: number;

  /** Can use instant deposit */
  instantDepositAvailable: boolean;

  /** Days to hold first transactions */
  holdPeriodDays: number;

  /** Visual indicator for dashboard */
  badge: string;

  /** CSS color for UI */
  color: string;
}

// Account Age Configurations
export const AccountAgeConfigs: Record<AccountAgeTier, AccountAgeProperties> = {
  new: {
    tier: 'new',
    label: 'New Account',
    dayRange: [0, 7],
    trustMultiplier: 0.3,
    riskLevel: 'high',
    cashappDailyLimit: 250,
    cashappWeeklyLimit: 1000,
    instantDepositAvailable: false,
    holdPeriodDays: 3,
    badge: '🆕',
    color: '#ff6b6b', // Red
  },
  recent: {
    tier: 'recent',
    label: 'Recent Account',
    dayRange: [8, 30],
    trustMultiplier: 0.5,
    riskLevel: 'medium',
    cashappDailyLimit: 500,
    cashappWeeklyLimit: 2500,
    instantDepositAvailable: true, // With 1.5% fee
    holdPeriodDays: 1,
    badge: '🌱',
    color: '#ffd93d', // Yellow
  },
  growing: {
    tier: 'growing',
    label: 'Growing Account',
    dayRange: [31, 90],
    trustMultiplier: 0.7,
    riskLevel: 'low',
    cashappDailyLimit: 1000,
    cashappWeeklyLimit: 5000,
    instantDepositAvailable: true,
    holdPeriodDays: 0,
    badge: '📈',
    color: '#6bcf7f', // Light green
  },
  established: {
    tier: 'established',
    label: 'Established Account',
    dayRange: [91, 365],
    trustMultiplier: 0.9,
    riskLevel: 'minimal',
    cashappDailyLimit: 2500,
    cashappWeeklyLimit: 10000,
    instantDepositAvailable: true, // Free
    holdPeriodDays: 0,
    badge: '✅',
    color: '#4ecdc4', // Teal
  },
  veteran: {
    tier: 'veteran',
    label: 'Veteran Account',
    dayRange: [366, null],
    trustMultiplier: 1.0,
    riskLevel: 'minimal',
    cashappDailyLimit: 7500,
    cashappWeeklyLimit: 25000,
    instantDepositAvailable: true,
    holdPeriodDays: 0,
    badge: '👑',
    color: '#a78bfa', // Purple
  },
};

// ==================== BARBER ACTION ====================

/**
 * Action Priority Level
 */
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low' | 'optional';

/**
 * Action Category
 */
export type ActionCategory =
  | 'verification' // Check payment, ID, etc
  | 'engagement' // Talk to customer, build rapport
  | 'retention' // Book next appointment, loyalty
  | 'upsell' // Sell products, premium services
  | 'referral' // Ask for referrals
  | 'documentation' // Notes, photos, feedback
  | 'risk'; // Fraud prevention, limits

/**
 * When to perform the action
 */
export type ActionTiming =
  | 'pre_service' // Before starting the cut
  | 'during_service' // While cutting
  | 'post_service' // After cut, before payment
  | 'at_checkout' // During payment
  | 'follow_up' // After they leave (1-7 days)
  | 'ongoing'; // Continuous

/**
 * Barber Action Properties - Detailed column definitions
 */
export interface BarberActionProperties {
  /** Unique action ID */
  id: string;

  /** Action name */
  name: string;

  /** What category this action belongs to */
  category: ActionCategory;

  /** Priority level */
  priority: ActionPriority;

  /** When to perform */
  timing: ActionTiming;

  /** Estimated time to complete (seconds) */
  durationSeconds: number;

  /** Script/barber should say this */
  script: string;

  /** Why this action matters */
  purpose: string;

  /** Expected outcome if successful */
  expectedOutcome: string;

  /** Success metric (how to measure) */
  successMetric: string;

  /** Automation possible? */
  canAutomate: boolean;

  /** Applies to which account ages */
  appliesTo: AccountAgeTier[];

  /** Applies to which fusion tiers */
  fusionTiers: ('casual' | 'active' | 'high_volume' | 'whale')[];

  /** Commission bonus for completing */
  commissionBonus: number;
}

// Predefined Barber Actions
export const BarberActions: Record<string, BarberActionProperties> = {
  verify_new_account: {
    id: 'verify_new_account',
    name: 'Verify New Account Payment',
    category: 'verification',
    priority: 'critical',
    timing: 'at_checkout',
    durationSeconds: 30,
    script:
      'I see this is your first CashApp payment with us. Just making sure everything came through okay on your end?',
    purpose: 'Prevent fraud, ensure payment cleared',
    expectedOutcome: 'Payment confirmed or alternative offered',
    successMetric: 'Zero chargebacks on new accounts',
    canAutomate: false,
    appliesTo: ['new', 'recent'],
    fusionTiers: ['casual', 'active', 'high_volume', 'whale'],
    commissionBonus: 0,
  },

  book_next_appointment: {
    id: 'book_next_appointment',
    name: 'Book Next Appointment',
    category: 'retention',
    priority: 'high',
    timing: 'post_service',
    durationSeconds: 60,
    script:
      "You're all set! Want to book your next appointment while you're here? I can text you the reminder.",
    purpose: 'Lock in return visit before they leave',
    expectedOutcome: 'Next appointment scheduled',
    successMetric: 'Rebooking rate > 70%',
    canAutomate: true,
    appliesTo: ['new', 'recent', 'growing', 'established', 'veteran'],
    fusionTiers: ['casual', 'active'],
    commissionBonus: 5,
  },

  ask_for_review: {
    id: 'ask_for_review',
    name: 'Ask for Google Review',
    category: 'referral',
    priority: 'medium',
    timing: 'follow_up',
    durationSeconds: 0, // Automated
    script:
      'Thanks for visiting! If you enjoyed your cut, would you mind leaving a quick review? [Link]',
    purpose: 'Build social proof for new customer acquisition',
    expectedOutcome: 'Review submitted within 48 hours',
    successMetric: 'New reviews per week',
    canAutomate: true,
    appliesTo: ['recent', 'growing', 'established', 'veteran'],
    fusionTiers: ['active', 'high_volume', 'whale'],
    commissionBonus: 10,
  },

  offer_referral_bonus: {
    id: 'offer_referral_bonus',
    name: 'Offer Referral Bonus',
    category: 'referral',
    priority: 'high',
    timing: 'post_service',
    durationSeconds: 20,
    script:
      'If you know anyone who needs a good cut, send them my way! You both get $10 off your next visit.',
    purpose: 'Acquire new customers through existing ones',
    expectedOutcome: 'Referral code shared',
    successMetric: 'Referrals per customer per quarter',
    canAutomate: false,
    appliesTo: ['growing', 'established', 'veteran'],
    fusionTiers: ['active', 'high_volume', 'whale'],
    commissionBonus: 10,
  },

  welcome_message: {
    id: 'welcome_message',
    name: 'Send Welcome Message',
    category: 'engagement',
    priority: 'high',
    timing: 'follow_up',
    durationSeconds: 0, // Automated
    script:
      'Welcome to [Barbershop]! Thanks for trusting us with your first cut. How did everything look?',
    purpose: 'Build relationship, catch issues early',
    expectedOutcome: 'Customer replies within 24 hours',
    successMetric: 'Response rate to welcome SMS',
    canAutomate: true,
    appliesTo: ['new'],
    fusionTiers: ['casual', 'active', 'high_volume', 'whale'],
    commissionBonus: 0,
  },

  suggest_products: {
    id: 'suggest_products',
    name: 'Suggest Hair Products',
    category: 'upsell',
    priority: 'medium',
    timing: 'during_service',
    durationSeconds: 45,
    script:
      'I noticed your hair is a bit dry. This pomade I use would help - want me to show you how to apply it?',
    purpose: 'Increase average transaction value',
    expectedOutcome: 'Product purchased',
    successMetric: 'Product attachment rate > 30%',
    canAutomate: false,
    appliesTo: ['growing', 'established', 'veteran'],
    fusionTiers: ['active', 'high_volume', 'whale'],
    commissionBonus: 15,
  },

  set_spending_limit: {
    id: 'set_spending_limit',
    name: 'Set Spending Limit Alert',
    category: 'risk',
    priority: 'critical',
    timing: 'at_checkout',
    durationSeconds: 15,
    script:
      'Just so you know, CashApp sometimes holds larger payments from new accounts. Want to split this into two?',
    purpose: 'Prevent payment failures',
    expectedOutcome: 'Payment succeeds',
    successMetric: 'Zero failed new account payments > $100',
    canAutomate: true,
    appliesTo: ['new'],
    fusionTiers: ['casual', 'active', 'high_volume', 'whale'],
    commissionBonus: 0,
  },
};

// ==================== FUSION IMPACT ====================

/**
 * Customer Value Tier
 */
export type FusionTier =
  | 'casual' // 1-2 visits, low spend
  | 'active' // 3+ visits, regular
  | 'high_volume' // Weekly+, brings friends
  | 'whale'; // Business/family accounts

/**
 * Impact Level
 */
export type ImpactLevel =
  | 'none' // No impact
  | 'minimal' // Slight adjustment
  | 'moderate' // Noticeable change
  | 'significant' // Major factor
  | 'critical'; // Dominates decision

/**
 * Fusion Impact Properties - Detailed column definitions
 */
export interface FusionImpactProperties {
  /** Fusion tier being described */
  tier: FusionTier;

  /** Human-readable name */
  label: string;

  /** Description of this tier */
  description: string;

  /** How new accounts impact this tier */
  newAccountImpact: {
    /** Severity of impact */
    level: ImpactLevel;
    /** Explanation */
    description: string;
    /** Can new accounts reach this tier immediately? */
    immediatelyEligible: boolean;
    /** Days minimum before eligible */
    minDaysRequired: number;
    /** Adjusted tier for new accounts */
    adjustedTier: FusionTier;
  };

  /** Revenue characteristics */
  revenueProfile: {
    /** Average transaction value */
    avgTransaction: number;
    /** Average tips */
    avgTip: number;
    /** Visit frequency (days between) */
    visitFrequency: number;
    /** Annual spend estimate */
    annualSpend: number;
  };

  /** Barber strategy for this tier */
  strategy: {
    /** Primary goal */
    goal: string;
    /** Key actions to take */
    actions: string[];
    /** Time investment per visit */
    timeInvestment: string;
    /** Perks to offer */
    perks: string[];
  };

  /** Retention tactics */
  retention: {
    /** Primary retention method */
    primaryTactic: string;
    /** Follow-up schedule */
    followUpDays: number[];
    /** Rebooking target */
    rebookingTarget: number;
  };

  /** Expected Lifetime Value */
  ltv: {
    /** 6-month value */
    sixMonth: number;
    /** 12-month value */
    oneYear: number;
    /** 24-month value */
    twoYear: number;
    /** Customer acquisition cost target */
    maxCAC: number;
  };

  /** Commission structure */
  commission: {
    /** Base commission rate */
    baseRate: number;
    /** Bonus for upsells */
    upsellBonus: number;
    /** Referral bonus */
    referralBonus: number;
    /** Product commission */
    productCommission: number;
  };

  /** Qualification criteria */
  qualification: {
    /** Minimum visits */
    minVisits: number;
    /** Minimum total spend */
    minSpend: number;
    /** Minimum visit frequency (days) */
    maxDaysBetween: number;
    /** Required behaviors */
    requiredBehaviors: string[];
  };
}

// Fusion Impact Configurations
export const FusionImpactConfigs: Record<FusionTier, FusionImpactProperties> = {
  casual: {
    tier: 'casual',
    label: 'Casual Customer',
    description: 'Occasional visitors, price-sensitive, trying out different barbers',
    newAccountImpact: {
      level: 'critical',
      description: 'All new accounts start here by default',
      immediatelyEligible: true,
      minDaysRequired: 0,
      adjustedTier: 'casual',
    },
    revenueProfile: {
      avgTransaction: 25,
      avgTip: 3,
      visitFrequency: 45, // Every 45 days
      annualSpend: 200,
    },
    strategy: {
      goal: 'Convert to regular customer',
      actions: ['Consistent service', 'Remember preferences', 'Book next visit'],
      timeInvestment: 'Standard time',
      perks: ['Loyalty card', 'Birthday discount'],
    },
    retention: {
      primaryTactic: 'Book next appointment before leaving',
      followUpDays: [7],
      rebookingTarget: 0.4, // 40% rebook
    },
    ltv: {
      sixMonth: 100,
      oneYear: 200,
      twoYear: 300,
      maxCAC: 25,
    },
    commission: {
      baseRate: 0.5,
      upsellBonus: 0.05,
      referralBonus: 5,
      productCommission: 0.15,
    },
    qualification: {
      minVisits: 1,
      minSpend: 0,
      maxDaysBetween: 90,
      requiredBehaviors: [],
    },
  },

  active: {
    tier: 'active',
    label: 'Active Regular',
    description: 'Consistent customers with preferred barber, reliable revenue',
    newAccountImpact: {
      level: 'significant',
      description: 'New accounts can reach this tier quickly with 3+ visits',
      immediatelyEligible: false,
      minDaysRequired: 14,
      adjustedTier: 'active', // New accounts capped here initially
    },
    revenueProfile: {
      avgTransaction: 35,
      avgTip: 7,
      visitFrequency: 14, // Every 2 weeks
      annualSpend: 900,
    },
    strategy: {
      goal: 'Increase frequency and spend',
      actions: ['Suggest weekly schedule', 'Recommend products', 'Upsell services'],
      timeInvestment: 'Extra attention',
      perks: ['Priority booking', '10% off products'],
    },
    retention: {
      primaryTactic: 'Standing weekly/bi-weekly appointment',
      followUpDays: [3, 14],
      rebookingTarget: 0.8,
    },
    ltv: {
      sixMonth: 450,
      oneYear: 900,
      twoYear: 1800,
      maxCAC: 75,
    },
    commission: {
      baseRate: 0.55,
      upsellBonus: 0.1,
      referralBonus: 10,
      productCommission: 0.2,
    },
    qualification: {
      minVisits: 3,
      minSpend: 100,
      maxDaysBetween: 21,
      requiredBehaviors: ['Rebooks within 21 days'],
    },
  },

  high_volume: {
    tier: 'high_volume',
    label: 'High Volume Client',
    description: 'Weekly visitors who bring friends, major revenue contributors',
    newAccountImpact: {
      level: 'moderate',
      description: 'Rare from new accounts, requires 30+ days to prove legitimacy',
      immediatelyEligible: false,
      minDaysRequired: 30,
      adjustedTier: 'active', // Capped until proven
    },
    revenueProfile: {
      avgTransaction: 45,
      avgTip: 12,
      visitFrequency: 7, // Weekly
      annualSpend: 2400,
    },
    strategy: {
      goal: 'Maintain loyalty, increase referrals',
      actions: ['VIP treatment', 'Occasional free add-ons', 'Referral program'],
      timeInvestment: 'Premium time',
      perks: ['Free neck trims', 'First pick of appointments', 'Free product samples'],
    },
    retention: {
      primaryTactic: 'Monthly subscription or package deal',
      followUpDays: [7, 30],
      rebookingTarget: 0.95,
    },
    ltv: {
      sixMonth: 1200,
      oneYear: 2400,
      twoYear: 5000,
      maxCAC: 200,
    },
    commission: {
      baseRate: 0.6,
      upsellBonus: 0.15,
      referralBonus: 20,
      productCommission: 0.25,
    },
    qualification: {
      minVisits: 12,
      minSpend: 500,
      maxDaysBetween: 10,
      requiredBehaviors: ['Weekly visits', 'Brings friends', 'Buys products'],
    },
  },

  whale: {
    tier: 'whale',
    label: 'Whale Account',
    description: 'Business accounts, family plans, or ultra-high-value individuals',
    newAccountImpact: {
      level: 'minimal',
      description: 'Almost never from new accounts, requires 90+ days minimum',
      immediatelyEligible: false,
      minDaysRequired: 90,
      adjustedTier: 'high_volume', // Maximum cap for new accounts
    },
    revenueProfile: {
      avgTransaction: 100,
      avgTip: 25,
      visitFrequency: 3, // Multiple bookings per week
      annualSpend: 10000,
    },
    strategy: {
      goal: 'Lifetime retention, exclusive service',
      actions: ['After-hours availability', 'House calls if needed', 'Personal relationship'],
      timeInvestment: 'Unlimited',
      perks: ['Dedicated barber', 'Private appointments', 'Complimentary services'],
    },
    retention: {
      primaryTactic: 'Personal relationship management',
      followUpDays: [1, 7, 30],
      rebookingTarget: 1.0,
    },
    ltv: {
      sixMonth: 5000,
      oneYear: 10000,
      twoYear: 25000,
      maxCAC: 500,
    },
    commission: {
      baseRate: 0.65,
      upsellBonus: 0.2,
      referralBonus: 50,
      productCommission: 0.3,
    },
    qualification: {
      minVisits: 25,
      minSpend: 2000,
      maxDaysBetween: 7,
      requiredBehaviors: [
        'Books multiple slots',
        'High tips',
        'Refers others',
        'Business/family account',
      ],
    },
  },
};

// ==================== CROSS-REFERENCE MATRIX ====================

/**
 * What actions to take for each AccountAge + FusionTier combination
 */
export const ActionMatrix: Record<AccountAgeTier, Record<FusionTier, string[]>> = {
  new: {
    casual: [
      'verify_new_account',
      'welcome_message',
      'book_next_appointment',
      'set_spending_limit',
    ],
    active: ['verify_new_account', 'welcome_message', 'book_next_appointment'], // Capped at active
    high_volume: ['verify_new_account', 'welcome_message', 'book_next_appointment'], // Capped at active
    whale: ['verify_new_account', 'welcome_message', 'book_next_appointment'], // Capped at active
  },
  recent: {
    casual: ['book_next_appointment', 'welcome_message', 'ask_for_review'],
    active: ['book_next_appointment', 'suggest_products', 'ask_for_review'],
    high_volume: ['book_next_appointment', 'suggest_products'], // Capped at active
    whale: ['book_next_appointment', 'suggest_products'], // Capped at active
  },
  growing: {
    casual: ['book_next_appointment', 'ask_for_review', 'offer_referral_bonus'],
    active: ['book_next_appointment', 'suggest_products', 'offer_referral_bonus'],
    high_volume: ['book_next_appointment', 'suggest_products', 'offer_referral_bonus'],
    whale: ['book_next_appointment', 'suggest_products'], // Capped at high_volume
  },
  established: {
    casual: ['book_next_appointment', 'ask_for_review'],
    active: ['book_next_appointment', 'suggest_products', 'offer_referral_bonus'],
    high_volume: [
      'book_next_appointment',
      'suggest_products',
      'offer_referral_bonus',
      'ask_for_review',
    ],
    whale: ['book_next_appointment', 'suggest_products', 'offer_referral_bonus'],
  },
  veteran: {
    casual: ['book_next_appointment'],
    active: ['book_next_appointment', 'offer_referral_bonus'],
    high_volume: ['book_next_appointment', 'offer_referral_bonus', 'ask_for_review'],
    whale: ['book_next_appointment', 'suggest_products', 'offer_referral_bonus', 'ask_for_review'],
  },
};

// ==================== TYPE GUARDS ====================

export function isAccountAgeTier(value: string): value is AccountAgeTier {
  return ['new', 'recent', 'growing', 'established', 'veteran'].includes(value);
}

export function isFusionTier(value: string): value is FusionTier {
  return ['casual', 'active', 'high_volume', 'whale'].includes(value);
}

export function getAccountAgeFromDays(days: number): AccountAgeTier {
  if (days <= 7) return 'new';
  if (days <= 30) return 'recent';
  if (days <= 90) return 'growing';
  if (days <= 365) return 'established';
  return 'veteran';
}

// Export all
export type {
  AccountAgeTier,
  AccountAgeProperties,
  ActionPriority,
  ActionCategory,
  ActionTiming,
  BarberActionProperties,
  FusionTier,
  ImpactLevel,
  FusionImpactProperties,
};
