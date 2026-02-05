/**
 * Agent Profile Manager Module
 * Handles agent profile operations, hierarchy management, and relationships
 */

import type {
  AgentProfile,
  AgentProfileCreate,
  AgentProfileUpdate,
  AgentHierarchyNode,
  AgentCustomerRelationship,
  AgentPermissions,
  AgentConfiguration,
  AgentType,
  AgentStatus,
} from '../../../core/types/hierarchy';

export class AgentProfileManager {
  private agents: Map<string, AgentProfile> = new Map();
  private hierarchy: Map<string, AgentHierarchyNode> = new Map();
  private customerRelationships: Map<string, AgentCustomerRelationship[]> = new Map();
  private agentIndex: Map<string, Set<string>> = new Map(); // For efficient querying

  constructor() {
    this.initializeIndexes();
  }

  /**
   * Create a new agent profile
   */
  createAgent(agentData: AgentProfileCreate): AgentProfile {
    // Validate agent data
    this.validateAgentData(agentData);

    const agent: AgentProfile = {
      ...agentData,
      id: this.generateAgentId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
      subAgents: [],
      lastCommissionDate: new Date(),
    };

    this.agents.set(agent.id, agent);
    this.updateIndexes(agent);

    // Update hierarchy
    this.updateHierarchy(agent);

    console.log(`👤 Created agent: ${agent.login} (${agent.id})`);
    return agent;
  }

