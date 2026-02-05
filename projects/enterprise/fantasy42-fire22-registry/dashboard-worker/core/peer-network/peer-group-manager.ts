/**
 * Peer Group Manager - Creates and manages pockets of peers for transaction history development
 * Enables trust building and efficient P2P transactions through peer networks
 */

import {
  CustomerDatabaseManagement,
  CustomerProfile,
} from '../customers/customer-database-management';
import {
  P2PPaymentMatching,
  P2PPaymentRequest,
  P2PTransaction,
} from '../payments/p2p-payment-matching';
import { CustomerPaymentValidation } from '../payments/customer-payment-validation';
import { DepositWithdrawalSystem } from '../finance/deposit-withdrawal-system';

export interface PeerGroup {
  id: string;
  name: string;
  type: 'trust_circle' | 'payment_circle' | 'geographic' | 'interest_based' | 'vip_network';
  members: string[]; // customerIds
  createdAt: string;
  trustScore: number; // 0-100 based on group transaction success
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageResponseTime: number; // minutes for P2P matches
  commonPaymentMethods: string[];
  geographicDistribution?: {
    primaryRegion: string;
    spreadScore: number; // How spread out geographically
  };
  activityScore: number; // Based on recent activity
  rules: PeerGroupRules;
}

export interface PeerGroupRules {
  minTrustScore: number;
  maxMembers: number;
  allowedPaymentMethods: string[];
  transactionLimits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
  };
  geographicRestrictions?: string[];
  vipOnly: boolean;
  autoApprovalThreshold: number; // transactions under this amount auto-approve
  requireVerification: boolean;
  escrowRequired: boolean;
}

export interface PeerRelationship {
  customerId1: string;
  customerId2: string;
  trustScore: number; // 0-100
  totalTransactions: number;
  successfulTransactions: number;
  totalVolume: number;
  lastTransactionAt: string;
  commonPaymentMethods: string[];
  averageAmount: number;
  responseTime: number; // Average time to respond to P2P requests
  communicationRating: number; // Based on chat/communication quality
  reliabilityScore: number; // Based on keeping commitments
  sharedGroups: string[]; // Common peer groups
  preferredPaymentMethod: string;
  geographicDistance?: number; // If available
}

export interface PeerMatchRecommendation {
  requesterId: string;
  recommendedPeers: Array<{
    peerId: string;
    matchScore: number; // 0-100
    reasons: string[];
    estimatedResponseTime: number;
    commonHistory: number; // Number of past transactions
    trustScore: number;
    preferredMethod: string;
  }>;
  groupSuggestions: Array<{
    groupId: string;
    groupName: string;
    matchScore: number;
    memberCount: number;
    successRate: number;
  }>;
}

export class PeerGroupManager {
  private customerManager: CustomerDatabaseManagement;
  private p2pMatching: P2PPaymentMatching;
  private paymentValidation: CustomerPaymentValidation;
  private financialSystem: DepositWithdrawalSystem;

  private peerGroups: Map<string, PeerGroup> = new Map();
  private peerRelationships: Map<string, PeerRelationship> = new Map(); // key: customerId1_customerId2

  constructor(
    customerManager: CustomerDatabaseManagement,
    p2pMatching: P2PPaymentMatching,
    paymentValidation: CustomerPaymentValidation,
    financialSystem: DepositWithdrawalSystem
  ) {
    this.customerManager = customerManager;
    this.p2pMatching = p2pMatching;
    this.paymentValidation = paymentValidation;
    this.financialSystem = financialSystem;
  }

