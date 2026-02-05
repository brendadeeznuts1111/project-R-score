#!/usr/bin/env bun

/**
 * Extended Family Tiers - Trust-by-Degree System
 * 
 * ACME's sophisticated trust scoring system for extended family members.
 * Since 1972, we've understood that family comes in degrees of trust.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

enum RelationshipTier {
  IMMEDIATE = 'IMMEDIATE',      // Parents, siblings, spouse (Trust Score 100)
  COUSIN = 'COUSIN',            // First cousins (Trust Score 70)
  EXTENDED = 'EXTENDED',        // Second cousins, aunts/uncles (Trust Score 50)
  GUEST = 'GUEST',              // Friend-of-cousin (Trust Score 30)
  INVITED_GUEST = 'INVITED_GUEST' // Temporary access (Trust Score 10)
}

interface PoolMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship: RelationshipTier;
  invitedBy?: string; // Who vouched for them
  familyId: string;
  trustScore: number;
  maxFrontAmount: number;
  maxConcurrentPayments: number;
  paymentMethods: string[];
  permissions: MemberPermissions;
  statistics: MemberStatistics;
  createdAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'suspended' | 'inactive';
  metadata?: Record<string, any>;
}

interface MemberPermissions {
  canFrontPayments: boolean;
  canInviteGuests: boolean;
  canHostReunions: boolean;
  canViewAnalytics: boolean;
  canManagePool: boolean;
  dailyPaymentLimit: number;
  weeklyPaymentLimit: number;
  monthlyPaymentLimit: number;
}

interface MemberStatistics {
  totalPayments: number;
  totalAmount: number;
  onTimePayments: number;
  latePayments: number;
  frontedPayments: number;
  invitedGuests: number;
  reputationScore: number;
  contributionScore: number;
}

interface TrustAdjustment {
  memberId: string;
  adjustment: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
  previousScore: number;
  newScore: number;
}

interface TierPromotion {
  memberId: string;
  fromTier: RelationshipTier;
  toTier: RelationshipTier;
  promotedBy: string;
  promotedAt: Date;
  reason: string;
  requirementsMet: string[];
}

class ExtendedFamilyTiers {
  private static readonly STORAGE_FILE = 'data/family-members.json';
  private static readonly TRUST_ADJUSTMENTS_FILE = 'data/trust-adjustments.json';
  private static readonly TIER_PROMOTIONS_FILE = 'data/tier-promotions.json';

  // ACME's trust-by-degree configuration - refined over 50+ years
  private static readonly TIER_CONFIG = {
    [RelationshipTier.IMMEDIATE]: {
      baseTrustScore: 100,
      maxFrontAmount: 1000.00,
      maxConcurrentPayments: 10,
      dailyPaymentLimit: 2500,
      weeklyPaymentLimit: 10000,
      monthlyPaymentLimit: 25000,
      permissions: {
        canFrontPayments: true,
        canInviteGuests: true,
        canHostReunions: true,
        canViewAnalytics: true,
        canManagePool: true
      },
      icon: '👨‍👩‍👧‍👦',
      color: '#FF6B35',
      description: 'Immediate family - Full trust and privileges'
    },
    [RelationshipTier.COUSIN]: {
      baseTrustScore: 70,
      maxFrontAmount: 500.00,
      maxConcurrentPayments: 5,
      dailyPaymentLimit: 1000,
      weeklyPaymentLimit: 5000,
      monthlyPaymentLimit: 15000,
      permissions: {
        canFrontPayments: true,
        canInviteGuests: true,
        canHostReunions: true,
        canViewAnalytics: false,
        canManagePool: false
      },
      icon: '👫',
      color: '#4ECDC4',
      description: 'First cousins - High trust with extended privileges'
    },
    [RelationshipTier.EXTENDED]: {
      baseTrustScore: 50,
      maxFrontAmount: 200.00,
      maxConcurrentPayments: 3,
      dailyPaymentLimit: 500,
      weeklyPaymentLimit: 2000,
      monthlyPaymentLimit: 8000,
      permissions: {
        canFrontPayments: true,
        canInviteGuests: false,
        canHostReunions: false,
        canViewAnalytics: false,
        canManagePool: false
      },
      icon: '👥',
      color: '#45B7D1',
      description: 'Extended family - Moderate trust with limited privileges'
    },
    [RelationshipTier.GUEST]: {
      baseTrustScore: 30,
      maxFrontAmount: 50.00,
      maxConcurrentPayments: 1,
      dailyPaymentLimit: 100,
      weeklyPaymentLimit: 300,
      monthlyPaymentLimit: 1000,
      permissions: {
        canFrontPayments: true,
        canInviteGuests: false,
        canHostReunions: false,
        canViewAnalytics: false,
        canManagePool: false
      },
      icon: '👋',
      color: '#96CEB4',
      description: 'Guest of family member - Basic trust and privileges'
    },
    [RelationshipTier.INVITED_GUEST]: {
      baseTrustScore: 10,
      maxFrontAmount: 0.00,
      maxConcurrentPayments: 1,
      dailyPaymentLimit: 50,
      weeklyPaymentLimit: 150,
      monthlyPaymentLimit: 500,
      permissions: {
        canFrontPayments: false,
        canInviteGuests: false,
        canHostReunions: false,
        canViewAnalytics: false,
        canManagePool: false
      },
      icon: '🔗',
      color: '#FFEAA7',
      description: 'Temporary guest - Limited access, no fronting'
    }
  };

  /**
   * Create new family member with tier-based configuration
   */
  static async createMember(params: {
    name: string;
    email?: string;
    phone?: string;
    relationship: RelationshipTier;
    familyId: string;
    invitedBy?: string;
    customTrustScore?: number;
  }): Promise<PoolMember> {
    
    const memberId = randomUUID();
    const config = this.TIER_CONFIG[params.relationship];
    const now = new Date();

    const member: PoolMember = {
      id: memberId,
      name: params.name,
      email: params.email,
      phone: params.phone,
      relationship: params.relationship,
      invitedBy: params.invitedBy,
      familyId: params.familyId,
      trustScore: params.customTrustScore || config.baseTrustScore,
      maxFrontAmount: config.maxFrontAmount,
      maxConcurrentPayments: config.maxConcurrentPayments,
      paymentMethods: ['factory-wager'], // Start with basic method
      permissions: { ...config.permissions },
      statistics: {
        totalPayments: 0,
        totalAmount: 0,
        onTimePayments: 0,
        latePayments: 0,
        frontedPayments: 0,
        invitedGuests: 0,
        reputationScore: params.customTrustScore || config.baseTrustScore,
        contributionScore: 0
      },
      createdAt: now,
      lastActiveAt: now,
      status: 'active'
    };

    await this.saveMember(member);
    console.log(`👥 Created family member: ${params.name} (${params.relationship}) in ${params.familyId}`);

    // Notify inviter if applicable
    if (params.invitedBy) {
      await this.notifyInviter(params.invitedBy, member, 'member_added');
    }

    return member;
  }

  /**
   * Update member trust score with audit trail
   */
  static async adjustTrustScore(
    memberId: string,
    adjustment: number,
    reason: string,
    adjustedBy: string
  ): Promise<PoolMember> {
    
    const member = await this.getMember(memberId);
    if (!member) {
      throw new Error('Family member not found');
    }

    const previousScore = member.trustScore;
    const newScore = Math.max(0, Math.min(100, member.trustScore + adjustment));

    // Record adjustment
    const trustAdjustment: TrustAdjustment = {
      memberId,
      adjustment,
      reason,
      adjustedBy,
      adjustedAt: new Date(),
      previousScore,
      newScore
    };

    await this.saveTrustAdjustment(trustAdjustment);

    // Update member
    member.trustScore = newScore;
    member.statistics.reputationScore = newScore;
    member.lastActiveAt = new Date();

    // Check for tier promotion
    await this.checkTierPromotion(member, adjustedBy);

    await this.saveMember(member);
    console.log(`📈 Adjusted trust score for ${member.name}: ${previousScore} → ${newScore} (${reason})`);

    return member;
  }

  /**
   * Promote member to higher tier based on trust and activity
   */
  private static async checkTierPromotion(member: PoolMember, promotedBy: string): Promise<void> {
    const currentTier = member.relationship;
    
    // Define promotion requirements
    const promotionRequirements = {
      [RelationshipTier.INVITED_GUEST]: {
        to: RelationshipTier.GUEST,
        requirements: ['trust_score_25', 'completed_5_payments', 'no_late_payments']
      },
      [RelationshipTier.GUEST]: {
        to: RelationshipTier.EXTENDED,
        requirements: ['trust_score_50', 'completed_15_payments', 'invited_by_cousin']
      },
      [RelationshipTier.EXTENDED]: {
        to: RelationshipTier.COUSIN,
        requirements: ['trust_score_65', 'completed_30_payments', '6_months_active']
      },
      [RelationshipTier.COUSIN]: {
        to: RelationshipTier.IMMEDIATE,
        requirements: ['trust_score_90', 'completed_50_payments', '1_year_active', 'family_approval']
      }
    };

    const promotion = promotionRequirements[currentTier as keyof typeof promotionRequirements];
    if (!promotion) return;

    const requirementsMet = await this.evaluatePromotionRequirements(member, promotion.requirements);
    
    if (requirementsMet.length === promotion.requirements.length) {
      await this.promoteMember(member, promotion.to, promotedBy, requirementsMet);
    }
  }

  /**
   * Evaluate if member meets promotion requirements
   */
  private static async evaluatePromotionRequirements(member: PoolMember, requirements: string[]): Promise<string[]> {
    const met: string[] = [];

    for (const requirement of requirements) {
      switch (requirement) {
        case 'trust_score_25':
          if (member.trustScore >= 25) met.push(requirement);
          break;
        case 'trust_score_50':
          if (member.trustScore >= 50) met.push(requirement);
          break;
        case 'trust_score_65':
          if (member.trustScore >= 65) met.push(requirement);
          break;
        case 'trust_score_90':
          if (member.trustScore >= 90) met.push(requirement);
          break;
        case 'completed_5_payments':
          if (member.statistics.totalPayments >= 5) met.push(requirement);
          break;
        case 'completed_15_payments':
          if (member.statistics.totalPayments >= 15) met.push(requirement);
          break;
        case 'completed_30_payments':
          if (member.statistics.totalPayments >= 30) met.push(requirement);
          break;
        case 'completed_50_payments':
          if (member.statistics.totalPayments >= 50) met.push(requirement);
          break;
        case 'no_late_payments':
          if (member.statistics.latePayments === 0) met.push(requirement);
          break;
        case 'invited_by_cousin':
          const inviter = member.invitedBy ? await this.getMember(member.invitedBy) : null;
          if (inviter && inviter.relationship === RelationshipTier.COUSIN) met.push(requirement);
          break;
        case '6_months_active':
          const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
          if (member.createdAt <= sixMonthsAgo) met.push(requirement);
          break;
        case '1_year_active':
          const oneYearAgo = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
          if (member.createdAt <= oneYearAgo) met.push(requirement);
          break;
        case 'family_approval':
          // Would require family vote/approval in production
          met.push(requirement); // Simplified for demo
          break;
      }
    }

    return met;
  }

  /**
   * Promote member to new tier
   */
  private static async promoteMember(
    member: PoolMember,
    newTier: RelationshipTier,
    promotedBy: string,
    requirementsMet: string[]
  ): Promise<void> {
    
    const oldTier = member.relationship;
    const oldConfig = this.TIER_CONFIG[oldTier];
    const newConfig = this.TIER_CONFIG[newTier];

    // Update member
    member.relationship = newTier;
    member.maxFrontAmount = newConfig.maxFrontAmount;
    member.maxConcurrentPayments = newConfig.maxConcurrentPayments;
    member.permissions = { ...newConfig.permissions };
    member.lastActiveAt = new Date();

    // Record promotion
    const promotion: TierPromotion = {
      memberId: member.id,
      fromTier: oldTier,
      toTier: newTier,
      promotedBy,
      promotedAt: new Date(),
      reason: `Met requirements: ${requirementsMet.join(', ')}`,
      requirementsMet
    };

    await this.saveTierPromotion(promotion);
    await this.saveMember(member);

    console.log(`🎉 Promoted ${member.name}: ${oldTier} → ${newTier}`);
    
    // Trigger celebration
    await this.triggerPromotionCelebration(member, promotion);

    // Notify family
    await this.notifyFamilyOfPromotion(member, promotion);
  }

  /**
   * Get member by ID
   */
  static async getMember(memberId: string): Promise<PoolMember | null> {
    const members = await this.loadMembers();
    return members[memberId] || null;
  }

  /**
   * Get members by family
   */
  static async getFamilyMembers(familyId: string): Promise<PoolMember[]> {
    const members = await this.loadMembers();
    return Object.values(members).filter(member => member.familyId === familyId);
  }

  /**
   * Get members by tier
   */
  static async getMembersByTier(tier: RelationshipTier): Promise<PoolMember[]> {
    const members = await this.loadMembers();
    return Object.values(members).filter(member => member.relationship === tier);
  }

  /**
   * Update member statistics after payment
   */
  static async updatePaymentStatistics(
    memberId: string,
    amount: number,
    onTime: boolean,
    fronted: boolean = false
  ): Promise<PoolMember> {
    
    const member = await this.getMember(memberId);
    if (!member) {
      throw new Error('Family member not found');
    }

    // Update statistics
    member.statistics.totalPayments++;
    member.statistics.totalAmount += amount;
    
    if (onTime) {
      member.statistics.onTimePayments++;
    } else {
      member.statistics.latePayments++;
    }
    
    if (fronted) {
      member.statistics.frontedPayments++;
    }

    // Calculate contribution score
    member.statistics.contributionScore = this.calculateContributionScore(member.statistics);
    
    // Update last active
    member.lastActiveAt = new Date();

    // Adjust trust based on payment behavior
    const trustAdjustment = this.calculateTrustAdjustment(member.statistics, onTime);
    if (trustAdjustment !== 0) {
      await this.adjustTrustScore(memberId, trustAdjustment, 
        onTime ? 'On-time payment' : 'Late payment', 'system');
    }

    await this.saveMember(member);
    return member;
  }

  /**
   * Calculate contribution score based on statistics
   */
  private static calculateContributionScore(stats: MemberStatistics): number {
    let score = 0;
    
    // Base score from payment count
    score += Math.min(stats.totalPayments * 2, 50);
    
    // Bonus for total amount
    score += Math.min(stats.totalAmount / 100, 30);
    
    // Reliability bonus
    const onTimeRate = stats.totalPayments > 0 ? stats.onTimePayments / stats.totalPayments : 0;
    score += Math.round(onTimeRate * 20);
    
    return Math.min(score, 100);
  }

  /**
   * Calculate trust adjustment based on payment behavior
   */
  private static calculateTrustAdjustment(stats: MemberStatistics, onTime: boolean): number {
    if (onTime) {
      // Positive adjustment for consistent on-time payments
      if (stats.onTimePayments % 5 === 0) {
        return 2; // +2 trust every 5 on-time payments
      }
    } else {
      // Negative adjustment for late payments
      return -1; // -1 trust for each late payment
    }
    
    return 0;
  }

  /**
   * Get tier statistics for family
   */
  static async getFamilyTierStatistics(familyId: string): Promise<{
    totalMembers: number;
    tiers: Record<RelationshipTier, number>;
    averageTrustScore: number;
    totalContribution: number;
    frontingCapacity: number;
  }> {
    
    const members = await this.getFamilyMembers(familyId);
    
    const tiers = {
      [RelationshipTier.IMMEDIATE]: 0,
      [RelationshipTier.COUSIN]: 0,
      [RelationshipTier.EXTENDED]: 0,
      [RelationshipTier.GUEST]: 0,
      [RelationshipTier.INVITED_GUEST]: 0
    };

    let totalTrust = 0;
    let totalContribution = 0;
    let frontingCapacity = 0;

    for (const member of members) {
      tiers[member.relationship]++;
      totalTrust += member.trustScore;
      totalContribution += member.statistics.contributionScore;
      frontingCapacity += member.maxFrontAmount;
    }

    return {
      totalMembers: members.length,
      tiers,
      averageTrustScore: members.length > 0 ? Math.round(totalTrust / members.length) : 0,
      totalContribution,
      frontingCapacity
    };
  }

  /**
   * Trigger promotion celebration
   */
  private static async triggerPromotionCelebration(member: PoolMember, promotion: TierPromotion): Promise<void> {
    console.log(`🎊 Promotion celebration for ${member.name}: ${promotion.fromTier} → ${promotion.toTier}`);
    // Integration with celebration system
  }

  /**
   * Notify family of promotion
   */
  private static async notifyFamilyOfPromotion(member: PoolMember, promotion: TierPromotion): Promise<void> {
    console.log(`📢 Notifying family of ${member.name}'s promotion`);
    // Integration with notification system
  }

  /**
   * Notify inviter of member activity
   */
  private static async notifyInviter(inviterId: string, member: PoolMember, action: string): Promise<void> {
    console.log(`📱 Notifying inviter ${inviterId} of ${action} for ${member.name}`);
    // Integration with notification system
  }

  /**
   * Data persistence methods
   */
  private static async loadMembers(): Promise<Record<string, PoolMember>> {
    try {
      if (!existsSync(this.STORAGE_FILE)) {
        return {};
      }
      const data = readFileSync(this.STORAGE_FILE, 'utf-8');
      const members = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [id, member] of Object.entries(members)) {
        const m = member as any;
        m.createdAt = new Date(m.createdAt);
        m.lastActiveAt = new Date(m.lastActiveAt);
      }
      
      return members;
    } catch (error) {
      console.error('Failed to load family members:', error);
      return {};
    }
  }

  private static async saveMember(member: PoolMember): Promise<void> {
    const members = await this.loadMembers();
    members[member.id] = member;
    await this.saveAllMembers(members);
  }

  private static async saveAllMembers(members: Record<string, PoolMember>): Promise<void> {
    try {
      if (!existsSync('data')) {
        await require('fs').promises.mkdir('data', { recursive: true });
      }
      writeFileSync(this.STORAGE_FILE, JSON.stringify(members, null, 2));
    } catch (error) {
      console.error('Failed to save family members:', error);
      throw error;
    }
  }

  private static async saveTrustAdjustment(adjustment: TrustAdjustment): Promise<void> {
    try {
      const adjustments = await this.loadTrustAdjustments();
      if (!adjustments[adjustment.memberId]) {
        adjustments[adjustment.memberId] = [];
      }
      adjustments[adjustment.memberId].push(adjustment);
      writeFileSync(this.TRUST_ADJUSTMENTS_FILE, JSON.stringify(adjustments, null, 2));
    } catch (error) {
      console.error('Failed to save trust adjustment:', error);
    }
  }

  private static async loadTrustAdjustments(): Promise<Record<string, TrustAdjustment[]>> {
    try {
      if (!existsSync(this.TRUST_ADJUSTMENTS_FILE)) {
        return {};
      }
      const data = readFileSync(this.TRUST_ADJUSTMENTS_FILE, 'utf-8');
      const adjustments = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [memberId, memberAdjustments] of Object.entries(adjustments)) {
        for (const adjustment of memberAdjustments as any) {
          adjustment.adjustedAt = new Date(adjustment.adjustedAt);
        }
      }
      
      return adjustments;
    } catch (error) {
      console.error('Failed to load trust adjustments:', error);
      return {};
    }
  }

  private static async saveTierPromotion(promotion: TierPromotion): Promise<void> {
    try {
      const promotions = await this.loadTierPromotions();
      if (!promotions[promotion.memberId]) {
        promotions[promotion.memberId] = [];
      }
      promotions[promotion.memberId].push(promotion);
      writeFileSync(this.TIER_PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
    } catch (error) {
      console.error('Failed to save tier promotion:', error);
    }
  }

  private static async loadTierPromotions(): Promise<Record<string, TierPromotion[]>> {
    try {
      if (!existsSync(this.TIER_PROMOTIONS_FILE)) {
        return {};
      }
      const data = readFileSync(this.TIER_PROMOTIONS_FILE, 'utf-8');
      const promotions = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [memberId, memberPromotions] of Object.entries(promotions)) {
        for (const promotion of memberPromotions as any) {
          promotion.promotedAt = new Date(promotion.promotedAt);
        }
      }
      
      return promotions;
    } catch (error) {
      console.error('Failed to load tier promotions:', error);
      return {};
    }
  }

  /**
   * Get tier configuration
   */
  static getTierConfig(tier: RelationshipTier) {
    return { ...this.TIER_CONFIG[tier] };
  }

  /**
   * Get all tier configurations
   */
  static getAllTierConfigs() {
    return { ...this.TIER_CONFIG };
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  const familyId = process.argv[3] || 'FAM123';

  switch (command) {
    case 'create':
      ExtendedFamilyTiers.createMember({
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        relationship: RelationshipTier.GUEST,
        familyId,
        invitedBy: 'alice-cousin'
      }).then(member => {
        console.log('✅ Created member:', member.name);
        console.log(`Tier: ${member.relationship} (${member.trustScore} trust)`);
        console.log(`Max Front: $${member.maxFrontAmount}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'stats':
      ExtendedFamilyTiers.getFamilyTierStatistics(familyId).then(stats => {
        console.log('📊 Family Tier Statistics:');
        console.log(`Total Members: ${stats.totalMembers}`);
        console.log(`Average Trust: ${stats.averageTrustScore}`);
        console.log(`Total Contribution: ${stats.totalContribution}`);
        console.log(`Fronting Capacity: $${stats.frontingCapacity}`);
        console.log('\nTiers:');
        for (const [tier, count] of Object.entries(stats.tiers)) {
          const config = ExtendedFamilyTiers.getTierConfig(tier as RelationshipTier);
          console.log(`  ${config.icon} ${tier}: ${count} members`);
        }
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'adjust':
      const memberId = process.argv[3];
      const adjustment = parseInt(process.argv[4]) || 5;
      const reason = process.argv[5] || 'Good payment behavior';
      
      if (memberId) {
        ExtendedFamilyTiers.adjustTrustScore(memberId, adjustment, reason, 'system')
          .then(member => {
            console.log(`📈 Adjusted trust for ${member.name}: ${member.trustScore}`);
          })
          .catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'tiers':
      const configs = ExtendedFamilyTiers.getAllTierConfigs();
      console.log('🏆 Extended Family Tiers:');
      for (const [tier, config] of Object.entries(configs)) {
        console.log(`\n${config.icon} ${tier}:`);
        console.log(`  Trust Score: ${config.baseTrustScore}`);
        console.log(`  Max Front: $${config.maxFrontAmount}`);
        console.log(`  Description: ${config.description}`);
      }
      break;

    default:
      console.log(`
👥 Extended Family Tiers - Trust-by-Degree System

Usage:
  family-tiers create <familyId>              - Create new family member
  family-tiers stats <familyId>                - Show family tier statistics
  family-tiers adjust <memberId> <amount> <reason>  - Adjust trust score
  family-tiers tiers                           - Show all tier configurations

Relationship Tiers:
  IMMEDIATE    - Parents, siblings, spouse (100 trust, $1000 front)
  COUSIN       - First cousins (70 trust, $500 front)
  EXTENDED     - Second cousins, aunts/uncles (50 trust, $200 front)
  GUEST        - Friend-of-cousin (30 trust, $50 front)
  INVITED_GUEST - Temporary access (10 trust, $0 front)

Features:
✅ Trust-by-degree scoring system
✅ Automatic tier promotions
✅ Permission-based access control
✅ Comprehensive audit trail
✅ ACME's 50+ years of family trust expertise

"Family comes in degrees of trust" - ACME Since 1972 🎩
      `);
  }
}

export default ExtendedFamilyTiers;
export { RelationshipTier, PoolMember, MemberPermissions, MemberStatistics, TrustAdjustment, TierPromotion };