  /**
   * Update agent profile
   */
  updateAgent(agentId: string, updates: AgentProfileUpdate): AgentProfile | null {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`⚠️ Agent not found: ${agentId}`);
      return null;
    }

    // Remove from old indexes
    this.removeFromIndexes(agent);

    const updatedAgent: AgentProfile = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    // Validate updated data
    this.validateAgentData(updatedAgent);

    this.agents.set(agentId, updatedAgent);
    this.updateIndexes(updatedAgent);

    // Update hierarchy if parent changed
    if (updates.parentAgentID !== undefined) {
      this.updateHierarchy(updatedAgent);
    }

    console.log(`📝 Updated agent: ${updatedAgent.login} (${agentId})`);
    return updatedAgent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentProfile | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get agent by login
   */
  getAgentByLogin(login: string): AgentProfile | null {
    for (const agent of this.agents.values()) {
      if (agent.login === login) {
        return agent;
      }
    }
    return null;
  }

  /**
   * Get agents by type
   */
  getAgentsByType(agentType: AgentType): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => agent.agentType === agentType);
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentStatus): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }

  /**
   * Get agents by office
   */
  getAgentsByOffice(office: string): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => agent.office === office);
  }

  /**
   * Get sub-agents for an agent
   */
  getSubAgents(agentId: string): AgentProfile[] {
    const agent = this.agents.get(agentId);
    if (!agent) return [];

    return agent.subAgents
      .map(subAgentId => this.agents.get(subAgentId))
      .filter((subAgent): subAgent is AgentProfile => subAgent !== undefined);
  }

  /**
   * Get agent hierarchy
   */
  getAgentHierarchy(agentId: string): AgentHierarchyNode | null {
    return this.hierarchy.get(agentId) || null;
  }

  /**
   * Get full hierarchy tree
   */
  getHierarchyTree(rootAgentId?: string): AgentHierarchyNode[] {
    const agents = rootAgentId
      ? [this.agents.get(rootAgentId)].filter(Boolean)
      : Array.from(this.agents.values()).filter(agent => !agent.parentAgentID);

    return agents.map(agent => this.buildHierarchyNode(agent!));
  }

  /**
   * Assign customer to agent
   */
  assignCustomerToAgent(
    customerId: string,
    agentId: string,
    relationshipType: 'primary' | 'secondary' | 'temporary' = 'primary',
    commissionSplit: number = 100,
    assignedBy: string
  ): AgentCustomerRelationship {
    const relationship: AgentCustomerRelationship = {
      agentId,
      customerId,
      relationshipType,
      assignedAt: new Date(),
      assignedBy,
      commissionSplit,
    };

    if (!this.customerRelationships.has(customerId)) {
      this.customerRelationships.set(customerId, []);
    }

    this.customerRelationships.get(customerId)!.push(relationship);

    console.log(`🔗 Assigned customer ${customerId} to agent ${agentId} (${relationshipType})`);
    return relationship;
  }

  /**
   * Get customer relationships
   */
  getCustomerRelationships(customerId: string): AgentCustomerRelationship[] {
    return this.customerRelationships.get(customerId) || [];
  }

  /**
   * Get primary agent for customer
   */
  getPrimaryAgentForCustomer(customerId: string): AgentProfile | null {
    const relationships = this.customerRelationships.get(customerId) || [];
    const primaryRelationship = relationships.find(rel => rel.relationshipType === 'primary');

    if (primaryRelationship) {
      return this.agents.get(primaryRelationship.agentId) || null;
    }

    return null;
  }

  /**
   * Get customers for agent
   */
  getCustomersForAgent(agentId: string): Array<{
    customerId: string;
    relationship: AgentCustomerRelationship;
  }> {
    const customers: Array<{
      customerId: string;
      relationship: AgentCustomerRelationship;
    }> = [];

    for (const [customerId, relationships] of this.customerRelationships) {
      const agentRelationship = relationships.find(rel => rel.agentId === agentId);
      if (agentRelationship) {
        customers.push({
          customerId,
          relationship: agentRelationship,
        });
      }
    }

    return customers;
  }

  /**
   * Update agent permissions
   */
  updateAgentPermissions(
    agentId: string,
    permissions: Partial<AgentPermissions>
  ): AgentProfile | null {
    return this.updateAgent(agentId, {
      permissions: {
        ...this.agents.get(agentId)?.permissions,
        ...permissions,
      } as AgentPermissions,
    });
  }

  /**
   * Update agent configuration
   */
  updateAgentConfiguration(
    agentId: string,
    configuration: Partial<AgentConfiguration>
  ): AgentProfile | null {
    return this.updateAgent(agentId, {
      configuration: {
        ...this.agents.get(agentId)?.configuration,
        ...configuration,
      } as AgentConfiguration,
    });
  }

  /**
   * Suspend agent
   */
  suspendAgent(agentId: string, reason: string): AgentProfile | null {
    return this.updateAgent(agentId, {
      status: 'suspended',
      metadata: {
        ...this.agents.get(agentId)?.metadata,
        suspensionReason: reason,
        suspendedAt: new Date(),
      },
    });
  }

  /**
   * Reactivate agent
   */
  reactivateAgent(agentId: string): AgentProfile | null {
    return this.updateAgent(agentId, {
      status: 'active',
      metadata: {
        ...this.agents.get(agentId)?.metadata,
        reactivatedAt: new Date(),
      },
    });
  }

  /**
   * Get agent statistics
   */
  getAgentStatistics(): {
    totalAgents: number;
    byType: Record<AgentType, number>;
    byStatus: Record<AgentStatus, number>;
    byOffice: Record<string, number>;
    averageHierarchyDepth: number;
    totalCustomerAssignments: number;
  } {
    const agents = Array.from(this.agents.values());

    const stats = {
      totalAgents: agents.length,
      byType: {} as Record<AgentType, number>,
      byStatus: {} as Record<AgentStatus, number>,
      byOffice: {} as Record<string, number>,
      averageHierarchyDepth: 0,
      totalCustomerAssignments: 0,
    };

    // Count by type, status, office
    agents.forEach(agent => {
      stats.byType[agent.agentType] = (stats.byType[agent.agentType] || 0) + 1;
      stats.byStatus[agent.status] = (stats.byStatus[agent.status] || 0) + 1;
      stats.byOffice[agent.office] = (stats.byOffice[agent.office] || 0) + 1;
    });

    // Calculate hierarchy depth
    const depths = Array.from(this.hierarchy.values()).map(node => node.level);
    stats.averageHierarchyDepth =
      depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;

    // Count customer assignments
    for (const relationships of this.customerRelationships.values()) {
      stats.totalCustomerAssignments += relationships.length;
    }

    return stats;
  }

  // Private methods

  private validateAgentData(agentData: Partial<AgentProfile>): void {
    if (!agentData.login) {
      throw new Error('Agent login is required');
    }

    if (!agentData.customerID) {
      throw new Error('Customer ID is required');
    }

    if (!agentData.agentID) {
      throw new Error('Agent ID is required');
    }

    // Check for duplicate login
    for (const agent of this.agents.values()) {
      if (agent.login === agentData.login && agent.id !== agentData.id) {
        throw new Error(`Agent login '${agentData.login}' already exists`);
      }
    }

    // Validate parent agent exists
    if (agentData.parentAgentID && !this.agents.has(agentData.parentAgentID)) {
      throw new Error(`Parent agent ${agentData.parentAgentID} does not exist`);
    }
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeIndexes(): void {
    const agentTypes: AgentType[] = ['U', 'A', 'M', 'S'];
    const statuses: AgentStatus[] = ['active', 'inactive', 'suspended', 'terminated'];

    agentTypes.forEach(type => this.agentIndex.set(`type_${type}`, new Set()));
    statuses.forEach(status => this.agentIndex.set(`status_${status}`, new Set()));
  }

  private updateIndexes(agent: AgentProfile): void {
    this.addToIndex(`type_${agent.agentType}`, agent.id);
    this.addToIndex(`status_${agent.status}`, agent.id);
    this.addToIndex(`office_${agent.office}`, agent.id);
  }

  private removeFromIndexes(agent: AgentProfile): void {
    this.removeFromIndex(`type_${agent.agentType}`, agent.id);
    this.removeFromIndex(`status_${agent.status}`, agent.id);
    this.removeFromIndex(`office_${agent.office}`, agent.id);
  }

  private addToIndex(indexKey: string, agentId: string): void {
    if (!this.agentIndex.has(indexKey)) {
      this.agentIndex.set(indexKey, new Set());
    }
    this.agentIndex.get(indexKey)!.add(agentId);
  }

  private removeFromIndex(indexKey: string, agentId: string): void {
    const indexSet = this.agentIndex.get(indexKey);
    if (indexSet) {
      indexSet.delete(agentId);
    }
  }

  private updateHierarchy(agent: AgentProfile): void {
    // Build hierarchy node
    const node = this.buildHierarchyNode(agent);
    this.hierarchy.set(agent.id, node);

    // Update parent relationships
    if (agent.parentAgentID) {
      const parentAgent = this.agents.get(agent.parentAgentID);
      if (parentAgent) {
        parentAgent.subAgents = parentAgent.subAgents || [];
        if (!parentAgent.subAgents.includes(agent.id)) {
          parentAgent.subAgents.push(agent.id);
          this.agents.set(parentAgent.id, parentAgent);
        }
      }
    }

    // Update all ancestor nodes
    this.updateAncestorNodes(agent.id);
  }

  private buildHierarchyNode(agent: AgentProfile, level: number = 0): AgentHierarchyNode {
    const children = this.getSubAgents(agent.id).map(subAgent =>
      this.buildHierarchyNode(subAgent, level + 1)
    );

    return {
      agent,
      level,
      children,
      totalSubAgents:
        children.length + children.reduce((sum, child) => sum + child.totalSubAgents, 0),
      activeSubAgents:
        children.filter(child => child.agent.status === 'active').length +
        children.reduce((sum, child) => sum + child.activeSubAgents, 0),
      totalCommission: agent.totalCommission,
      monthlyCommission: 0, // Would be calculated based on current month
      performance: {
        period: 'monthly',
        startDate: new Date(),
        endDate: new Date(),
        totalCustomers: 0,
        activeCustomers: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalWagers: 0,
        totalSettlements: 0,
        grossRevenue: 0,
        netRevenue: 0,
        commissionEarned: 0,
        commissionPaid: 0,
        customerRetentionRate: 0,
        averageBetSize: 0,
        topPerformingSport: '',
        customerSatisfaction: 0,
        responseTime: 0,
      },
    };
  }

  private updateAncestorNodes(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent?.parentAgentID) return;

    // Recursively update all ancestors
    const parent = this.agents.get(agent.parentAgentID);
    if (parent) {
      this.updateHierarchy(parent);
      this.updateAncestorNodes(parent.id);
    }
  }
}