  /**
   * Create a new peer group
   */
  async createPeerGroup(
    creatorId: string,
    name: string,
    type: PeerGroup['type'],
    initialMembers: string[],
    rules: Partial<PeerGroupRules>
  ): Promise<PeerGroup> {
    // Validate creator permissions
    const creator = this.customerManager.getCustomerProfile(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    // Check if creator has sufficient trust score for creating groups
    const minTrustScore = type === 'vip_network' ? 90 : 70;
    if (creator.rankingProfile.overallScore < minTrustScore) {
      throw new Error(
        `Insufficient trust score for creating ${type} group. Required: ${minTrustScore}`
      );
    }

    // Set default rules based on group type
    const defaultRules = this.getDefaultRulesForType(type, rules);

    const group: PeerGroup = {
      id: this.generateGroupId(),
      name,
      type,
      members: [creatorId, ...initialMembers],
      createdAt: new Date().toISOString(),
      trustScore: 85, // Start with high trust
      totalTransactions: 0,
      totalVolume: 0,
      successRate: 1.0,
      averageResponseTime: 30, // minutes
      commonPaymentMethods: this.analyzeGroupPaymentMethods([creatorId, ...initialMembers]),
      activityScore: 100,
      rules: defaultRules,
    };

    // Validate all members
    for (const memberId of group.members) {
      const member = this.customerManager.getCustomerProfile(memberId);
      if (!member) {
        throw new Error(`Member ${memberId} not found`);
      }

      // Check member eligibility
      if (member.rankingProfile.overallScore < group.rules.minTrustScore) {
        throw new Error(`Member ${memberId} does not meet minimum trust score requirement`);
      }

      if (group.rules.vipOnly && member.rankingProfile.vipTier < 3) {
        throw new Error(`Member ${memberId} does not meet VIP requirements`);
      }
    }

    // Create initial peer relationships
    await this.initializePeerRelationships(group.members);

    this.peerGroups.set(group.id, group);
    return group;
  }

  /**
   * Find optimal peer matches for a P2P request
   */
  async findPeerMatches(
    requesterId: string,
    requestType: 'deposit' | 'withdrawal',
    amount: number,
    paymentMethod: string,
    maxResults: number = 10
  ): Promise<PeerMatchRecommendation> {
    const requester = this.customerManager.getCustomerProfile(requesterId);
    if (!requester) {
      throw new Error('Requester not found');
    }

    const recommendations: PeerMatchRecommendation['recommendedPeers'] = [];
    const groupSuggestions: PeerMatchRecommendation['groupSuggestions'] = [];

    // Find individual peer matches
    const potentialPeers = await this.findPotentialPeers(requesterId, paymentMethod);

    for (const peerId of potentialPeers) {
      const matchScore = await this.calculatePeerMatchScore(
        requesterId,
        peerId,
        amount,
        paymentMethod,
        requestType
      );

      if (matchScore.score > 50) {
        // Only include good matches
        const relationship = this.getPeerRelationship(requesterId, peerId);

        recommendations.push({
          peerId,
          matchScore: matchScore.score,
          reasons: matchScore.reasons,
          estimatedResponseTime: relationship?.responseTime || 45,
          commonHistory: relationship?.totalTransactions || 0,
          trustScore: relationship?.trustScore || 70,
          preferredMethod: relationship?.preferredPaymentMethod || paymentMethod,
        });
      }
    }

    // Sort by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Find group suggestions
    const relevantGroups = await this.findRelevantGroups(requesterId, paymentMethod);

    for (const group of relevantGroups) {
      const groupMatchScore = await this.calculateGroupMatchScore(
        requesterId,
        group,
        amount,
        paymentMethod
      );

      if (groupMatchScore > 60) {
        groupSuggestions.push({
          groupId: group.id,
          groupName: group.name,
          matchScore: groupMatchScore,
          memberCount: group.members.length,
          successRate: group.successRate,
        });
      }
    }

    // Sort group suggestions
    groupSuggestions.sort((a, b) => b.matchScore - a.matchScore);

    return {
      requesterId,
      recommendedPeers: recommendations.slice(0, maxResults),
      groupSuggestions: groupSuggestions.slice(0, 5),
    };
  }

  /**
   * Process P2P transaction within peer network
   */
  async processPeerTransaction(
    requesterId: string,
    peerId: string,
    amount: number,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<P2PTransaction> {
    // Validate both parties are in peer network
    const relationship = this.getPeerRelationship(requesterId, peerId);
    if (!relationship) {
      throw new Error('No peer relationship found between these customers');
    }

    // Check if they're in the same peer groups
    const commonGroups = this.findCommonPeerGroups(requesterId, peerId);
    if (commonGroups.length === 0) {
      throw new Error('Customers are not in the same peer network');
    }

    // Enhanced validation for peer transactions
    const requesterValidation = await this.paymentValidation.validatePaymentMethod(
      requesterId,
      paymentMethod,
      paymentDetails.username || paymentDetails.email || '',
      amount,
      'p2p'
    );

    const peerValidation = await this.paymentValidation.validatePaymentMethod(
      peerId,
      paymentMethod,
      paymentDetails.username || paymentDetails.email || '',
      amount,
      'p2p'
    );

    // Peer transactions get higher trust score
    const enhancedRequesterValidation = {
      ...requesterValidation,
      validationScore: Math.min(requesterValidation.validationScore + 15, 100),
      riskLevel:
        requesterValidation.riskLevel === 'high' ? 'medium' : requesterValidation.riskLevel,
    };

    // Create P2P transaction request
    const request = await this.p2pMatching.createPaymentRequest(
      requesterId,
      'deposit', // Assume deposit for now
      paymentMethod,
      amount,
      paymentDetails,
      'peer_network'
    );

    // Update peer relationship
    await this.updatePeerRelationship(requesterId, peerId, amount, true);

    // Update peer groups
    for (const groupId of commonGroups) {
      await this.updatePeerGroupStats(groupId, amount, true);
    }

    return {
      ...request,
      peerNetworkData: {
        relationshipTrustScore: relationship.trustScore,
        commonGroups: commonGroups.length,
        peerValidation: enhancedRequesterValidation,
      },
    } as P2PTransaction;
  }

  /**
   * Get customer's peer network dashboard
   */
  getPeerNetworkDashboard(customerId: string): {
    directPeers: PeerRelationship[];
    peerGroups: PeerGroup[];
    networkStats: {
      totalPeers: number;
      averageTrustScore: number;
      totalTransactions: number;
      successRate: number;
      networkStrength: number;
    };
    recentActivity: Array<{
      type: 'transaction' | 'group_join' | 'trust_update';
      description: string;
      timestamp: string;
      impact: number;
    }>;
    recommendations: {
      suggestedPeers: string[];
      suggestedGroups: string[];
      improvementActions: string[];
    };
  } {
    const directPeers = this.getDirectPeers(customerId);
    const customerGroups = this.getCustomerPeerGroups(customerId);
    const networkStats = this.calculateNetworkStats(customerId);

    return {
      directPeers,
      peerGroups: customerGroups,
      networkStats,
      recentActivity: this.getRecentPeerActivity(customerId),
      recommendations: this.generatePeerRecommendations(customerId),
    };
  }

  /**
   * Auto-create peer groups based on customer behavior
   */
  async autoCreatePeerGroups(): Promise<void> {
    // Find customers with similar transaction patterns
    const customers = this.customerManager.getAllCustomerProfiles();

    // Group by geographic region
    const geographicGroups = this.groupByGeographicRegion(customers);

    // Group by payment method preferences
    const paymentMethodGroups = this.groupByPaymentMethodPreferences(customers);

    // Group by transaction frequency
    const frequencyGroups = this.groupByTransactionFrequency(customers);

    // Create geographic peer groups
    for (const [region, regionCustomers] of Object.entries(geographicGroups)) {
      if (regionCustomers.length >= 5) {
        await this.createAutoPeerGroup(
          regionCustomers[0].personalInfo.customerId,
          `${region} Network`,
          'geographic',
          regionCustomers.slice(0, 20).map(c => c.personalInfo.customerId)
        );
      }
    }

    // Create payment method groups
    for (const [method, methodCustomers] of Object.entries(paymentMethodGroups)) {
      if (methodCustomers.length >= 5) {
        await this.createAutoPeerGroup(
          methodCustomers[0].personalInfo.customerId,
          `${method.toUpperCase()} Users`,
          'payment_circle',
          methodCustomers.slice(0, 15).map(c => c.personalInfo.customerId)
        );
      }
    }

    // Create high-frequency trader groups
    if (frequencyGroups.high.length >= 5) {
      await this.createAutoPeerGroup(
        frequencyGroups.high[0].personalInfo.customerId,
        'Active Traders',
        'interest_based',
        frequencyGroups.high.slice(0, 25).map(c => c.personalInfo.customerId)
      );
    }
  }

  // Private helper methods

  private getDefaultRulesForType(
    type: PeerGroup['type'],
    customRules: Partial<PeerGroupRules>
  ): PeerGroupRules {
    const baseRules: PeerGroupRules = {
      minTrustScore: 70,
      maxMembers: 50,
      allowedPaymentMethods: ['venmo', 'cashapp', 'paypal', 'zelle'],
      transactionLimits: {
        minAmount: 10,
        maxAmount: 1000,
        dailyLimit: 5000,
      },
      vipOnly: false,
      autoApprovalThreshold: 100,
      requireVerification: true,
      escrowRequired: true,
    };

    switch (type) {
      case 'trust_circle':
        return { ...baseRules, minTrustScore: 80, maxMembers: 20 };
      case 'vip_network':
        return { ...baseRules, minTrustScore: 90, maxMembers: 30, vipOnly: true };
      case 'payment_circle':
        return { ...baseRules, minTrustScore: 60, maxMembers: 100 };
      case 'geographic':
        return { ...baseRules, minTrustScore: 65, maxMembers: 75 };
      case 'interest_based':
        return { ...baseRules, minTrustScore: 70, maxMembers: 40 };
      default:
        return baseRules;
    }
  }

  private async initializePeerRelationships(memberIds: string[]): Promise<void> {
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const relationship: PeerRelationship = {
          customerId1: memberIds[i],
          customerId2: memberIds[j],
          trustScore: 75, // Start with moderate trust
          totalTransactions: 0,
          successfulTransactions: 0,
          totalVolume: 0,
          lastTransactionAt: new Date().toISOString(),
          commonPaymentMethods: [],
          averageAmount: 0,
          responseTime: 45, // minutes
          communicationRating: 80,
          reliabilityScore: 85,
          sharedGroups: [],
          preferredPaymentMethod: 'venmo',
        };

        const key = this.getRelationshipKey(memberIds[i], memberIds[j]);
        this.peerRelationships.set(key, relationship);
      }
    }
  }

