/**
 * 🌐 Fire22 Dashboard - API Type Definitions
 * Comprehensive type definitions for all API requests and responses
 */

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication types
export interface AuthRequest {
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  agentId?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
}

// Customer API types
export interface CustomerAdminRequest {
  agentID: string;
  includeBalances?: boolean;
  includeStats?: boolean;
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface CustomerAdminResponse {
  customers: CustomerSummary[];
  totalCustomers: number;
  totalBalance: number;
  activeCustomers: number;
  inactiveCustomers: number;
}

export interface CustomerSummary {
  CustomerID: string;
  AgentID: string;
  FirstName: string;
  LastName: string;
  Login: string;
  Active: string;
  CasinoBalance: number;
  SportsBalance: number;
  TotalBalance: number;
  AgentLogin: string;
  AgentType: string | null;
  ParentAgent: string | null;
  MasterAgent: string;
  LastVerDateTime: string;
  PlayerNotes: string;
}

export interface CreateCustomerRequest {
  customerID: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  agentID: string;
  initialBalance?: number;
  notes?: string;
}

export interface CreateCustomerResponse {
  customerID: string;
  message: string;
  balance: number;
}

// Transaction API types
export interface ProcessDepositRequest {
  customerID: string;
  amount: number;
  method?: 'cash' | 'check' | 'wire' | 'card' | 'crypto';
  notes?: string;
  reference?: string;
}

export interface ProcessDepositResponse {
  transactionID: string;
  customerID: string;
  amount: number;
  newBalance: number;
  status: string;
  timestamp: string;
}

export interface TransactionHistoryRequest {
  customerID?: string;
  agentID?: string;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: string;
  pagination?: PaginationParams;
}

export interface TransactionHistoryResponse {
  transactions: TransactionSummary[];
  summary: {
    totalAmount: number;
    totalCount: number;
    deposits: number;
    withdrawals: number;
    wagers: number;
    wins: number;
  };
}

export interface TransactionSummary {
  TransactionID: string;
  CustomerID: string;
  Amount: number;
  TranType: string;
  TranCode: string;
  ShortDesc: string;
  AgentID: string;
  EnteredBy: string;
  TranDateTime: string;
  Status: string;
  Balance: number;
}

// Betting API types
export interface LiveWagersRequest {
  agentID: string;
  sport?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface LiveWagersResponse {
  wagers: WagerSummary[];
  totalWagers: number;
  totalAmount: number;
  totalRisk: number;
  totalToWin: number;
}

export interface WagerSummary {
  WagerNumber: string;
  AgentID: string;
  CustomerID: string;
  Login: string;
  WagerType: string;
  AmountWagered: number;
  ToWinAmount: number;
  InsertDateTime: string;
  TicketWriter: string;
  VolumeAmount: number;
  ShortDesc: string;
  VIP: string;
  AgentLogin: string;
  Status: string;
}

export interface BetHistoryRequest {
  customerID?: string;
  agentID?: string;
  status?: string;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  pagination?: PaginationParams;
}

export interface BetHistoryResponse {
  bets: BetSummary[];
  summary: {
    totalBets: number;
    totalAmount: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    profitLoss: number;
  };
}

export interface BetSummary {
  id: number;
  customerID: string;
  amount: number;
  odds: number;
  type: string;
  status: string;
  teams: string;
  date: string;
  outcome?: string;
  payout?: number;
}

// Agent API types
export interface AgentPerformanceRequest {
  agentID: string;
  date?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  includeSubAgents?: boolean;
}

export interface AgentPerformanceResponse {
  agentID: string;
  period: string;
  performance: {
    totalCustomers: number;
    activeCustomers: number;
    totalWagers: number;
    totalVolume: number;
    totalWins: number;
    totalLosses: number;
    netProfit: number;
    commission: number;
  };
  trends: {
    customerGrowth: number;
    volumeGrowth: number;
    profitGrowth: number;
  };
}

export interface WeeklyFiguresRequest {
  agentID: string;
  weekOffset?: number;
  includeDetails?: boolean;
}

export interface WeeklyFiguresResponse {
  agentID: string;
  weekStart: string;
  weekEnd: string;
  figures: {
    totalWagers: number;
    totalVolume: number;
    totalWins: number;
    totalLosses: number;
    netResult: number;
    commission: number;
    customerCount: number;
    activeCustomers: number;
  };
  daily: DailyFigure[];
}

export interface DailyFigure {
  date: string;
  wagers: number;
  volume: number;
  wins: number;
  losses: number;
  net: number;
}

// System API types
export interface SystemStatusResponse {
  server: {
    status: string;
    uptime: number;
    memory: any;
    version: string;
  };
  database: {
    connected: boolean;
    schema: string;
    tables: number;
    customers: number;
    transactions: number;
    bets: number;
  };
  api: {
    endpoints: number;
    status: string;
  };
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  fire22Schema: string;
  tables: string;
  timestamp: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
  method?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

// Request context
export interface RequestContext {
  requestId: string;
  userId?: string;
  agentId?: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  method: string;
  path: string;
  query?: any;
  body?: any;
}

// Export all types
export type {
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  AuthRequest,
  AuthResponse,
  CustomerAdminRequest,
  CustomerAdminResponse,
  CustomerSummary,
  CreateCustomerRequest,
  CreateCustomerResponse,
  ProcessDepositRequest,
  ProcessDepositResponse,
  TransactionHistoryRequest,
  TransactionHistoryResponse,
  TransactionSummary,
  LiveWagersRequest,
  LiveWagersResponse,
  WagerSummary,
  BetHistoryRequest,
  BetHistoryResponse,
  BetSummary,
  AgentPerformanceRequest,
  AgentPerformanceResponse,
  WeeklyFiguresRequest,
  WeeklyFiguresResponse,
  DailyFigure,
  SystemStatusResponse,
  HealthCheckResponse,
  ApiError,
  ValidationError,
  RequestContext,
};
