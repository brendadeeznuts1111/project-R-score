// barber-cashapp-protips.ts - CashApp New Accounts & Fusion Impact
// https://bun.com/docs

import { redis } from 'bun';
import { Database } from 'bun:sqlite';

// ==================== TYPE DEFINITIONS ====================
interface PaymentData {
  cashapp_user_id?: string;
  sender_cashtag?: string;
  profile_photo?: string;
  email_verified?: boolean;
  name?: string;
  device_id?: string;
  amount?: number;
  timestamp?: string;
  recent_transactions?: Array<{ timestamp: string; amount: number }>;
  sender_id?: string;
  [key: string]: unknown;
}

interface FusionHabits {
  defaultTip: number;
  servicePreferences: string[];
  [key: string]: unknown;
}

interface CustomerData {
  history: Array<{ amount: number; timestamp: string }>;
  [key: string]: unknown;
}

// ==================== NEW ACCOUNT DETECTION ====================
export class NewAccountManager {
  static async detectNewAccount(userId: string, paymentData: PaymentData) {
    const cashappId = paymentData.cashapp_user_id || paymentData.sender_cashtag;

    const indicators = await Promise.all([
      this.checkAccountAge(cashappId),
      this.checkTransactionHistory(cashappId),
      this.checkProfileCompleteness(paymentData),
      this.checkDeviceHistory(paymentData),
      this.checkVelocity(paymentData),
    ]);

    const isNew = indicators.some(ind => ind.score > 0.7);
    const riskScore = indicators.reduce((sum, ind) => sum + ind.score, 0) / indicators.length;

    return {
      isNew,
      riskScore,
      recommendations: this.getBarberRecommendations(isNew, riskScore),
      fusionAdjustments: this.getFusionAdjustments(isNew, riskScore, paymentData),
    };
  }

  private static async checkAccountAge(cashappId: string) {
    const firstSeen = await redis.get(`cashapp:first_seen:${cashappId}`);

    if (!firstSeen) {
      await redis.set(`cashapp:first_seen:${cashappId}`, Date.now());
      return { score: 0.9, details: 'First transaction from this CashApp' };
    }

    const ageDays = (Date.now() - parseInt(firstSeen)) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) return { score: 0.7, details: `Account < ${Math.ceil(ageDays)} days` };
    if (ageDays < 30) return { score: 0.4, details: 'Account < 30 days' };
    return { score: 0.1, details: 'Established account' };
  }

  private static async checkTransactionHistory(cashappId: string) {
    const txnCount = await redis.scard(`cashapp:txns:${cashappId}`);
    if (txnCount === 0) return { score: 0.8, details: 'No previous transactions' };
    if (txnCount < 3) return { score: 0.6, details: '< 3 transactions' };
    return { score: 0.2, details: `${txnCount} transactions` };
  }

  private static checkProfileCompleteness(paymentData: PaymentData) {
    let score = 0;
    if (!paymentData.profile_photo) score += 0.3;
    if (!paymentData.email_verified) score += 0.3;
    if (paymentData.name?.includes('User')) score += 0.4;
    return { score, details: 'Profile completeness check' };
  }

  private static checkDeviceHistory(paymentData: PaymentData) {
    // Check if device fingerprint is new
    return { score: 0.2, details: 'Device check' };
  }

  private static checkVelocity(paymentData: PaymentData) {
    // Check transaction velocity
    return { score: paymentData.velocity > 3 ? 0.6 : 0.1, details: 'Velocity check' };
  }

  private static getBarberRecommendations(isNew: boolean, riskScore: number): string[] {
    if (!isNew) return ['Standard service'];
    if (riskScore > 0.7) return ['Verify payment', 'Check ID', 'Wait for confirmation'];
    return ['Welcome message', 'Book next appointment', 'Offer referral bonus'];
  }

  private static getFusionAdjustments(isNew: boolean, riskScore: number, paymentData: PaymentData) {
    return {
      tier: isNew ? 'active' : null,
      bonusRate: isNew ? 0.05 : null,
      flags: isNew ? ['new_account'] : [],
      depositLimit: riskScore > 0.7 ? 50 : null,
    };
  }

  static async adjustFusionForNewAccount(userId: string, paymentData: PaymentData, defaultHabits: FusionHabits) {
    const newAccountInfo = await this.detectNewAccount(userId, paymentData);

    let adjustedHabits = { ...defaultHabits };
    const notes: string[] = [];
    const specialHandling: string[] = [];

    if (newAccountInfo.isNew) {
      // Demote tier for new accounts
      if (['whale', 'high-volume'].includes(defaultHabits.tier)) {
        adjustedHabits.tier = 'active';
        notes.push('New account - tier adjusted down');
      }

      adjustedHabits.bonusRate = Math.min(defaultHabits.bonusRate || 0.05, 0.05);
      adjustedHabits.flags = ['new_account', 'requires_verification'];

      specialHandling.push('Send welcome message');
      specialHandling.push('Follow up in 3 days');
      specialHandling.push('Offer referral bonus');
    }

    if (newAccountInfo.riskScore > 0.7) {
      adjustedHabits.flags = [...(adjustedHabits.flags || []), 'high_risk_new_account'];
      adjustedHabits.autoDepositLimit = 50;
      notes.push('High risk - lower limits');
    }

    return { adjustedHabits, notes, specialHandling };
  }

  private static async addToNurtureProgram(userId: string, paymentData: PaymentData) {
    await redis.hmset(`nurture:${userId}`, [
      'joinedAt',
      new Date().toISOString(),
      'firstPayment',
      paymentData.amount,
      'stage',
      'welcome',
    ]);
  }
}

