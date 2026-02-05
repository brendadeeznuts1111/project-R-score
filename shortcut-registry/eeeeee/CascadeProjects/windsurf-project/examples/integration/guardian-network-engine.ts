#!/usr/bin/env bun
// Cross-Family Guardian Networks - Graph-Based Sponsorship Webs
// Part of CROSS-FAMILY GUARDIAN NETWORKS detonation

import { feature } from 'bun:bundle';

// Network Graph Types
interface GuardianNode {
  id: string;
  name: string;
  email: string;
  household: string;
  role: 'PRIMARY' | 'SECONDARY' | 'APPROVED_CONTACT' | 'EXTENDED' | 'GRANDPARENT' | 'AUNT_UNCLE' | 'STEPPARENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE';
  vpcVerified?: string; // timestamp for under-13 verification
  joinedAt: string;
  lastActive: string;
  permissions: {
    canSpend: boolean;
    canViewTransactions: boolean;
    canSetLimits: boolean;
    canApprove: boolean;
    canReceiveAlerts: boolean;
  };
}

interface NetworkEdge {
  id: string;
  from: string; // guardian ID
  to: string; // guardian ID
  teenId: string; // the teen they're connected through
  type: 'SPONSOR' | 'SHARED_VISIBILITY' | 'BACKUP' | 'EXTENDED_FAMILY' | 'CROSS_HOUSEHOLD';
  consented: boolean;
  consentedAt?: string;
  vpcVerified?: string;
  strength: number; // 0-1 relationship strength
  householdLink: boolean; // connects different households
}

interface TeenNetwork {
  teenId: string;
  primaryGuardian: string;
  guardians: Map<string, GuardianNode>;
  edges: Map<string, NetworkEdge>;
  networkTension: number;
  lastUpdated: string;
  sharedSettings: {
    collectiveSpendLimit: number;
    sharedVisibility: boolean;
    crossHouseholdAlerts: boolean;
    autoFailover: boolean;
  };
}

interface NetworkAlert {
  id: string;
  teenId: string;
  type: 'NETWORK_RISK' | 'GUARDIAN_SUSPENDED' | 'CROSS_LINK_ADDED' | 'TENSION_SPIKE' | 'FAILOVER_ACTIVATED';
  message: string;
  affectedGuardians: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actionRequired: boolean;
}

// Cross-Family Guardian Network Engine
export class GuardianNetworkEngine {
  private static instance: GuardianNetworkEngine;
  private networks = new Map<string, TeenNetwork>();
  private networkAlerts = new Map<string, NetworkAlert[]>();
  private tensionField = new Map<string, number>();

  static getInstance(): GuardianNetworkEngine {
    if (!GuardianNetworkEngine.instance) {
      GuardianNetworkEngine.instance = new GuardianNetworkEngine();
    }
    return GuardianNetworkEngine.instance;
  }

  // Initialize network for a teen
  async initializeTeenNetwork(teenId: string, primaryGuardian: GuardianNode): Promise<TeenNetwork> {
    const network: TeenNetwork = {
      teenId,
      primaryGuardian: primaryGuardian.id,
      guardians: new Map([[primaryGuardian.id, primaryGuardian]]),
      edges: new Map(),
      networkTension: 0,
      lastUpdated: new Date().toISOString(),
      sharedSettings: {
        collectiveSpendLimit: 300,
        sharedVisibility: true,
        crossHouseholdAlerts: true,
        autoFailover: true
      }
    };

    this.networks.set(teenId, network);
    console.log(`🕸️ Initialized guardian network for teen ${teenId} with primary guardian ${primaryGuardian.name}`);
    
    return network;
  }

