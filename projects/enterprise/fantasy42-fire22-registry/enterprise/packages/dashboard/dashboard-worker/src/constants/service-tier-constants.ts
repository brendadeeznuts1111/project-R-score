/**
 * 🔥 Fire22 Service Tier Constants
 * Configurable 3-tier customer service system
 */

import { ServiceTier } from '../types/service-tiers';
import type { ServiceTierConfig, TierBusinessRules } from '../types/service-tiers';

export const SERVICE_TIER_CONSTANTS: Record<ServiceTier, ServiceTierConfig> = {
  [ServiceTier.TIER_1]: {
    tier: ServiceTier.TIER_1,
    name: 'Essential Service',
    description: 'Standard service level for new and regular customers',

    requirements: {
      minLifetimeVolume: 0,
      minMonthlyVolume: 0,
      minTransactionCount: 0,
      minAccountAge: 0,
      maxFailedTransactions: 10,
      requiresVerification: false,
      excludedCustomerTypes: ['banned', 'suspended'],
    },

    benefits: {
      // Response Times
      supportResponseTime: '4-8 hours',
      supportResponseTimeMinutes: 480, // 8 hours max
      priorityQueue: false,
      dedicatedSupport: false,

      // Transaction Benefits
      feeDiscountPercentage: 0.0, // No additional discount
      higherLimits: false,
      limitMultiplier: 1.0,
      fastTrackApproval: false,
      skipManualReview: false,

      // Features & Access
      betaFeatureAccess: false,
      customPaymentMethods: false,
      bulkTransactionSupport: false,
      apiAccess: false,
      whiteGloveService: false,
      personalAccountManager: false,

      // Communication
      telegram: {
        privateSupportGroup: false,
        directMessageSupport: false,
        priorityNotifications: false,
        customNotifications: false,
      },

      // Rewards & Recognition
      monthlyBonus: 0,
      loyaltyPointsMultiplier: 1.0,
      exclusiveEvents: false,
      birthdayRewards: false,
      anniversaryRewards: false,
    },

    display: {
      badge: 'Essential',
      color: '#6c757d',
      icon: '🥉',
      backgroundGradient: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
    },

    sla: {
      uptime: 99.0,
      supportResponseTime: 480, // 8 hours
      transactionProcessingTime: 60, // 1 hour
      issueResolutionTime: 48, // 48 hours
      escalationTime: 120, // 2 hours
    },

    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  },

  [ServiceTier.TIER_2]: {
    tier: ServiceTier.TIER_2,
    name: 'Premium Service',
    description: 'Enhanced service for active and valuable customers',

    requirements: {
      minLifetimeVolume: 50000,
      minMonthlyVolume: 5000,
      minTransactionCount: 20,
      minAccountAge: 30, // 30 days
      maxFailedTransactions: 5,
      requiresVerification: true,
      requiresReferrals: 2,
    },

    benefits: {
      // Response Times
      supportResponseTime: '1-2 hours',
      supportResponseTimeMinutes: 120, // 2 hours max
      priorityQueue: true,
      dedicatedSupport: false,

      // Transaction Benefits
      feeDiscountPercentage: 0.005, // 0.5% additional discount
      higherLimits: true,
      limitMultiplier: 1.5,
      fastTrackApproval: true,
      skipManualReview: false,

      // Features & Access
      betaFeatureAccess: true,
      customPaymentMethods: true,
      bulkTransactionSupport: true,
      apiAccess: false,
      whiteGloveService: false,
      personalAccountManager: false,

      // Communication
      telegram: {
        privateSupportGroup: true,
        directMessageSupport: true,
        priorityNotifications: true,
        customNotifications: true,
      },

      // Rewards & Recognition
      monthlyBonus: 25,
      loyaltyPointsMultiplier: 1.5,
      exclusiveEvents: true,
      birthdayRewards: true,
      anniversaryRewards: false,
    },

    display: {
      badge: 'Premium',
      color: '#ffc107',
      icon: '🥈',
      backgroundGradient: 'linear-gradient(135deg, #ffc107 0%, #ff8f00 100%)',
    },

    sla: {
      uptime: 99.5,
      supportResponseTime: 120, // 2 hours
      transactionProcessingTime: 30, // 30 minutes
      issueResolutionTime: 24, // 24 hours
      escalationTime: 60, // 1 hour
    },

    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  },

  [ServiceTier.TIER_3]: {
    tier: ServiceTier.TIER_3,
    name: 'VIP Concierge',
    description: 'White-glove service for our most valued customers',

    requirements: {
      minLifetimeVolume: 250000,
      minMonthlyVolume: 25000,
      minTransactionCount: 50,
      minAccountAge: 90, // 90 days
      maxFailedTransactions: 2,
      requiresVerification: true,
      requiresReferrals: 5,
    },

    benefits: {
      // Response Times
      supportResponseTime: '15-30 minutes',
      supportResponseTimeMinutes: 30, // 30 minutes max
      priorityQueue: true,
      dedicatedSupport: true,

      // Transaction Benefits
      feeDiscountPercentage: 0.015, // 1.5% additional discount
      higherLimits: true,
      limitMultiplier: 3.0,
      fastTrackApproval: true,
      skipManualReview: true,

      // Features & Access
      betaFeatureAccess: true,
      customPaymentMethods: true,
      bulkTransactionSupport: true,
      apiAccess: true,
      whiteGloveService: true,
      personalAccountManager: true,

      // Communication
      telegram: {
        privateSupportGroup: true,
        directMessageSupport: true,
        priorityNotifications: true,
        customNotifications: true,
      },

      // Rewards & Recognition
      monthlyBonus: 100,
      loyaltyPointsMultiplier: 2.0,
      exclusiveEvents: true,
      birthdayRewards: true,
      anniversaryRewards: true,
    },

    display: {
      badge: 'VIP Concierge',
      color: '#e91e63',
      icon: '🥇',
      backgroundGradient: 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)',
    },

    sla: {
      uptime: 99.9,
      supportResponseTime: 30, // 30 minutes
      transactionProcessingTime: 10, // 10 minutes
      issueResolutionTime: 4, // 4 hours
      escalationTime: 15, // 15 minutes
    },

    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  },
};

