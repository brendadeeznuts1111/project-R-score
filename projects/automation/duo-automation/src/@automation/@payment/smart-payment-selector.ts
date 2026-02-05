/**
 * 🎯 Smart Payment Selector - FactoryWager Payment Methods Matrix
 * Intelligent payment method selection based on user preferences and requirements
 */

import { PaymentMethod, PaymentMethodDetails, PaymentBuilderFactory } from './payment-builder-factory';

export interface PaymentRequirements {
  amount: number;
  recipientCountry: string;
  senderCountry: string;
  urgency: 'instant' | 'fast' | 'slow';
  preferences: {
    preferCrypto: boolean;
    preferFree: boolean;
    preferMobile: boolean;
    requireWebhook: boolean;
    maxFee?: number;
  };
}

export interface MethodScore {
  method: PaymentMethod;
  score: number;
  details: PaymentMethodDetails;
  reasons: string[];
  warnings: string[];
}

export interface SelectionCriteria {
  weightSpeed: number;
  weightCost: number;
  weightConvenience: number;
  weightAvailability: number;
}

/**
 * 🎯 Smart Payment Selector
 */
export class SmartPaymentSelector {
  private static defaultCriteria: SelectionCriteria = {
    weightSpeed: 0.3,
    weightCost: 0.25,
    weightConvenience: 0.25,
    weightAvailability: 0.2
  };

