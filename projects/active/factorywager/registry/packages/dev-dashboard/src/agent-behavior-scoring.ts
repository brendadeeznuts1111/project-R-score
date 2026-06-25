/**
 * Agent behavior scoring: productivity, collaboration, badges, leaderboard.
 * Integrates with golden profile, social feed, and AB testing.
 */

import type { GoldenProfileSystem } from './golden-profile.ts';

export interface BehaviorScores {
  productivity: number;
  collaboration: number;
  innovation: number;
  reliability: number;
  socialImpact: number;
}

export interface Badge {
  name: string;
  icon: string;
  earned: number;
  description: string;
}

export interface BehaviorResult {
  behavior: BehaviorScores;
  totalScore: number;
  ranking: number;
  badges: Badge[];
}

export type GetAgentActionsFn = (agentId: string) => { action: string; timestamp: number }[];
export type GetSocialInteractionsFn = (agentId: string) => { type: string; fromAgent: string; toAgent: string }[];

export class AgentBehaviorScorer {
  private goldenProfile: GoldenProfileSystem | null = null;
  private getAgentActions: GetAgentActionsFn = () => [];
  private getSocialInteractions: GetSocialInteractionsFn = () => [];

  setGoldenProfile(sys: GoldenProfileSystem | null): void {
    this.goldenProfile = sys;
  }

  setDataSources(getActions: GetAgentActionsFn, getSocial: GetSocialInteractionsFn): void {
    this.getAgentActions = getActions;
    this.getSocialInteractions = getSocial;
  }

  async analyzeAgentBehavior(agentId: string): Promise<BehaviorResult> {
    const actions = this.getAgentActions(agentId);
    const social = this.getSocialInteractions(agentId);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentActions = actions.filter((a) => a.timestamp > oneWeekAgo);

    const productivity = this.calculateProductivityScore(recentActions);
    const collaboration = this.calculateCollaborationScore(agentId, social);
    const innovation = Math.min(100, productivity * 0.9 + 10);
    const reliability = Math.min(100, (productivity + collaboration) / 2);
    const socialImpact = Math.min(100, collaboration * 1.2);

    const behavior: BehaviorScores = {
      productivity,
      collaboration,
      innovation,
      reliability,
      socialImpact,
    };
    const totalScore = (Object.values(behavior) as number[]).reduce((a, b) => a + b, 0) / 5;
    const badges = await this.awardBadges(agentId, behavior);
    const ranking = await this.getAgentRanking(agentId, totalScore);

    return { behavior, totalScore, ranking, badges };
  }

  calculateProductivityScore(recentActions: { action: string; timestamp: number }[]): number {
    const uniqueActions = new Set(recentActions.map((a) => a.action));
    const frequency = recentActions.length;
    let score = Math.min(frequency * 2, 40);
    score += uniqueActions.size * 10;
    return Math.min(100, score);
  }

  calculateCollaborationScore(agentId: string, social: { type: string; fromAgent: string; toAgent: string }[]): number {
    const collaborations = social.filter((i) => i.type === 'collaboration' || i.type === 'assistance' || i.type === 'message');
    const uniqueCollaborators = new Set(
      collaborations.flatMap((c) => [c.fromAgent, c.toAgent]).filter((id) => id !== agentId)
    );
    let score = collaborations.length * 5;
    score += uniqueCollaborators.size * 15;
    return Math.min(100, score);
  }

  async awardBadges(agentId: string, behavior: BehaviorScores): Promise<Badge[]> {
    const badges: Badge[] = [];
    const now = Date.now();
    if (behavior.productivity >= 80) {
      badges.push({ name: 'Productivity Pro', icon: '⚡', earned: now, description: 'Consistently high activity level' });
    }
    if (behavior.collaboration >= 70) {
      badges.push({ name: 'Team Player', icon: '🤝', earned: now, description: 'Excellent collaboration skills' });
    }
    if (behavior.innovation >= 75) {
      badges.push({ name: 'Innovator', icon: '💡', earned: now, description: 'Creative problem-solving' });
    }
    const profile = this.goldenProfile?.getProfile(agentId, null);
    if (profile?.metadata.successfulPayments >= 50) {
      badges.push({ name: 'Trusted Payer', icon: '💳', earned: now, description: '50+ successful payments' });
    }
    if (profile && profile.score >= 85) {
      badges.push({ name: 'Golden Agent', icon: '🏆', earned: now, description: 'Top-tier integration score' });
    }
    return badges;
  }

  async getAgentRanking(agentId: string, _totalScore: number): Promise<number> {
    const profiles = this.goldenProfile?.getAllProfiles() ?? [];
    const sorted = [...profiles].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((p) => p.agentId === agentId);
    return idx === -1 ? 0 : idx + 1;
  }

  async createLeaderboard(metric: keyof BehaviorScores | 'totalScore' = 'totalScore', limit = 20): Promise<
    { agentId: string; name: string; score: number; tier: string; badges: Badge[]; productivity: number; collaboration: number }[]
  > {
    const profiles = this.goldenProfile?.getAllProfiles() ?? [];
    const results = await Promise.all(
      profiles.map(async (profile) => {
        const behavior = await this.analyzeAgentBehavior(profile.agentId);
        return {
          agentId: profile.agentId,
          name: `Agent ${profile.agentId.slice(0, 8)}`,
          score: metric === 'totalScore' ? behavior.totalScore : behavior.behavior[metric],
          tier: profile.tier,
          badges: behavior.badges,
          productivity: behavior.behavior.productivity,
          collaboration: behavior.behavior.collaboration,
        };
      })
    );
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