export const TIER_BUSINESS_RULES: TierBusinessRules = {
  reviewFrequencyDays: 7, // Weekly review

  downgradePeriods: {
    [ServiceTier.TIER_3]: 90, // 90 days grace period for VIP
    [ServiceTier.TIER_2]: 60, // 60 days grace period for Premium
    [ServiceTier.TIER_1]: 0, // No grace period for Essential
  },

  manualOverrideAllowed: true,
  manualOverrideRequiresApproval: true,
  manualOverrideMaxTier: ServiceTier.TIER_2, // Can't manually override to VIP

  suspendTierOnRisk: true,
  suspendTierOnComplaints: 3, // Suspend tier benefits after 3 complaints

  promotionalTierUpgrades: {
    enabled: true,
    campaignName: 'New Year Promotion',
    temporaryTier: ServiceTier.TIER_2,
    duration: 30, // 30 days
    criteria: {
      minTransactions: 10,
      minVolume: 5000,
    },
  },
};

// Tier upgrade celebration messages
export const TIER_UPGRADE_MESSAGES = {
  [ServiceTier.TIER_2]: {
    title: '🎉 Congratulations! Premium Service Unlocked!',
    message: `You've been upgraded to Premium Service (Tier 2)!
    
🎯 **New Benefits:**
• Priority support (1-2 hour response)
• 0.5% additional fee discount
• 1.5x higher transaction limits
• Fast-track approvals
• Beta feature access
• Premium Telegram support group
• Monthly $25 bonus
• Birthday rewards

Thank you for being a valued Fire22 customer!`,
    telegramMessage: `🎉 UPGRADE ALERT!

Congratulations ${'{customerName}'}! You've unlocked **Premium Service** (Tier 2)!

✨ **What's New:**
🚀 Priority support queue
💰 Extra 0.5% fee discount
📈 1.5x higher limits
⚡ Fast-track approvals
🧪 Beta features access
🎁 $25 monthly bonus

Welcome to Premium! 🥈`,
    celebrationEmoji: '🎉🥈✨',
  },

  [ServiceTier.TIER_3]: {
    title: '👑 Welcome to VIP Concierge Service!',
    message: `You've achieved our highest service level - VIP Concierge (Tier 3)!
    
🌟 **Exclusive Benefits:**
• Dedicated personal account manager
• 15-30 minute support response
• 1.5% additional fee discount  
• 3x higher transaction limits
• Skip manual reviews
• Full API access
• White-glove service
• $100 monthly bonus
• Exclusive VIP events
• Anniversary rewards

You're now part of our elite VIP program! 👑`,
    telegramMessage: `👑 VIP STATUS ACHIEVED!

${'{customerName}'}, welcome to **VIP Concierge Service**!

🌟 **Elite Benefits:**
👨‍💼 Personal account manager
⚡ 30-min support response
💎 1.5% extra fee discount
🚀 3x higher limits
🔓 Full API access
💰 $100 monthly bonus
🎪 Exclusive VIP events

You're now Fire22 royalty! 👑🥇`,
    celebrationEmoji: '👑🥇🌟',
  },
};

// Tier downgrade warning messages
export const TIER_DOWNGRADE_WARNINGS = {
  [ServiceTier.TIER_3]: `⚠️ VIP Status Review

Your VIP Concierge status is under review due to decreased activity. 

**Current Period:**
• Volume: Below $25,000 monthly minimum
• Transaction Count: Below 50 minimum

**Grace Period:** {graceDaysRemaining} days remaining

**To Maintain VIP Status:**
• Increase monthly volume to $25,000+
• Complete at least 50 transactions
• Maintain account in good standing

Need assistance? Your personal account manager is here to help!`,

  [ServiceTier.TIER_2]: `📊 Premium Status Review

Your Premium Service status may be affected by recent activity changes.

**Current Period:**
• Volume: Below $5,000 monthly minimum
• Transaction Count: Below 20 minimum

**Grace Period:** {graceDaysRemaining} days remaining

**To Maintain Premium Status:**
• Increase monthly volume to $5,000+
• Complete at least 20 transactions

Contact our support team if you need assistance!`,
};

export default {
  SERVICE_TIER_CONSTANTS,
  TIER_BUSINESS_RULES,
  TIER_UPGRADE_MESSAGES,
  TIER_DOWNGRADE_WARNINGS,
};