  // Add cross-family guardian link
  async addCrossFamilyLink(
    teenId: string, 
    newGuardian: GuardianNode, 
    approverId: string,
    edgeType: NetworkEdge['type'] = 'EXTENDED_FAMILY'
  ): Promise<void> {
    const network = this.networks.get(teenId);
    if (!network) {
      throw new Error(`Teen network not found: ${teenId}`);
    }

    // 1. Verify eligibility and consent requirements
    const approver = network.guardians.get(approverId);
    if (!approver || !approver.permissions.canApprove) {
      throw new Error('Approver does not have permission to add guardians');
    }

    // 2. Check if VPC verification is required (under-13)
    if (await this.requiresVPC(teenId, newGuardian)) {
      await this.triggerVPCFlow(newGuardian);
      newGuardian.vpcVerified = new Date().toISOString();
    }

    // 3. Add guardian node
    newGuardian.status = 'PENDING';
    newGuardian.joinedAt = new Date().toISOString();
    network.guardians.set(newGuardian.id, newGuardian);

    // 4. Create network edge
    const edge: NetworkEdge = {
      id: `${approverId}-${newGuardian.id}-${Date.now()}`,
      from: approverId,
      to: newGuardian.id,
      teenId,
      type: edgeType,
      consented: true,
      consentedAt: new Date().toISOString(),
      vpcVerified: newGuardian.vpcVerified,
      strength: 0.8,
      householdLink: approver.household !== newGuardian.household
    };

    network.edges.set(edge.id, edge);
    network.lastUpdated = new Date().toISOString();

    // 5. Activate guardian after consent
    newGuardian.status = 'ACTIVE';

    // 6. Propagate tension and update shared dashboard
    await this.propagateTensionAcrossNetwork(teenId);
    await this.updateSharedDashboard(teenId);

    // 7. Log cross-family link
    this.logCrossFamilyLink(teenId, newGuardian, approver, edge);

    // 8. Broadcast network alert
    await this.broadcastNetworkAlert(teenId, {
      type: 'CROSS_LINK_ADDED',
      message: `New guardian added: ${newGuardian.name} from ${newGuardian.household}`,
      affectedGuardians: Array.from(network.guardians.keys()),
      severity: 'medium',
      actionRequired: false
    });

    console.log(`🔗 Cross-family link added: ${newGuardian.name} (${newGuardian.household}) → teen ${teenId}`);
  }

  // Propagate tension across the network
  async propagateTensionAcrossNetwork(teenId: string): Promise<void> {
    const network = this.networks.get(teenId);
    if (!network) return;

    // Calculate network tension based on guardian statuses
    let totalTension = 0;
    let activeGuardians = 0;

    const guardianEntries = Array.from(network.guardians.entries());
    for (const [guardianId, guardian] of guardianEntries) {
      if (guardian.status === 'ACTIVE') {
        activeGuardians++;
        // Add individual guardian tension (mock calculation)
        const guardianTension = await this.calculateGuardianTension(guardianId);
        totalTension += guardianTension;
      } else if (guardian.status === 'SUSPENDED') {
        totalTension += 0.9; // High tension for suspended guardians
      }
    }

    network.networkTension = activeGuardians > 0 ? totalTension / activeGuardians : 1;
    this.tensionField.set(teenId, network.networkTension);

    // Trigger network-wide alerts if tension is high
    if (network.networkTension > 0.8) {
      await this.broadcastNetworkAlert(teenId, {
        type: 'NETWORK_RISK',
        message: `High network tension detected: ${(network.networkTension * 100).toFixed(1)}%`,
        affectedGuardians: Array.from(network.guardians.keys()),
        severity: network.networkTension > 0.9 ? 'critical' : 'high',
        actionRequired: true
      });
    }
  }

  // Activate distributed failover
  async activateDistributedFailover(teenId: string, failedGuardianId: string): Promise<string[]> {
    const network = this.networks.get(teenId);
    if (!network) {
      throw new Error(`Teen network not found: ${teenId}`);
    }

    const failedGuardian = network.guardians.get(failedGuardianId);
    if (!failedGuardian) {
      throw new Error(`Guardian not found: ${failedGuardianId}`);
    }

    // Update failed guardian status
    failedGuardian.status = 'SUSPENDED';

    // Find backup guardians (cross-household优先)
    const backupGuardians: string[] = [];
    const crossHouseholdEdges = Array.from(network.edges.values())
      .filter(edge => edge.householdLink && edge.to !== failedGuardianId)
      .sort((a, b) => b.strength - a.strength);

    for (const edge of crossHouseholdEdges) {
      const backupGuardian = network.guardians.get(edge.to);
      if (backupGuardian && backupGuardian.status === 'ACTIVE') {
        backupGuardians.push(backupGuardian.id);
        
        // Elevate backup guardian permissions temporarily
        if (!backupGuardian.permissions.canSpend) {
          backupGuardian.permissions.canSpend = true;
        }
      }
    }

    // If no cross-household backups, use same-household backups
    if (backupGuardians.length === 0) {
      const sameHouseholdEdges = Array.from(network.edges.values())
        .filter(edge => !edge.householdLink && edge.to !== failedGuardianId)
        .sort((a, b) => b.strength - a.strength);

      for (const edge of sameHouseholdEdges.slice(0, 2)) {
        const backupGuardian = network.guardians.get(edge.to);
        if (backupGuardian && backupGuardian.status === 'ACTIVE') {
          backupGuardians.push(backupGuardian.id);
        }
      }
    }

    // Update network tension and broadcast alert
    await this.propagateTensionAcrossNetwork(teenId);
    await this.broadcastNetworkAlert(teenId, {
      type: 'FAILOVER_ACTIVATED',
      message: `Failover activated for ${failedGuardian.name}. Backup guardians: ${backupGuardians.length}`,
      affectedGuardians: backupGuardians,
      severity: 'high',
      actionRequired: true
    });

    console.log(`🛡️ Distributed failover activated for teen ${teenId}: ${backupGuardians.length} backup guardians`);
    return backupGuardians;
  }