  private async findPotentialPeers(customerId: string, paymentMethod: string): Promise<string[]> {
    const peers: string[] = [];
    const customerGroups = this.getCustomerPeerGroups(customerId);

    // Get peers from same groups
    for (const group of customerGroups) {
      for (const memberId of group.members) {
        if (memberId !== customerId && !peers.includes(memberId)) {
          peers.push(memberId);
        }
      }
    }

    // Get peers with similar payment method history
    const paymentStats = this.paymentValidation.getPaymentMethodStats(customerId);
    if (paymentStats[paymentMethod]) {
      // Find other customers with similar payment method usage
      const similarCustomers = await this.findCustomersWithSimilarPaymentPatterns(
        customerId,
        paymentMethod
      );
      peers.push(...similarCustomers.filter(id => !peers.includes(id)));
    }

    return peers.slice(0, 50); // Limit to 50 potential peers
  }

  private async calculatePeerMatchScore(
    requesterId: string,
    peerId: string,
    amount: number,
    paymentMethod: string,
    requestType: string
  ): Promise<{ score: number; reasons: string[] }> {
    let score = 50; // Base score
    const reasons: string[] = [];

    const relationship = this.getPeerRelationship(requesterId, peerId);

    if (relationship) {
      // Trust score factor
      score += (relationship.trustScore - 50) * 0.5;
      reasons.push(`Trust score: ${relationship.trustScore}/100`);

      // Transaction history factor
      if (relationship.totalTransactions > 0) {
        score += Math.min(relationship.totalTransactions * 2, 20);
        reasons.push(`Transaction history: ${relationship.totalTransactions} transactions`);
      }

      // Success rate factor
      if (relationship.totalTransactions > 0) {
        const successRate = relationship.successfulTransactions / relationship.totalTransactions;
        score += (successRate - 0.5) * 40;
        reasons.push(`Success rate: ${Math.round(successRate * 100)}%`);
      }

      // Payment method compatibility
      if (relationship.commonPaymentMethods.includes(paymentMethod)) {
        score += 15;
        reasons.push(`Common payment method: ${paymentMethod}`);
      }

      // Response time factor
      const responseBonus = Math.max(0, 60 - relationship.responseTime); // Faster response = higher score
      score += responseBonus * 0.2;
      reasons.push(`Average response time: ${relationship.responseTime} minutes`);
    }

    // Common groups factor
    const commonGroups = this.findCommonPeerGroups(requesterId, peerId);
    if (commonGroups.length > 0) {
      score += commonGroups.length * 5;
      reasons.push(`Common peer groups: ${commonGroups.length}`);
    }

    // Amount compatibility
    if (
      relationship &&
      Math.abs(amount - relationship.averageAmount) / relationship.averageAmount < 0.5
    ) {
      score += 10;
      reasons.push(`Amount matches historical average`);
    }

    return { score: Math.min(Math.max(score, 0), 100), reasons };
  }

