/**
 * Golden Profile System with multi-factor scoring.
 * Tiers: bronze, silver, gold, platinum. Cookie: dw_golden_profile.
 */

const COOKIE_NAME = 'dw_golden_profile';

export interface GoldenProfile {
  profileId: string;
  agentId: string;
  createdAt: number;
  lastUpdated: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'unranked';
  score: number;
  components: {
    devices: string[];
    paymentMethods: PaymentMethodSummary[];
    socialConnections: string[];
    achievements: string[];
    riskAssessment: {
      fraudScore: number;
      trustLevel: string;
      flags: { id: string; reason: string; timestamp: number }[];
    };
  };
  metadata: {
    totalSpent: number;
    transactions: number;
    successfulPayments: number;
    failedPayments: number;
    avgTransactionValue: number;
    favoriteGateway: string | null;
  };
  preferences: {
    autoTopUp: boolean;
    topUpThreshold: number;
    preferredGateway: string;
    notifications: { paymentSuccess: boolean; lowBalance: boolean; suspiciousActivity: boolean };
  };
}

export interface PaymentMethodSummary {
  gateway: string;
  token: string;
  maskedData: string;
  linkedAt: number;
  isDefault: boolean;
}

export interface ScoreComponents {
  device_health: number;
  agent_activity: number;
  social_influence: number;
  financial_trust: number;
  security_score: number;
  longevity: number;
}

export interface ScoreResult {
  score: number;
  tier: GoldenProfile['tier'];
  components: ScoreComponents;
  recommendations: { category: string; priority: string; action: string; potentialGain: number }[];
}

export type DuoPlusLoaderLike = {
  fetchDeviceInfo(imageId: string, cookieHeader: string | null, options?: { bypassCache?: boolean }): Promise<{ sim?: { status?: number }; wifi?: { status?: number }; error?: string }>;
} | null;

