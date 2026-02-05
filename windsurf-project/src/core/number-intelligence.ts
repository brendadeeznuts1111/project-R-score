
import { PhoneSanitizerV2, type SanitizerResult } from './filter/phone-sanitizer-v2.js';

export enum RiskFactor {
  VOIP_PROVIDER = 'VOIP_PROVIDER',     // TextNow, Google Voice
  BURNER_NUMBER = 'BURNER_NUMBER',     // Prepaid, temporary
  CARRIER_CHURN = 'CARRIER_CHURN',     // Frequent number changes
  FRAUD_HISTORY = 'FRAUD_HISTORY',     // Blacklisted in IPQS
  SPAM_COMPLAINTS = 'SPAM_COMPLAINTS', // Reported as spam
  GEO_MISMATCH = 'GEO_MISMATCH',      // Number location != user location
  AGE_UNDER_90_DAYS = 'AGE_UNDER_90_DAYS' // New number risk
}

export enum UseCaseSuitability {
  SMS_2FA = 'SMS_2FA',               // Good for verification
  SMS_MARKETING = 'SMS_MARKETING',   // Can receive campaigns
  VOICE_CALLING = 'VOICE_CALLING',   // Supports voice
  INTERNATIONAL = 'INTERNATIONAL',   // Can receive int'l SMS
  EMERGENCY = 'EMERGENCY',           // Can call 911 (US Mobile)
  ROAMING = 'ROAMING'                // Works abroad
}

export type Action = 'ALLOW' | 'BLOCK' | 'FLAG' | 'ENRICH' | 'VERIFY';

export interface NumberIntelligence extends SanitizerResult {
  trustScore: number; // 0-100
  riskFactors: RiskFactor[];
  suitability: UseCaseSuitability[];
  recommendedActions: Action[];
}

export class NumberQualifier {
  private sanitizer: PhoneSanitizerV2;

  constructor(sanitizer?: PhoneSanitizerV2) {
    this.sanitizer = sanitizer || new PhoneSanitizerV2();
  }

  async qualify(phone: string): Promise<NumberIntelligence> {
    const sanitized = await this.sanitizer.exec(phone);
    
    // Multi-source intelligence fusion
    const [risk, suitability, trust] = await Promise.all([
      this.assessRisk(sanitized),
      this.assessSuitability(sanitized),
      this.calculateTrustScore(sanitized)
    ]);
    
    return {
      ...sanitized,
      trustScore: trust,
      riskFactors: risk,
      suitability,
      recommendedActions: this.getRecommendedActions(sanitized, risk, trust)
    };
  }

  /**
   * §Filter:92 - Sync intelligence classification (0.02ms)
   */
  public classify(result: Partial<SanitizerResult>, extra: Partial<SanitizerResult> = {}): Partial<NumberIntelligence> {
    const fused = { ...result, ...extra } as SanitizerResult;
    
    let score = 100;
    if (fused.fraudScore) score -= (fused.fraudScore / 1.5);
    if (fused.type === 'VOIP') score -= 25;
    
    return {
      ...fused,
      trustScore: Math.round(score),
      riskFactors: fused.type === 'VOIP' ? [RiskFactor.VOIP_PROVIDER] : [],
      suitability: fused.type === 'MOBILE' ? [UseCaseSuitability.SMS_2FA, UseCaseSuitability.VOICE_CALLING] : []
    };
  }
  
  private async assessRisk(result: SanitizerResult): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];
    
    // VOIP detection
    if (result.carrier?.match(/Google Voice|TextNow|Burner|Twilio|Pinger/i)) {
      risks.push(RiskFactor.VOIP_PROVIDER);
    }
    
    // Prepaid/Burner detection
    if (result.carrier?.match(/T-Mobile Prepaid|AT&T PREPAID|Simple Mobile|TracFone|Mint/i)) {
      risks.push(RiskFactor.BURNER_NUMBER);
    }
    
    // Fraud score threshold (from IPQS)
    if (result.fraudScore && result.fraudScore > 75) {
      risks.push(RiskFactor.FRAUD_HISTORY);
    }
    
    // Number age check placeholder (requires specific provider like Ekata or Telesign)
    // For now, if fraudScore is high, we might assume recent churn/high risk
    if (result.fraudScore && result.fraudScore > 85) {
      risks.push(RiskFactor.AGE_UNDER_90_DAYS);
    }
    
    return risks;
  }
  
  private async assessSuitability(result: SanitizerResult): Promise<UseCaseSuitability[]> {
    const suitability: UseCaseSuitability[] = [];
    
    // SMS capabilities
    if (result.type === 'MOBILE' || result.type === 'VOIP') {
      suitability.push(UseCaseSuitability.SMS_2FA);
      suitability.push(UseCaseSuitability.SMS_MARKETING);
    }
    
    // Voice capabilities
    if (result.type !== 'VOIP' || result.carrier?.match(/Twilio|Vonage|Bandwidth/i)) {
      suitability.push(UseCaseSuitability.VOICE_CALLING);
    }
    
    // International SMS (based on carrier/country)
    if (result.country && result.country !== 'US') {
      suitability.push(UseCaseSuitability.INTERNATIONAL);
    }
    
    // Emergency services (US Mobile usually supported, VOIP limited)
    if (result.country === 'US' && result.type === 'MOBILE') {
      suitability.push(UseCaseSuitability.EMERGENCY);
    }
    
    return suitability;
  }
  
  private async calculateTrustScore(result: SanitizerResult): Promise<number> {
    let score = 100;
    
    // Deduct based on risk factors
    if (result.fraudScore) score -= (result.fraudScore / 1.5); // Heavier penalty for IPQS high scores
    if (result.type === 'VOIP') score -= 25;
    if (result.type === 'UNKNOWN') score -= 40;
    if (!result.isValid) score = 0;
    
    // Add based on positive signals
    if (result.carrier?.match(/Verizon|AT&T|T-Mobile|Vodafone|Orange/i)) score += 10;
    if (result.region && result.city) score += 5; // Geographic certainty
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getRecommendedActions(result: SanitizerResult, risks: RiskFactor[], trust: number): Action[] {
    const actions: Action[] = [];
    
    if (!result.isValid || trust < 20 || risks.includes(RiskFactor.FRAUD_HISTORY)) {
      actions.push('BLOCK');
      return actions;
    }

    if (trust < 50 || risks.length > 0) {
      actions.push('VERIFY');
      actions.push('FLAG');
    } else if (trust > 80) {
      actions.push('ALLOW');
    }

    if (trust > 40 && trust < 70) {
      actions.push('ENRICH');
    }

    return actions;
  }
}