  private getPeerRelationship(
    customerId1: string,
    customerId2: string
  ): PeerRelationship | undefined {
    const key1 = this.getRelationshipKey(customerId1, customerId2);
    const key2 = this.getRelationshipKey(customerId2, customerId1);

    return this.peerRelationships.get(key1) || this.peerRelationships.get(key2);
  }

  private getRelationshipKey(customerId1: string, customerId2: string): string {
    return [customerId1, customerId2].sort().join('_');
  }

  private findCommonPeerGroups(customerId1: string, customerId2: string): string[] {
    const groups1 = this.getCustomerPeerGroups(customerId1).map(g => g.id);
    const groups2 = this.getCustomerPeerGroups(customerId2).map(g => g.id);

    return groups1.filter(groupId => groups2.includes(groupId));
  }

  private getCustomerPeerGroups(customerId: string): PeerGroup[] {
    return Array.from(this.peerGroups.values()).filter(group => group.members.includes(customerId));
  }

  private getDirectPeers(customerId: string): PeerRelationship[] {
    const peers: PeerRelationship[] = [];

    for (const [key, relationship] of this.peerRelationships) {
      if (relationship.customerId1 === customerId || relationship.customerId2 === customerId) {
        peers.push(relationship);
      }
    }

    return peers;
  }