  // Get network visualization data
  getNetworkVisualization(teenId: string): {
    nodes: Array<{ id: string; name: string; household: string; role: string; status: string; color: string }>;
    edges: Array<{ from: string; to: string; type: string; strength: number; householdLink: boolean }>;
    tension: number;
  } {
    const network = this.networks.get(teenId);
    if (!network) {
      return { nodes: [], edges: [], tension: 0 };
    }

    const nodes = Array.from(network.guardians.values()).map(guardian => ({
      id: guardian.id,
      name: guardian.name,
      household: guardian.household,
      role: guardian.role,
      status: guardian.status,
      color: this.getNodeColor(guardian)
    }));

    const edges = Array.from(network.edges.values()).map(edge => ({
      from: edge.from,
      to: edge.to,
      type: edge.type,
      strength: edge.strength,
      householdLink: edge.householdLink
    }));

    return {
      nodes,
      edges,
      tension: network.networkTension
    };
  }

  // Get shared dashboard data
  getSharedDashboard(teenId: string): {
    network: TeenNetwork;
    activityFeed: Array<{
      id: string;
      type: string;
      guardian: string;
      message: string;
      timestamp: string;
    }>;
    collectiveMetrics: {
      totalGuardians: number;
      activeGuardians: number;
      crossHouseholdLinks: number;
      networkHealth: number;
    };
  } {
    const network = this.networks.get(teenId);
    if (!network) {
      throw new Error(`Teen network not found: ${teenId}`);
    }

    const activeGuardians = Array.from(network.guardians.values())
      .filter(g => g.status === 'ACTIVE').length;
    
    const crossHouseholdLinks = Array.from(network.edges.values())
      .filter(edge => edge.householdLink).length;

    const networkHealth = 1 - network.networkTension;

    return {
      network,
      activityFeed: this.generateMockActivityFeed(teenId),
      collectiveMetrics: {
        totalGuardians: network.guardians.size,
        activeGuardians,
        crossHouseholdLinks,
        networkHealth
      }
    };
  }

  // Private helper methods
  private async requiresVPC(teenId: string, guardian: GuardianNode): Promise<boolean> {
    // Mock: require VPC for under-13 teens or cross-household links
    return Math.random() > 0.7; // 30% chance for demo
  }

  private async triggerVPCFlow(guardian: GuardianNode): Promise<void> {
    console.log(`🔐 Triggering VPC flow for guardian ${guardian.name}`);
    // In production: initiate age verification process
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async calculateGuardianTension(guardianId: string): Promise<number> {
    // Mock tension calculation based on various factors
    return Math.random() * 0.6; // 0-60% base tension
  }

  private async updateSharedDashboard(teenId: string): Promise<void> {
    console.log(`📊 Updating shared dashboard for teen ${teenId}`);
    // In production: update real-time dashboard for all connected guardians
  }

  private async broadcastNetworkAlert(teenId: string, alertData: Omit<NetworkAlert, 'id' | 'timestamp' | 'teenId'>): Promise<void> {
    const alert: NetworkAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      teenId,
      ...alertData,
      timestamp: new Date().toISOString()
    };

    if (!this.networkAlerts.has(teenId)) {
      this.networkAlerts.set(teenId, []);
    }
    this.networkAlerts.get(teenId)!.push(alert);

    console.log(`🚨 Network alert broadcasted: ${alert.message}`);
    // In production: send WebSocket notifications to all guardians
  }