// ==================== BARBER PRO TIPS ====================
export class BarberProTips {
  static getTipsForNewAccount(barberId: string, customerData: CustomerData) {
    return [
      {
        category: 'Verification',
        tip: "Ask: 'Is this your first time using CashApp with us?'",
        script: 'I see this is your first CashApp payment - everything come through okay?',
        purpose: 'Opens conversation without sounding accusatory',
      },
      {
        category: 'Payment',
        tip: 'Show payment notification on your phone',
        script: "Looks like it came through! Here's the confirmation.",
        purpose: 'Builds trust with transparency',
      },
      {
        category: 'Booking',
        tip: 'Book next appointment BEFORE they leave',
        script: "Want to book your next appointment? I'll text you the reminder.",
        purpose: 'Increases retention',
      },
      ...(customerData.amount > 30
        ? [
            {
              category: 'Growth',
              tip: 'Ask for referral after great service',
              script: "Know anyone else who'd appreciate a good cut? I'll take care of you both.",
              purpose: 'Leverages enthusiasm',
            },
          ]
        : []),
    ];
  }

  static async applyNewCustomerPromotion(customerId: string, barberId: string, service: string) {
    const db = new Database(':memory:');

    const firstService = db
      .query('SELECT COUNT(*) as count FROM services WHERE customer_id = ? AND barber_id = ?')
      .get(customerId, barberId);

    if (firstService.count === 0) {
      await redis.hmset(`promo:new:${customerId}`, [
        'barberId',
        barberId,
        'discount',
        '5',
        'date',
        new Date().toISOString(),
      ]);

      return {
        promotionApplied: true,
        discount: 5,
        message: 'Welcome discount! $5 off first visit.',
        barberCommission: 0.7, // 70% instead of 60%
      };
    }

    return {
      promotionApplied: false,
      discount: 0,
      message: 'Returning customer',
      barberCommission: 0.6,
    };
  }
}

// ==================== CASHAPP LIMITS ====================
export const CashAppLimits = {
  new: {
    // < 30 days
    dailyLimit: 250,
    weeklyLimit: 1000,
    instantAvailability: false,
    tips: [
      'First payments may take 1-3 days',
      'Suggest smaller initial payments',
      'Consider Venmo/PayPal for instant',
    ],
  },
  recent: {
    // 30-90 days
    dailyLimit: 1000,
    weeklyLimit: 5000,
    instantAvailability: true,
    tips: [
      'Instant deposits for 1.5% fee',
      'Weekly limit increases',
      'Good for weekly/bi-weekly booking',
    ],
  },
  established: {
    // 90+ days
    dailyLimit: 2500,
    weeklyLimit: 10000,
    instantAvailability: true,
    tips: ['Free instant deposits', 'Ask for monthly subscription', 'Perfect for family bookings'],
  },
};

// ==================== FUSION IMPACT MATRIX ====================
export const FusionImpactMatrix = {
  casual: {
    newAccountImpact: 'HIGH - Starting point for all',
    strategy: 'Nurture with consistency bonuses',
    retentionTactic: 'Book next appointment before leaving',
    expectedLTV: '$500-1000 over 6 months',
  },
  active: {
    newAccountImpact: 'MEDIUM - Need 3+ visits',
    strategy: 'Encourage weekly booking',
    retentionTactic: 'Text reminders + loyalty points',
    expectedLTV: '$2000-5000 over 12 months',
  },
  highVolume: {
    newAccountImpact: 'LOW - Rare from new accounts',
    strategy: 'Verify legitimacy, then VIP',
    retentionTactic: 'Priority booking',
    expectedLTV: '$5000-15000+ annually',
  },
  whale: {
    newAccountImpact: 'VERY LOW - Usually business',
    strategy: 'White-glove service',
    retentionTactic: 'After-hours availability',
    expectedLTV: '$10000-50000+ annually',
  },
};