  private calculateNetworkStats(customerId: string): any {
    const directPeers = this.getDirectPeers(customerId);
    const customerGroups = this.getCustomerPeerGroups(customerId);

    const totalPeers = directPeers.length;
    const averageTrustScore =
      directPeers.length > 0
        ? directPeers.reduce((sum, p) => sum + p.trustScore, 0) / directPeers.length
        : 0;

    const totalTransactions = directPeers.reduce((sum, p) => sum + p.totalTransactions, 0);
    const successfulTransactions = directPeers.reduce(
      (sum, p) => sum + p.successfulTransactions,
      0
    );
    const successRate = totalTransactions > 0 ? successfulTransactions / totalTransactions : 0;

    const networkStrength = Math.min(
      (averageTrustScore / 100) * 40 +
        successRate * 100 * 0.4 +
        Math.min(customerGroups.length * 10, 20),
      100
    );

    return {
      totalPeers,
      averageTrustScore: Math.round(averageTrustScore),
      totalTransactions,
      successRate: Math.round(successRate * 100) / 100,
      networkStrength: Math.round(networkStrength),
    };
  }

  private getRecentPeerActivity(customerId: string): any[] {
    // This would be implemented to track recent peer network activity
    return [
      {
        type: 'transaction',
        description: 'Completed P2P transaction with peer network',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        impact: 5,
      },
      {
        type: 'group_join',
        description: 'Joined Venmo Users peer group',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        impact: 10,
      },
    ];
  }

  private generatePeerRecommendations(customerId: string): any {
    // Generate personalized recommendations
    return {
      suggestedPeers: ['peer123', 'peer456'],
      suggestedGroups: ['venmo_group', 'high_trust_network'],
      improvementActions: [
        'Complete more P2P transactions to build trust',
        'Join additional peer groups',
        'Maintain high success rate',
      ],
    };
  }

  private groupByGeographicRegion(customers: CustomerProfile[]): Record<string, CustomerProfile[]> {
    const groups: Record<string, CustomerProfile[]> = {};

    for (const customer of customers) {
      const region = customer.contactInfo?.address?.state || 'Unknown';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(customer);
    }

    return groups;
  }

  private groupByPaymentMethodPreferences(
    customers: CustomerProfile[]
  ): Record<string, CustomerProfile[]> {
    const groups: Record<string, CustomerProfile[]> = {};

    for (const customer of customers) {
      // This would analyze customer's payment method preferences
      const preferredMethod = 'venmo'; // Placeholder
      if (!groups[preferredMethod]) {
        groups[preferredMethod] = [];
      }
      groups[preferredMethod].push(customer);
    }

    return groups;
  }

