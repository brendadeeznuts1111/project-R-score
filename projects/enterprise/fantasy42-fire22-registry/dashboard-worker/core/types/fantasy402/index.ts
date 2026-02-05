/**
 * Fantasy402 Types
 * Shared types and interfaces for Fantasy402 API client operations
 */

import type { BaseEntity, Status, Currency } from '../shared/common';

export type AgentType = 'U' | 'A' | 'M' | 'S'; // User, Agent, Manager, Super

export type AuthorizationLevel = 'read' | 'write' | 'admin' | 'super';

export type TransactionType = 'deposit' | 'withdrawal' | 'adjustment' | 'transfer' | 'fee';

export type WagerStatus = 'pending' | 'settled' | 'cancelled' | 'void';

export interface AgentPermissions {
  customerID: string;
  agentID: string;
  masterAgentID: string;
  isOffice: boolean;
  canManageLines: boolean;
  canAddAccounts: boolean;
  canDeleteBets: boolean;
  canViewReports: boolean;
  canAccessBilling: boolean;
  rawPermissions: any;
}

export interface AgentAccountInfo {
  customerID: string;
  balance: number;
  availableBalance: number;
  pendingWagers: number;
  office: string;
  store: string;
  active: boolean;
  agentType: AgentType;
}

export interface DetailedAccountInfo {
  // Identity & Basic Info
  customerID: string;
  login: string;
  office: string;
  store: string;
  agentType: AgentType;

  // Financial Information
  currentBalance: number;
  availableBalance: number;
  pendingWagerBalance: number;
  creditLimit: number;

  // Account Settings & Permissions
  active: boolean;
  suspendSportsbook: boolean;
  suspendCasino: boolean;
  denyLiveBetting: boolean;
  allowRoundRobin: boolean;
  allowPropBuilder: boolean;
  denyReports: boolean;
  denyAgentBilling: boolean;

  // Operational Data
  newEmailsCount: number;
  tokenStatus: 'Active' | 'Expired' | 'Unknown';
  lastActivityTimestamp: Date;

  // Sub-accounts
  subAgents?: SubAgentInfo[];

  // Raw API Response
  rawResponse?: any;
}

export interface SubAgentInfo {
  agentID: string;
  customerID: string;
  office: string;
  balance: number;
  active: boolean;
  agentType: AgentType;
}

// Lottery Types
export interface LotteryGame {
  gameID: string;
  name: string;
  description: string;
  jackpot: number;
  drawDate: Date;
  status: Status;
  rules: LotteryRules;
  prizes: LotteryPrize[];
}

export interface LotteryRules {
  minNumbers: number;
  maxNumbers: number;
  numberRange: {
    min: number;
    max: number;
  };
  costPerTicket: number;
  maxTicketsPerDraw: number;
  drawFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface LotteryPrize {
  tier: number;
  name: string;
  matchCount: number;
  prizeAmount: number;
  estimatedWinners: number;
}

export interface LotteryBet {
  betID: string;
  customerID: string;
  gameID: string;
  numbers: number[];
  stake: number;
  placedAt: Date;
  drawID: string;
  status: WagerStatus;
  winnings?: number;
}

export interface LotteryDraw {
  drawID: string;
  gameID: string;
  drawDate: Date;
  winningNumbers: number[];
  jackpot: number;
  totalWinners: number;
  totalPayout: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface LotterySettings {
  enabled: boolean;
  maxBetAmount: number;
  minBetAmount: number;
  supportedGames: string[];
  drawSchedule: DrawSchedule[];
  payoutSettings: PayoutSettings;
}

export interface DrawSchedule {
  gameID: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone: string;
}

export interface PayoutSettings {
  instantPayout: boolean;
  payoutThreshold: number;
  processingFee: number;
  taxSettings: TaxSettings;
}

export interface TaxSettings {
  withholdTax: boolean;
  taxRate: number;
  taxThreshold: number;
  reportingEnabled: boolean;
}

// Transaction Types
export interface TransactionRecord extends BaseEntity {
  transactionID: string;
  customerID: string;
  agentID: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  timestamp: Date;
  status: Status;
  reference?: string;
  processedBy?: string;
  metadata?: Record<string, any>;
}

export interface WagerRecord extends BaseEntity {
  wagerID: string;
  ticketNumber: string;
  customerID: string;
  agentID: string;
  sport: string;
  event: string;
  betType: string;
  selection: string;
  stake: number;
  odds: number;
  potentialPayout: number;
  placedAt: Date;
  status: WagerStatus;
  settledAt?: Date;
  winnings?: number;
  settledBy?: string;
  metadata?: Record<string, any>;
}

// Customer Types
export interface CustomerInfo {
  customerID: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: CustomerAddress;
  dateOfBirth: Date;
  registrationDate: Date;
  lastLogin: Date;
  status: Status;
  balance: number;
  creditLimit: number;
  preferredCurrency: Currency;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface NewUserStats {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  newUsers: number;
  activeUsers: number;
  totalDeposits: number;
  averageDeposit: number;
  conversionRate: number;
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

// Reporting Types
export interface WeeklyFigures {
  agentID: string;
  period: {
    start: Date;
    end: Date;
  };
  financial: {
    grossRevenue: number;
    netRevenue: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWagers: number;
    settledWagers: number;
  };
  operational: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    totalWagers: number;
    winningWagers: number;
    losingWagers: number;
  };
  performance: {
    winRate: number;
    averageStake: number;
    averagePayout: number;
    customerRetention: number;
    agentCommission: number;
  };
}

export interface WeeklyFigureLite {
  agentID: string;
  profit: number;
  todayProfit: number;
  activePlayers: number;
  totalWagers: number;
  grossRevenue: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Client Configuration Types
export interface ClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  rateLimit: {
    requests: number;
    period: number; // in milliseconds
  };
  headers: Record<string, string>;
}

export interface AuthConfig {
  username: string;
  password: string;
  tokenRefreshThreshold: number; // minutes before expiry
  autoRenewToken: boolean;
  maxRenewalAttempts: number;
}

// Error Types
export interface ClientError extends Error {
  code: string;
  statusCode: number;
  retryable: boolean;
  details?: Record<string, any>;
}

// Export utility types
export type AgentPermissionsCreate = Omit<AgentPermissions, 'rawPermissions'>;
export type TransactionRecordCreate = Omit<TransactionRecord, keyof BaseEntity>;
export type WagerRecordCreate = Omit<WagerRecord, keyof BaseEntity>;
export type CustomerInfoCreate = Omit<CustomerInfo, keyof BaseEntity>;
export type LotteryGameCreate = Omit<LotteryGame, 'gameID'>;
export type LotteryBetCreate = Omit<LotteryBet, 'betID'>;

// Export type guards
export function isAgentAccountInfo(obj: any): obj is AgentAccountInfo {
  return obj && typeof obj.customerID === 'string' && typeof obj.balance === 'number';
}

export function isDetailedAccountInfo(obj: any): obj is DetailedAccountInfo {
  return obj && typeof obj.customerID === 'string' && typeof obj.currentBalance === 'number';
}

export function isTransactionRecord(obj: any): obj is TransactionRecord {
  return obj && typeof obj.transactionID === 'string' && typeof obj.customerID === 'string';
}

export function isWagerRecord(obj: any): obj is WagerRecord {
  return obj && typeof obj.wagerID === 'string' && typeof obj.customerID === 'string';
}

export function isCustomerInfo(obj: any): obj is CustomerInfo {
  return obj && typeof obj.customerID === 'string' && typeof obj.login === 'string';
}