function generateProfileId(): string {
  return `golden_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const SCORING_WEIGHTS: Record<keyof ScoreComponents, number> = {
  device_health: 0.25,
  agent_activity: 0.2,
  social_influence: 0.15,
  financial_trust: 0.2,
  security_score: 0.1,
  longevity: 0.1,
};

function getAgentDevicesFromCookie(cookieHeader: string | null): string[] {
  try {
    const cookies = new Bun.CookieMap(cookieHeader || '');
    const raw = cookies.get('dw_my_devices');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class GoldenProfileSystem {
  private profiles = new Map<string, GoldenProfile>();
  private duoplusLoader: DuoPlusLoaderLike = null;
  private getAgentIdFromCookie: (cookieHeader: string | null) => string = () => '';

  setDuoPlusLoader(loader: DuoPlusLoaderLike): void {
    this.duoplusLoader = loader;
  }

  setAgentIdResolver(fn: (cookieHeader: string | null) => string): void {
    this.getAgentIdFromCookie = fn;
  }

  getProfile(agentId: string, cookieHeader: string | null): GoldenProfile | null {
    const fromMap = this.profiles.get(agentId);
    if (fromMap) return fromMap;
    try {
      const cookies = new Bun.CookieMap(cookieHeader || '');
      const raw = cookies.get(COOKIE_NAME);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { profileId: string; agentId: string; tier: string };
      return this.profiles.get(parsed.agentId) ?? null;
    } catch {
      return null;
    }
  }

  getOrCreateProfile(agentId: string, cookieHeader: string | null): GoldenProfile {
    let profile = this.getProfile(agentId, cookieHeader);
    if (profile) return profile;
    return this.createGoldenProfile(agentId, cookieHeader);
  }

  createGoldenProfile(agentId: string, cookieHeader: string | null): GoldenProfile {
    const profileId = generateProfileId();
    const profile: GoldenProfile = {
      profileId,
      agentId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      tier: 'bronze',
      score: 0,
      components: {
        devices: [],
        paymentMethods: [],
        socialConnections: [],
        achievements: [],
        riskAssessment: { fraudScore: 0, trustLevel: 'unknown', flags: [] },
      },
      metadata: {
        totalSpent: 0,
        transactions: 0,
        successfulPayments: 0,
        failedPayments: 0,
        avgTransactionValue: 0,
        favoriteGateway: null,
      },
      preferences: {
        autoTopUp: false,
        topUpThreshold: 10,
        preferredGateway: 'venmo',
        notifications: { paymentSuccess: true, lowBalance: true, suspiciousActivity: true },
      },
    };
    this.profiles.set(agentId, profile);
    this.updateProfileCookie(profile, cookieHeader);
    return profile;
  }

  updateProfileCookie(profile: GoldenProfile, cookieHeader: string | null): void {
    const cookies = new Bun.CookieMap(cookieHeader || '');
    cookies.set(COOKIE_NAME, JSON.stringify({ profileId: profile.profileId, agentId: profile.agentId, tier: profile.tier }), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'Lax',
      secure: false,
      httpOnly: false,
    });
  }

  toSetCookieHeaders(cookieHeader: string | null, profile: GoldenProfile): string[] {
    const cookies = new Bun.CookieMap(cookieHeader || '');
    cookies.set(COOKIE_NAME, JSON.stringify({ profileId: profile.profileId, agentId: profile.agentId, tier: profile.tier }), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'Lax',
    });
    return cookies.toSetCookieHeaders();
  }

  async calculateIntegrationScore(
    agentId: string,
    cookieHeader: string | null,
    options?: {
      deviceHealth?: (agentId: string, cookieHeader: string | null) => Promise<number>;
      agentActivity?: (agentId: string) => number;
      socialInfluence?: (agentId: string) => number;
    }
  ): Promise<ScoreResult> {
    const profile = this.getOrCreateProfile(agentId, cookieHeader);

    const device_health = options?.deviceHealth
      ? await options.deviceHealth(agentId, cookieHeader)
      : await this.calculateDeviceHealthScore(agentId, cookieHeader);
    const agent_activity = options?.agentActivity ? options.agentActivity(agentId) : await this.calculateAgentActivityScore(agentId);
    const social_influence = options?.socialInfluence ? options.socialInfluence(agentId) : await this.calculateSocialInfluenceScore(agentId);
    const financial_trust = this.calculateFinancialTrustScore(profile);
    const security_score = Math.max(0, 100 - profile.components.riskAssessment.fraudScore);
    const longevity = this.calculateLongevityScore(profile);

    const components: ScoreComponents = {
      device_health,
      agent_activity,
      social_influence,
      financial_trust,
      security_score,
      longevity,
    };

    let totalScore = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
      totalScore += (components as Record<string, number>)[key] * weight;
      totalWeight += weight;
    }
    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;

    profile.score = finalScore;
    profile.lastUpdated = Date.now();
    profile.tier = this.determineTier(finalScore);
    this.profiles.set(agentId, profile);

    const recommendations = this.generateScoreRecommendations(components);
    return {
      score: finalScore,
      tier: profile.tier,
      components,
      recommendations,
    };
  }

  async calculateDeviceHealthScore(agentId: string, cookieHeader: string | null): Promise<number> {
    const deviceIds = getAgentDevicesFromCookie(cookieHeader);
    if (deviceIds.length === 0) return 50;
    if (!this.duoplusLoader) return 70;
    let total = 0;
    for (const deviceId of deviceIds) {
      try {
        const info = await this.duoplusLoader.fetchDeviceInfo(deviceId, cookieHeader);
        let score = 100;
        if (info.sim?.status !== 1) score -= 40;
        if (info.wifi?.status !== 1) score -= 20;
        if (info.error) score -= 15;
        total += Math.max(0, score);
      } catch {
        total += 50;
      }
    }
    return Math.round((total / deviceIds.length) * 100) / 100;
  }

  async calculateAgentActivityScore(agentId: string): Promise<number> {
    return 50;
  }

  async calculateSocialInfluenceScore(agentId: string): Promise<number> {
    return 50;
  }

  calculateFinancialTrustScore(profile: GoldenProfile): number {
    let score = 50;
    if (profile.metadata.transactions > 10) score += 20;
    if (profile.metadata.transactions > 0 && profile.metadata.successfulPayments / profile.metadata.transactions > 0.95) score += 20;
    if (profile.metadata.totalSpent > 1000) score += 10;
    if (profile.components.paymentMethods.length >= 2) score += 10;
    if (profile.metadata.avgTransactionValue > 50) score += 5;
    if (profile.metadata.failedPayments > 5) score -= 15;
    if (profile.components.riskAssessment.fraudScore > 30) score -= 25;
    if (profile.components.riskAssessment.flags.length > 0) score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  calculateLongevityScore(profile: GoldenProfile): number {
    const daysSinceCreation = (Date.now() - profile.createdAt) / (24 * 60 * 60 * 1000);
    if (daysSinceCreation >= 365) return 100;
    if (daysSinceCreation >= 180) return 80;
    if (daysSinceCreation >= 90) return 60;
    if (daysSinceCreation >= 30) return 40;
    if (daysSinceCreation >= 7) return 20;
    return 10;
  }

  determineTier(score: number): GoldenProfile['tier'] {
    if (score >= 90) return 'platinum';
    if (score >= 75) return 'gold';
    if (score >= 60) return 'silver';
    if (score >= 40) return 'bronze';
    return 'unranked';
  }

  generateScoreRecommendations(components: ScoreComponents): ScoreResult['recommendations'] {
    const recs: ScoreResult['recommendations'] = [];
    if (components.device_health < 70) {
      recs.push({ category: 'device_health', priority: 'high', action: 'Fix offline devices and update security patches', potentialGain: 15 });
    }
    if (components.financial_trust < 60) {
      recs.push({ category: 'financial_trust', priority: 'medium', action: 'Add verified payment methods and complete more successful transactions', potentialGain: 20 });
    }
    if (components.social_influence < 50) {
      recs.push({ category: 'social_influence', priority: 'low', action: 'Interact with other agents and participate in community features', potentialGain: 10 });
    }
    return recs;
  }

  recordPaymentSuccess(agentId: string, amount: number): void {
    const profile = this.profiles.get(agentId);
    if (!profile) return;
    profile.metadata.totalSpent += amount;
    profile.metadata.transactions++;
    profile.metadata.successfulPayments++;
    profile.metadata.avgTransactionValue = profile.metadata.totalSpent / profile.metadata.transactions;
  }

  recordPaymentFailure(agentId: string): void {
    const profile = this.profiles.get(agentId);
    if (!profile) return;
    profile.metadata.failedPayments++;
  }

  addPaymentMethod(agentId: string, summary: PaymentMethodSummary): void {
    const profile = this.getOrCreateProfile(agentId, null);
    const isFirst = profile.components.paymentMethods.length === 0;
    profile.components.paymentMethods.push({ ...summary, isDefault: isFirst });
  }

  addRiskFlag(agentId: string, reason: string): void {
    const profile = this.profiles.get(agentId);
    if (!profile) return;
    profile.components.riskAssessment.flags.push({
      id: `flag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      reason,
      timestamp: Date.now(),
    });
    profile.components.riskAssessment.fraudScore = Math.min(100, profile.components.riskAssessment.fraudScore + 15);
  }

  getAllProfiles(): GoldenProfile[] {
    return Array.from(this.profiles.values());
  }
}