  private groupByTransactionFrequency(customers: CustomerProfile[]): {
    high: CustomerProfile[];
    medium: CustomerProfile[];
    low: CustomerProfile[];
  } {
    const high: CustomerProfile[] = [];
    const medium: CustomerProfile[] = [];
    const low: CustomerProfile[] = [];

    for (const customer of customers) {
      const transactionCount = customer.financialProfile.totalTransactions || 0;
      if (transactionCount > 50) {
        high.push(customer);
      } else if (transactionCount > 20) {
        medium.push(customer);
      } else {
        low.push(customer);
      }
    }

    return { high, medium, low };
  }

  private async createAutoPeerGroup(
    creatorId: string,
    name: string,
    type: PeerGroup['type'],
    members: string[]
  ): Promise<void> {
    try {
      await this.createPeerGroup(creatorId, name, type, members.slice(1), {});
    } catch (error) {
      // Silently handle auto-creation failures
      console.log(`Auto-creation of ${name} group failed:`, error);
    }
  }

  private async findCustomersWithSimilarPaymentPatterns(
    customerId: string,
    paymentMethod: string
  ): Promise<string[]> {
    // This would analyze payment patterns across customers
    // For now, return some mock similar customers
    return ['customer456', 'customer789'];
  }

  private async findRelevantGroups(
    customerId: string,
    paymentMethod: string
  ): Promise<PeerGroup[]> {
    return Array.from(this.peerGroups.values()).filter(
      group =>
        group.members.includes(customerId) &&
        group.commonPaymentMethods.includes(paymentMethod) &&
        group.activityScore > 70
    );
  }

  private async calculateGroupMatchScore(
    customerId: string,
    group: PeerGroup,
    amount: number,
    paymentMethod: string
  ): Promise<number> {
    let score = 50;

    // Group trust score
    score += (group.trustScore - 50) * 0.3;

    // Group success rate
    score += (group.successRate - 0.5) * 50;

    // Group size (prefer medium-sized groups)
    const sizeBonus = group.members.length > 5 && group.members.length < 30 ? 15 : 0;
    score += sizeBonus;

    // Payment method compatibility
    if (group.commonPaymentMethods.includes(paymentMethod)) {
      score += 10;
    }

    // Amount within group limits
    if (
      amount >= group.rules.transactionLimits.minAmount &&
      amount <= group.rules.transactionLimits.maxAmount
    ) {
      score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  private async updatePeerRelationship(
    customerId1: string,
    customerId2: string,
    amount: number,
    success: boolean
  ): Promise<void> {
    const relationship = this.getPeerRelationship(customerId1, customerId2);
    if (!relationship) return;

    relationship.totalTransactions++;
    relationship.totalVolume += amount;
    relationship.lastTransactionAt = new Date().toISOString();

    if (success) {
      relationship.successfulTransactions++;
    }

    // Update average amount
    relationship.averageAmount = relationship.totalVolume / relationship.totalTransactions;

    // Update trust score based on success
    if (success) {
      relationship.trustScore = Math.min(relationship.trustScore + 2, 100);
      relationship.reliabilityScore = Math.min(relationship.reliabilityScore + 1, 100);
    } else {
      relationship.trustScore = Math.max(relationship.trustScore - 5, 0);
      relationship.reliabilityScore = Math.max(relationship.reliabilityScore - 3, 0);
    }
  }

  private async updatePeerGroupStats(
    groupId: string,
    amount: number,
    success: boolean
  ): Promise<void> {
    const group = this.peerGroups.get(groupId);
    if (!group) return;

    group.totalTransactions++;
    group.totalVolume += amount;

    if (success) {
      group.successRate =
        (group.successRate * (group.totalTransactions - 1) + 1) / group.totalTransactions;
      group.trustScore = Math.min(group.trustScore + 1, 100);
    } else {
      group.successRate =
        (group.successRate * (group.totalTransactions - 1)) / group.totalTransactions;
      group.trustScore = Math.max(group.trustScore - 2, 0);
    }
  }

  private analyzeGroupPaymentMethods(memberIds: string[]): string[] {
    const methodCounts: Record<string, number> = {};

    for (const memberId of memberIds) {
      const paymentStats = this.paymentValidation.getPaymentMethodStats(memberId);
      for (const method of Object.keys(paymentStats)) {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      }
    }

    // Return methods used by at least 30% of members
    const threshold = memberIds.length * 0.3;
    return Object.entries(methodCounts)
      .filter(([, count]) => count >= threshold)
      .map(([method]) => method);
  }

  private generateGroupId(): string {
    return `peer_group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