  private logCrossFamilyLink(teenId: string, newGuardian: GuardianNode, approver: GuardianNode, edge: NetworkEdge): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'CROSS_FAMILY_LINK',
      teenId,
      newGuardian: {
        id: newGuardian.id,
        name: newGuardian.name,
        household: newGuardian.household,
        role: newGuardian.role
      },
      approver: {
        id: approver.id,
        name: approver.name,
        household: approver.household
      },
      edge: {
        type: edge.type,
        householdLink: edge.householdLink,
        strength: edge.strength
      },
      vpcVerified: !!newGuardian.vpcVerified
    };

    console.log(`🔗 CROSS_FAMILY_LINK: ${JSON.stringify(logEntry)}`);
    // In production: write to immutable audit log
  }

  private generateMockActivityFeed(teenId: string): Array<any> {
    return [
      {
        id: '1',
        type: 'SPEND_LIMIT_UPDATED',
        guardian: 'Mom',
        message: 'Updated weekly spend limit to $150',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        type: 'GUARDIAN_ADDED',
        guardian: 'Dad',
        message: 'Added Grandma as extended family guardian',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '3',
        type: 'ALLOWANCE_SETUP',
        guardian: 'Grandma',
        message: 'Setup $20 weekly allowance',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      }
    ];
  }

  private getNodeColor(guardian: GuardianNode): string {
    switch (guardian.status) {
      case 'ACTIVE': return '#22c55e';
      case 'SUSPENDED': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      case 'INACTIVE': return '#6b7280';
      default: return '#3b82f6';
    }
  }

  // Network analytics
  getNetworkAnalytics(teenId: string): {
    networkStrength: number;
    redundancyScore: number;
    crossHouseholdConnectivity: number;
    riskDistribution: Map<string, number>;
    recommendations: string[];
  } {
    const network = this.networks.get(teenId);
    if (!network) {
      return {
        networkStrength: 0,
        redundancyScore: 0,
        crossHouseholdConnectivity: 0,
        riskDistribution: new Map(),
        recommendations: []
      };
    }

    const activeGuardians = Array.from(network.guardians.values())
      .filter(g => g.status === 'ACTIVE');
    
    const crossHouseholdEdges = Array.from(network.edges.values())
      .filter(edge => edge.householdLink);

    const networkStrength = activeGuardians.length / Math.max(network.guardians.size, 1);
    const redundancyScore = Math.min(crossHouseholdEdges.length / 3, 1); // Max 3 cross-household links for full redundancy
    const crossHouseholdConnectivity = crossHouseholdEdges.length / Math.max(network.edges.size, 1);

    const riskDistribution = new Map<string, number>();
    activeGuardians.forEach(guardian => {
      riskDistribution.set(guardian.id, Math.random() * 0.5); // Mock risk scores
    });

    const recommendations: string[] = [];
    if (crossHouseholdEdges.length < 2) {
      recommendations.push('Add more cross-household guardians for better redundancy');
    }
    if (network.networkTension > 0.6) {
      recommendations.push('Network tension elevated - consider adding backup guardians');
    }
    if (activeGuardians.length < 3) {
      recommendations.push('Add more active guardians to improve network resilience');
    }

    return {
      networkStrength,
      redundancyScore,
      crossHouseholdConnectivity,
      riskDistribution,
      recommendations
    };
  }
}

// Network Visualization Helper
export class NetworkVisualizationHelper {
  static generateGraphConfig(networkData: any): {
    nodes: Array<{ id: string; label: string; color: string; size: number; shape: string }>;
    edges: Array<{ from: string; to: string; color: string; width: number; dashes: boolean }>;
  } {
    const nodes = networkData.nodes.map((node: any) => ({
      id: node.id,
      label: `${node.name}\n${node.household}`,
      color: node.color,
      size: node.role === 'PRIMARY' ? 30 : 20,
      shape: node.role === 'PRIMARY' ? 'star' : 'dot'
    }));

    const edges = networkData.edges.map((edge: any) => ({
      from: edge.from,
      to: edge.to,
      color: edge.householdLink ? '#8b5cf6' : '#3b82f6',
      width: edge.strength * 5,
      dashes: edge.type === 'SHARED_VISIBILITY'
    }));

    return { nodes, edges };
  }
}

// Export singleton instance
export const guardianNetwork = GuardianNetworkEngine.getInstance();

console.log('🕸️ Cross-Family Guardian Network Engine Initialized');
console.log('🔗 Graph-Based Sponsorship Webs: ACTIVE');
console.log('🛡️ Distributed Failover: ENABLED');
console.log('📊 Shared Visibility: CONSOLIDATED');
console.log('🚨 Tension Diffusion: REAL-TIME');
