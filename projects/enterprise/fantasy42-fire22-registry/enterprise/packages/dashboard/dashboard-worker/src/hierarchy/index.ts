/**
 * Hierarchy System
 * Consolidated modular hierarchy system with agent management, commissions, and performance tracking
 */

import { AgentProfileManager } from './agents/agent-profile-manager';
import { CommissionManager } from './commissions/commission-manager';

export * from '../../core/types/hierarchy';

export class HierarchySystem {
  private agentManager: AgentProfileManager;
  private commissionManager: CommissionManager;

  constructor() {
    this.agentManager = new AgentProfileManager();
    this.commissionManager = new CommissionManager();

    this.initializeSystem();
  }

  /**
   * Initialize the hierarchy system
   */
  private async initializeSystem(): Promise<void> {
    console.log('👑 Initializing Hierarchy System...');

    // Any additional initialization would go here

    console.log('✅ Hierarchy System initialized successfully');
  }

  // Agent Profile Management Methods

  /**
   * Create agent
   */
  createAgent(agentData: any) {
    return this.agentManager.createAgent(agentData);
  }

  /**
   * Update agent
   */
  updateAgent(agentId: string, updates: any) {
    return this.agentManager.updateAgent(agentId, updates);
  }

  /**
   * Get agent
   */
  getAgent(agentId: string) {
    return this.agentManager.getAgent(agentId);
  }

  /**
   * Get agent by login
   */
  getAgentByLogin(login: string) {
    return this.agentManager.getAgentByLogin(login);
  }

  /**
   * Get agents by type
   */
  getAgentsByType(agentType: any) {
    return this.agentManager.getAgentsByType(agentType);
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: any) {
    return this.agentManager.getAgentsByStatus(status);
  }

  /**
   * Get agents by office
   */
  getAgentsByOffice(office: string) {
    return this.agentManager.getAgentsByOffice(office);
  }

  /**
   * Get sub-agents
   */
  getSubAgents(agentId: string) {
    return this.agentManager.getSubAgents(agentId);
  }

  /**
   * Get agent hierarchy
   */
  getAgentHierarchy(agentId: string) {
    return this.agentManager.getAgentHierarchy(agentId);
  }

  /**
   * Get hierarchy tree
   */
  getHierarchyTree(rootAgentId?: string) {
    return this.agentManager.getHierarchyTree(rootAgentId);
  }

  /**
   * Assign customer to agent
   */
  assignCustomerToAgent(
    customerId: string,
    agentId: string,
    relationshipType?: any,
    commissionSplit?: number,
    assignedBy?: string
  ) {
    return this.agentManager.assignCustomerToAgent(
      customerId,
      agentId,
      relationshipType,
      commissionSplit,
      assignedBy
    );
  }

  /**
   * Get customer relationships
   */
  getCustomerRelationships(customerId: string) {
    return this.agentManager.getCustomerRelationships(customerId);
  }

  /**
   * Get primary agent for customer
   */
  getPrimaryAgentForCustomer(customerId: string) {
    return this.agentManager.getPrimaryAgentForCustomer(customerId);
  }

  /**
   * Get customers for agent
   */
  getCustomersForAgent(agentId: string) {
    return this.agentManager.getCustomersForAgent(agentId);
  }

  /**
   * Update agent permissions
   */
  updateAgentPermissions(agentId: string, permissions: any) {
    return this.agentManager.updateAgentPermissions(agentId, permissions);
  }

  /**
   * Update agent configuration
   */
  updateAgentConfiguration(agentId: string, configuration: any) {
    return this.agentManager.updateAgentConfiguration(agentId, configuration);
  }

  /**
   * Suspend agent
   */
  suspendAgent(agentId: string, reason: string) {
    return this.agentManager.suspendAgent(agentId, reason);
  }

  /**
   * Reactivate agent
   */
  reactivateAgent(agentId: string) {
    return this.agentManager.reactivateAgent(agentId);
  }

  /**
   * Get agent statistics
   */
  getAgentStatistics() {
    return this.agentManager.getAgentStatistics();
  }

  // Commission Management Methods

  /**
   * Create commission structure
   */
  createCommissionStructure(structure: any) {
    return this.commissionManager.createCommissionStructure(structure);
  }

  /**
   * Update commission structure
   */
  updateCommissionStructure(structureId: string, updates: any) {
    return this.commissionManager.updateCommissionStructure(structureId, updates);
  }

  /**
   * Get commission structure
   */
  getCommissionStructure(structureId: string) {
    return this.commissionManager.getCommissionStructure(structureId);
  }

  /**
   * Get all commission structures
   */
  getAllCommissionStructures() {
    return this.commissionManager.getAllCommissionStructures();
  }

  /**
   * Calculate commission
   */
  calculateCommission(
    agentId: string,
    structureId: string,
    revenue: number,
    period?: any,
    startDate?: Date,
    endDate?: Date
  ) {
    return this.commissionManager.calculateCommission(
      agentId,
      structureId,
      revenue,
      period || 'monthly',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date()
    );
  }

  /**
   * Create commission payout
   */
  createCommissionPayout(payoutData: any) {
    return this.commissionManager.createPayout(payoutData);
  }

  /**
   * Process commission payout
   */
  processCommissionPayout(payoutId: string, processedBy: string) {
    return this.commissionManager.processPayout(payoutId, processedBy);
  }

  /**
   * Complete commission payout
   */
  completeCommissionPayout(payoutId: string, paymentReference?: string) {
    return this.commissionManager.completePayout(payoutId, paymentReference);
  }

  /**
   * Get pending payouts for agent
   */
  getPendingPayoutsForAgent(agentId: string) {
    return this.commissionManager.getPendingPayouts(agentId);
  }

  /**
   * Get agent commission calculations
   */
  getAgentCommissionCalculations(agentId: string, limit?: number) {
    return this.commissionManager.getAgentCommissionCalculations(agentId, limit);
  }

  /**
   * Get commission summary for agent
   */
  getCommissionSummaryForAgent(agentId: string, period?: any) {
    return this.commissionManager.getCommissionSummary(agentId, period);
  }

  /**
   * Get commission statistics
   */
  getCommissionStatistics() {
    return this.commissionManager.getCommissionStatistics();
  }

  // System Health and Analytics

  /**
   * Get system health
   */
  getSystemHealth() {
    return {
      agents: this.getAgentStatistics(),
      commissions: this.getCommissionStatistics(),
      timestamp: new Date(),
    };
  }

  /**
   * Get system statistics
   */
  getSystemStatistics() {
    const agentStats = this.getAgentStatistics();
    const commissionStats = this.getCommissionStatistics();

    return {
      agents: agentStats,
      commissions: commissionStats,
      summary: {
        totalAgents: agentStats.totalAgents,
        activeAgents: agentStats.byStatus?.active || 0,
        totalCommissionStructures: commissionStats.totalStructures,
        activeCommissionStructures: commissionStats.activeStructures,
        totalCommissionPaid: commissionStats.totalCommissionPaid,
        pendingPayouts: commissionStats.pendingPayouts,
      },
      timestamp: new Date(),
    };
  }

  // Getters for individual modules

  getAgentManager() {
    return this.agentManager;
  }

  getCommissionManager() {
    return this.commissionManager;
  }
}

// Export individual modules for advanced usage
export { AgentProfileManager } from './agents/agent-profile-manager';
export { CommissionManager } from './commissions/commission-manager';

// Export default instance factory
export function createHierarchySystem(): HierarchySystem {
  return new HierarchySystem();
}
