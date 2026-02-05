/**
 * Fantasy402 Client Shared Types
 * Consolidated interfaces and types for Fantasy402 API client modules
 */

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
  agentType: string;
}

export interface DetailedAccountInfo {
  // Identity & Basic Info
  customerID: string;
  login: string;
  office: string;
  store: string;
  agentType: string;

  // Financial Information
  currentBalance: number;
  availableBalance: number;
  pendingWagerBalance: number;
  creditLimit: number;

  // Account Settings & Permissions
  active: boolean;
  suspendSportsbook: boolean;
  suspendCasino: boolean;
  suspendHorses: boolean;
  maxWagerSportsbook: number;
  maxWagerCasino: number;
  maxWagerHorses: number;
  allowFreePlay: boolean;
  allowTeaser: boolean;

  // Contact Information
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;

  // Account Metadata
  createdDate: string;
  lastLoginDate: string;
  lastWagerDate: string;
  totalWagers: number;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;

  // Agent Hierarchy
  parentAgentID: string;
  masterAgentID: string;
  subAgentsCount: number;
}

export interface LotteryGame {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  numbersRange: {
    min: number;
    max: number;
  };
  numbersToPick: number;
  bonusNumbers?: number;
  jackpot: number;
  nextDrawDate: string;
  drawFrequency: string;
  active: boolean;
}

export interface LotteryBet {
  id: string;
  customerID: string;
  gameID: string;
  gameName: string;
  numbers: number[];
  bonusNumbers?: number[];
  wagerAmount: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  placedDate: string;
  drawDate: string;
  drawResult?: number[];
  bonusDrawResult?: number[];
  winnings?: number;
  payoutDate?: string;
}

export interface LotteryDraw {
  id: string;
  gameID: string;
  gameName: string;
  drawDate: string;
  numbers: number[];
  bonusNumbers?: number[];
  jackpot: number;
  winners: number;
  totalWagers: number;
  totalPayout: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface LotterySettings {
  customerID: string;
  enabled: boolean;
  maxWager: number;
  maxDailyWager: number;
  allowedGames: string[];
  autoPlay: boolean;
  favoriteNumbers: number[][];
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  lastModified: string;
}

export interface WeeklyFiguresParams {
  agentID?: string;
  startDate?: string;
  endDate?: string;
  includeSubAgents?: boolean;
}

export interface WeeklyFiguresResult {
  agentID: string;
  agentName: string;
  period: string;
  totalWagers: number;
  totalWins: number;
  totalLosses: number;
  netProfit: number;
  commission: number;
  subAgents?: WeeklyFiguresResult[];
}

export interface TransactionParams {
  customerID?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface WagerParams {
  customerID?: string;
  startDate?: string;
  endDate?: string;
  sport?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerParams {
  limit?: number;
  offset?: number;
  status?: string;
  agentID?: string;
  search?: string;
}

export interface PlayerNote {
  id: string;
  customerID: string;
  note: string;
  category:
    | 'general'
    | 'complaint'
    | 'praise'
    | 'warning'
    | 'suspension'
    | 'vip'
    | 'risk'
    | 'lottery';
  createdBy: string;
  createdDate: string;
  lastModified: string;
  isActive: boolean;
}

export interface PlayerNoteOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface LotteryBetOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  gameID?: string;
}

export interface LotteryDrawOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  gameID?: string;
  status?: string;
}

export interface LotteryStatisticsOptions {
  gameID?: string;
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface LotteryStatistics {
  gameID: string;
  gameName: string;
  period: string;
  totalBets: number;
  totalWagers: number;
  totalWins: number;
  totalPayout: number;
  houseProfit: number;
  winRate: number;
  averageWager: number;
  popularNumbers: { number: number; count: number }[];
}
