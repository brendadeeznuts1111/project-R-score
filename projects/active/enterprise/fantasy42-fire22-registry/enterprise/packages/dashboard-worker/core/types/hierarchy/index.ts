/**
 * Hierarchy Types
 * Shared types and interfaces for agent hierarchy and commission management
 */

import type { BaseEntity, Status, Currency } from '../shared/common';
import type { CommissionStructure, AffiliateProfile } from '../finance';

export type AgentType = 'U' | 'A' | 'M' | 'S'; // User, Agent, Manager, Super

export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export type CommissionType = 'flat' | 'percentage' | 'tiered' | 'hybrid';

export type PayoutFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface AgentProfile extends BaseEntity {
  customerID: string;
  agentID: string;
  login: string;
  office: string;
  store: string;
  agentType: AgentType;
  status: AgentStatus;
  openDateTime: Date;
  closeDateTime?: Date;
  parentAgentID?: string;
  subAgents: string[];
  commissionStructureId: string;
  payoutFrequency: PayoutFrequency;
  creditLimit: number;
  currentBalance: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  lastCommissionDate?: Date;
  permissions: AgentPermissions;
  configuration: AgentConfiguration;
  contactInfo: AgentContactInfo;
  metadata?: Record<string, any>;
}

export interface AgentPermissions {
  canViewReports: boolean;
  canAccessBilling: boolean;
  canManageLines: boolean;
  canAddAccounts: boolean;
  canDeleteBets: boolean;
  canManageAgents: boolean;
  canApproveDeposits: boolean;
  canApproveWithdrawals: boolean;
  canAccessCasino: boolean;
  canAccessSportsbook: boolean;
  isOfficeAccount: boolean;
  maxDailyDepositApproval: number;
  maxDailyWithdrawalApproval: number;
  restrictedSports: string[];
  restrictedGames: string[];
}

export interface AgentConfiguration {
  suspendSportsbook: boolean;
  suspendCasino: boolean;
  denyLiveBetting: boolean;
  allowRoundRobin: boolean;
  allowPropBuilder: boolean;
  denyReports: boolean;
  denyAgentBilling: boolean;
  autoSettlement: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface AgentContactInfo {
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface AgentHierarchyNode {
  agent: AgentProfile;
  level: number;
  parent?: AgentHierarchyNode;
  children: AgentHierarchyNode[];
  totalSubAgents: number;
  activeSubAgents: number;
  totalCommission: number;
  monthlyCommission: number;
  performance: AgentPerformanceMetrics;
}

export interface AgentPerformanceMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  totalCustomers: number;
  activeCustomers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagers: number;
  totalSettlements: number;
  grossRevenue: number;
  netRevenue: number;
  commissionEarned: number;
  commissionPaid: number;
  customerRetentionRate: number;
  averageBetSize: number;
  topPerformingSport: string;
  customerSatisfaction: number;
  responseTime: number; // average response time in hours
}

export interface CommissionCalculation {
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  baseRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  adjustments: CommissionAdjustment[];
  finalAmount: number;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculatedBy: string;
  approvedBy?: string;
  paidAt?: Date;
}

export interface CommissionAdjustment {
  type: 'bonus' | 'penalty' | 'correction' | 'special';
  amount: number;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
}

export interface AgentCommissionPayout extends BaseEntity {
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  grossCommission: number;
  adjustments: number;
  netAmount: number;
  paymentMethod: 'bank_transfer' | 'check' | 'wire' | 'crypto';
  paymentReference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processedBy: string;
  processedAt?: Date;
  paidAt?: Date;
  notes?: string;
}

export interface AgentDashboardData {
  agentProfile: AgentProfile;
  financialPerformance: {
    currentWeek: {
      profit: number;
      todayProfit: number;
      activePlayers: number;
    };
    lastWeek: {
      profit: number;
    };
    accountSummary: {
      balance: number;
      pendingWagers: number;
      availableBalance: number;
      creditLimit: number;
    };
  };
  operationalStatus: {
    newEmailsCount: number;
    tokenStatus: 'Active' | 'Expired' | 'Unknown';
    lastActivityTimestamp: Date;
  };
  customerData: {
    customers: Array<{
      customerID: string;
      active: boolean;
      balance: number;
      creditLimit: number;
      lastLogin?: Date;
      suspendSportsbook: boolean;
      office: string;
    }>;
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
  };
  pendingWagers: {
    wagers: Array<{
      ticketNumber: string;
      customerID: string;
      wagerAmount: number;
      potentialPayout: number;
      sport: string;
      gameDescription: string;
      placedAt: Date;
      status: string;
    }>;
    totalPendingWagers: number;
    totalPendingAmount: number;
    totalPendingPayout: number;
  };
  recentTransactions: {
    transactions: Array<{
      transactionID: string;
      customerID: string;
      type: 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'adjustment';
      amount: number;
      description: string;
      timestamp: Date;
      status: 'pending' | 'completed' | 'cancelled';
    }>;
    totalTransactions: number;
    lastTransactionTime: Date;
  };
  hierarchy: {
    level: number;
    parentAgent?: AgentProfile;
    subAgents: AgentProfile[];
    totalHierarchyCommission: number;
  };
  commissions: {
    currentPeriod: CommissionCalculation;
    pendingPayouts: AgentCommissionPayout[];
    commissionHistory: CommissionCalculation[];
    projectedNextPayout: number;
  };
  permissions: AgentPermissions;
  configuration: AgentConfiguration;
  metadata: {
    fetchedAt: Date;
    cacheExpiry: Date;
    apiCallCount: number;
  };
  errors: Array<{
    endpoint: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface AgentCustomerRelationship {
  agentId: string;
  customerId: string;
  relationshipType: 'primary' | 'secondary' | 'temporary';
  assignedAt: Date;
  assignedBy: string;
  unassignedAt?: Date;
  unassignedBy?: string;
  commissionSplit: number; // percentage of commission this agent gets
  notes?: string;
}

export interface AgentActivityLog extends BaseEntity {
  agentId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  customerId?: string; // if action was related to a customer
  transactionId?: string; // if action was related to a transaction
  success: boolean;
  errorMessage?: string;
  duration?: number; // in milliseconds
}

// Export utility types
export type AgentProfileCreate = Omit<AgentProfile, keyof BaseEntity>;
export type AgentProfileUpdate = Partial<AgentProfileCreate>;
export type CommissionCalculationCreate = Omit<
  CommissionCalculation,
  'id' | 'createdAt' | 'updatedAt'
>;
export type AgentCommissionPayoutCreate = Omit<AgentCommissionPayout, keyof BaseEntity>;