  /**
   * 🎯 Select best payment methods based on requirements
   */
  static selectBestMethods(
    requirements: PaymentRequirements,
    criteria: Partial<SelectionCriteria> = {},
    limit: number = 3
  ): MethodScore[] {
    const weights = { ...this.defaultCriteria, ...criteria };
    const availableMethods = PaymentBuilderFactory.getAvailableMethods();
    
    const scoredMethods: MethodScore[] = [];
    
    for (const method of availableMethods) {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      if (!details) continue;
      
      if (this.meetsRequirements(method, details, requirements)) {
        const score = this.calculateScore(method, details, requirements, weights);
        scoredMethods.push(score);
      }
    }
    
    return scoredMethods
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 🎯 Get single best recommendation
   */
  static getBestRecommendation(
    requirements: PaymentRequirements,
    criteria: Partial<SelectionCriteria> = {}
  ): MethodScore | null {
    const methods = this.selectBestMethods(requirements, criteria, 1);
    return methods.length > 0 ? methods[0] : null;
  }

  /**
   * 🔍 Check if method meets basic requirements
   */
  private static meetsRequirements(
    method: PaymentMethod,
    details: PaymentMethodDetails,
    requirements: PaymentRequirements
  ): boolean {
    // Check amount limits
    if (requirements.amount < details.limits.min || requirements.amount > details.limits.max) {
      return false;
    }
    
    // Check urgency requirements
    if (requirements.urgency === 'instant' && details.processingTime !== 'instant') {
      return false;
    }
    
    if (requirements.urgency === 'fast' && 
        (details.processingTime.includes('hour') || details.processingTime.includes('day'))) {
      return false;
    }
    
    // Check preferences
    if (requirements.preferences.preferCrypto && details.type !== 'crypto') {
      return false;
    }
    
    if (requirements.preferences.preferFree && details.fees !== 0) {
      return false;
    }
    
    if (requirements.preferences.requireWebhook && !details.requiresWebhook) {
      return false;
    }
    
    if (requirements.preferences.maxFee !== undefined) {
      const fee = typeof details.fees === 'number' ? details.fees : 0;
      if (fee > requirements.preferences.maxFee) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 📊 Calculate score for payment method
   */
  private static calculateScore(
    method: PaymentMethod,
    details: PaymentMethodDetails,
    requirements: PaymentRequirements,
    weights: SelectionCriteria
  ): MethodScore {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Speed score
    const speedScore = this.calculateSpeedScore(details.processingTime, requirements.urgency);
    score += speedScore * weights.weightSpeed;
    if (speedScore > 0.8) reasons.push('Fast processing');
    if (speedScore < 0.3) warnings.push('Slow processing');

    // Cost score
    const costScore = this.calculateCostScore(details.fees, requirements.preferences.preferFree);
    score += costScore * weights.weightCost;
    if (costScore > 0.8) reasons.push('Low fees');
    if (costScore < 0.3) warnings.push('High fees');

    // Convenience score
    const convenienceScore = this.calculateConvenienceScore(method, details, requirements);
    score += convenienceScore * weights.weightConvenience;
    if (convenienceScore > 0.8) reasons.push('Very convenient');
    if (convenienceScore < 0.3) warnings.push('Less convenient');

    // Availability score
    const availabilityScore = this.calculateAvailabilityScore(details, requirements);
    score += availabilityScore * weights.weightAvailability;
    if (availabilityScore > 0.8) reasons.push('Widely available');
    if (availabilityScore < 0.3) warnings.push('Limited availability');

    // Bonus scores
    if (details.requiresWebhook && requirements.preferences.requireWebhook) {
      score += 0.1;
      reasons.push('Webhook support');
    }

    if (details.type === 'crypto' && requirements.preferences.preferCrypto) {
      score += 0.1;
      reasons.push('Crypto preferred');
    }

    return {
      method,
      score: Math.min(score, 1), // Cap at 1.0
      details,
      reasons,
      warnings
    };
  }

  /**
   * ⚡ Calculate speed score
   */
  private static calculateSpeedScore(processingTime: string, urgency: 'instant' | 'fast' | 'slow'): number {
    if (urgency === 'instant') {
      return processingTime === 'instant' ? 1.0 : 0.0;
    } else if (urgency === 'fast') {
      if (processingTime === 'instant') return 1.0;
      if (processingTime.includes('seconds') || processingTime.includes('minutes')) return 0.8;
      if (processingTime.includes('hour')) return 0.4;
      return 0.1;
    } else {
      if (processingTime === 'instant') return 0.9;
      if (processingTime.includes('seconds') || processingTime.includes('minutes')) return 0.8;
      if (processingTime.includes('hour')) return 0.6;
      return 0.4;
    }
  }

  /**
   * 💰 Calculate cost score
   */
  private static calculateCostScore(fees: number | string, preferFree: boolean): number {
    if (typeof fees === 'number') {
      if (preferFree) {
        return fees === 0 ? 1.0 : Math.max(0, 1 - (fees / 5)); // Penalize fees
      } else {
        return fees === 0 ? 1.0 : Math.max(0.2, 1 - (fees / 10)); // Less penalty
      }
    } else {
      // Variable fees (crypto)
      return preferFree ? 0.3 : 0.6;
    }
  }

  /**
   * 📱 Calculate convenience score
   */
  private static calculateConvenienceScore(
    method: PaymentMethod,
    details: PaymentMethodDetails,
    requirements: PaymentRequirements
  ): number {
    let score = 0.5; // Base score

    // Mobile-first methods
    if (['cashapp', 'venmo', 'applepay', 'googlepay'].includes(method)) {
      score += requirements.preferences.preferMobile ? 0.3 : 0.2;
    }

    // OAuth methods (more convenient)
    if (details.requiresOAuth) {
      score += 0.2;
    }

    // Webhook methods (automatic)
    if (details.requiresWebhook) {
      score += 0.1;
    }

    // Crypto methods (less convenient for average users)
    if (details.type === 'crypto') {
      score -= 0.2;
    }

    // Bank methods (less convenient)
    if (method === 'bank') {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 🌍 Calculate availability score
   */
  private static calculateAvailabilityScore(
    details: PaymentMethodDetails,
    requirements: PaymentRequirements
  ): number {
    // For simplicity, assume all methods are available in US
    if (requirements.recipientCountry === 'US' && requirements.senderCountry === 'US') {
      return 1.0;
    }

    // International availability varies by method
    const internationalAvailability: Record<PaymentMethod, number> = {
      cashapp: 0.1, // US only
      venmo: 0.1,   // US only
      paypal: 0.9,  // Global
      zelle: 0.2,    // US mostly
      btc: 1.0,      // Global
      eth: 1.0,      // Global
      usdc: 1.0,     // Global
      usdt: 1.0,     // Global
      applepay: 0.6, // Many countries
      googlepay: 0.7, // Many countries
      bank: 0.8,     // Most countries
      card: 0.9      // Global
    };

    return internationalAvailability[details.name.toLowerCase() as PaymentMethod] || 0.5;
  }

  /**
   * 📊 Get method comparison table
   */
  static getMethodComparison(methods: PaymentMethod[]): Array<{
    method: PaymentMethod;
    details: PaymentMethodDetails;
    speed: 'instant' | 'fast' | 'slow';
    cost: 'free' | 'low' | 'medium' | 'high';
    convenience: 'high' | 'medium' | 'low';
    availability: 'global' | 'regional' | 'limited';
  }> {
    return methods.map(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      if (!details) throw new Error(`Method ${method} not found`);

      return {
        method,
        details,
        speed: this.categorizeSpeed(details.processingTime),
        cost: this.categorizeCost(details.fees),
        convenience: this.categorizeConvenience(method, details),
        availability: this.categorizeAvailability(details)
      };
    });
  }

  /**
   * ⚡ Categorize processing speed
   */
  private static categorizeSpeed(processingTime: string): 'instant' | 'fast' | 'slow' {
    if (processingTime === 'instant') return 'instant';
    if (processingTime.includes('seconds') || processingTime.includes('minutes')) return 'fast';
    return 'slow';
  }

  /**
   * 💰 Categorize cost
   */
  private static categorizeCost(fees: number | string): 'free' | 'low' | 'medium' | 'high' {
    if (typeof fees === 'number') {
      if (fees === 0) return 'free';
      if (fees <= 1) return 'low';
      if (fees <= 3) return 'medium';
      return 'high';
    }
    return 'medium'; // Variable fees
  }

  /**
   * 📱 Categorize convenience
   */
  private static categorizeConvenience(method: PaymentMethod, details: PaymentMethodDetails): 'high' | 'medium' | 'low' {
    if (['cashapp', 'venmo', 'applepay', 'googlepay'].includes(method)) return 'high';
    if (['paypal', 'zelle'].includes(method)) return 'medium';
    if (['btc', 'eth', 'bank'].includes(method)) return 'low';
    return 'medium';
  }

  /**
   * 🌍 Categorize availability
   */
  private static categorizeAvailability(details: PaymentMethodDetails): 'global' | 'regional' | 'limited' {
    if (['Cash App', 'Venmo'].includes(details.name)) return 'limited';
    if (['Zelle'].includes(details.name)) return 'regional';
    return 'global';
  }

  /**
   * 🎯 Get recommendations for different scenarios
   */
  static getScenarioRecommendations(): Record<string, PaymentRequirements> {
    return {
      familyPayments: {
        amount: 50,
        recipientCountry: 'US',
        senderCountry: 'US',
        urgency: 'instant',
        preferences: {
          preferCrypto: false,
          preferFree: true,
          preferMobile: true,
          requireWebhook: true
        }
      },
      internationalTransfer: {
        amount: 500,
        recipientCountry: 'GB',
        senderCountry: 'US',
        urgency: 'fast',
        preferences: {
          preferCrypto: false,
          preferFree: false,
          preferMobile: false,
          requireWebhook: false,
          maxFee: 15
        }
      },
      cryptoPayment: {
        amount: 100,
        recipientCountry: 'US',
        senderCountry: 'US',
        urgency: 'slow',
        preferences: {
          preferCrypto: true,
          preferFree: false,
          preferMobile: false,
          requireWebhook: false
        }
      },
      urgentPayment: {
        amount: 25,
        recipientCountry: 'US',
        senderCountry: 'US',
        urgency: 'instant',
        preferences: {
          preferCrypto: false,
          preferFree: false,
          preferMobile: true,
          requireWebhook: true
        }
      }
    };
  }
}

/**
 * 🎯 Usage Examples
 */

// Example 1: Find best method for family payment
/*
const familyRequirements: PaymentRequirements = {
  amount: 50,
  recipientCountry: 'US',
  senderCountry: 'US',
  urgency: 'instant',
  preferences: {
    preferCrypto: false,
    preferFree: true,
    preferMobile: true,
    requireWebhook: true
  }
};

const recommendations = SmartPaymentSelector.selectBestMethods(familyRequirements);
console.log('Best family payment methods:', recommendations);
*/

// Example 2: Get single best recommendation
/*
const bestMethod = SmartPaymentSelector.getBestRecommendation(familyRequirements);
console.log('Best method:', bestMethod?.method, 'Score:', bestMethod?.score);
*/

// Example 3: Compare specific methods
/*
const comparison = SmartPaymentSelector.getMethodComparison(['cashapp', 'venmo', 'btc', 'eth']);
console.log('Method comparison:', comparison);
*/

// Example 4: Get scenario-based recommendations
/*
const scenarios = SmartPaymentSelector.getScenarioRecommendations();
for (const [scenario, requirements] of Object.entries(scenarios)) {
  const best = SmartPaymentSelector.getBestRecommendation(requirements);
  console.log(`${scenario}: ${best?.method} (score: ${best?.score})`);
}
*/