// ==================== CHEAT SHEET ====================
export const BarberCheatSheet = {
  greenFlags: [
    '✅ Profile photo on CashApp',
    '✅ Full name matches ID',
    '✅ Previous transactions visible',
    '✅ Email verified badge',
  ],
  redFlags: [
    '❌ No profile photo',
    "❌ Generic name ('CashApp User')",
    '❌ First transaction ever',
    '❌ Payment from debit card',
  ],
  scripts: {
    verification: 'I see this is your first CashApp payment - everything okay?',
    troubleshooting: 'CashApp can be finicky. Want to scan my QR code?',
    retention: 'Want me to text you my booking link for next time?',
    upsell: 'For regulars, I offer 20% off product packages. Interested?',
  },
};

// ==================== OPTIMIZED FUSION ENGINE ====================
export class OptimizedFusionEngine {
  static async classifyCustomer(userId: string, paymentData: PaymentData) {
    const txns = await this.getCustomerTransactions(userId);
    const txnCount = txns.length;
    const totalSpent = txns.reduce((sum, t) => sum + t.amount, 0);
    const avgTxn = txnCount > 0 ? totalSpent / txnCount : 0;

    const accountAge = await this.getAccountAge(userId);
    const ageFactor = this.getAgeFactor(accountAge);

    // Base classification
    let baseTier = 'casual';
    if (txnCount > 100 && avgTxn > 100) baseTier = 'whale';
    else if (txnCount > 50) baseTier = 'high-volume';
    else if (txnCount > 20 && avgTxn > 20) baseTier = 'active';

    // Adjust for account age
    const finalTier = this.adjustTierForAccountAge(baseTier, accountAge);

    return {
      tier: finalTier,
      confidence: this.calculateConfidence(txnCount, accountAge),
      accountAgeFactor: ageFactor,
      nextBestAction: this.getNextBestAction(accountAge, finalTier, txnCount),
      barberAlerts: this.generateBarberAlerts(accountAge, finalTier, paymentData),
    };
  }

  private static async getCustomerTransactions(userId: string) {
    // Get from database
    return [];
  }

  private static async getAccountAge(userId: string) {
    const firstSeen = await redis.get(`customer:first_seen:${userId}`);
    if (!firstSeen) return 'new';
    const days = (Date.now() - parseInt(firstSeen)) / (1000 * 60 * 60 * 24);
    if (days < 7) return 'new';
    if (days < 30) return 'recent';
    return 'established';
  }

  private static getAgeFactor(accountAge: string) {
    return { new: 0.5, recent: 0.8, established: 1.0 }[accountAge] || 1.0;
  }

  private static adjustTierForAccountAge(baseTier: string, accountAge: string) {
    if (accountAge === 'new' && ['whale', 'high-volume'].includes(baseTier)) {
      return 'active'; // Start lower for new accounts
    }
    if (accountAge === 'recent' && baseTier === 'whale') {
      return 'high-volume';
    }
    return baseTier;
  }

  private static calculateConfidence(txnCount: number, accountAge: string) {
    let confidence = Math.min(txnCount / 10, 1.0);
    if (accountAge === 'new') confidence *= 0.7;
    return confidence;
  }

  private static getNextBestAction(accountAge: string, tier: string, txnCount: number) {
    if (accountAge === 'new') {
      if (txnCount === 1) return 'Book follow-up before leaving';
      if (txnCount === 2) return 'Offer loyalty signup';
      if (txnCount >= 3) return 'Ask for referral/review';
    }
    if (tier === 'active') return 'Suggest weekly standing appointment';
    if (tier === 'high-volume') return 'Offer monthly subscription';
    return 'Standard follow-up';
  }

  private static generateBarberAlerts(accountAge: string, tier: string, paymentData: PaymentData) {
    const alerts = [];
    if (accountAge === 'new' && paymentData.amount > 100) {
      alerts.push('⚠️ New account with large payment - verify');
    }
    if (accountAge === 'new' && paymentData.velocity > 3) {
      alerts.push('🚨 High velocity new account');
    }
    if (accountAge === 'new' && tier === 'active') {
      alerts.push('⭐ Fast-rising new customer');
    }
    return alerts;
  }
}

// All classes/consts already exported above
