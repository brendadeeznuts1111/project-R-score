/**
 * Fire22 Enterprise Web Logs Types
 * Comprehensive type definitions for web activity tracking
 */

// !==!== Base Log Interfaces !==!==

export interface WebLogBase {
  id: string; // UUID v4
  timestamp: Date;
  logType: LogType;
  actionType: string;
  customerId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  geoLocation?: GeoLocation;
  deviceInfo?: DeviceInfo;
  actionData: Record<string, any>;
  riskScore: number; // 0-100
  isSuspicious: boolean;
  complianceFlags?: ComplianceFlag[];
  status: LogStatus;
  processingTimeMs?: number;
  languageCode: LanguageCode;
  fire22LanguageKeys?: string[]; // Array of L-keys
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  retentionExpiresAt?: Date;
}

// !==!== Log Type Enums !==!==

export enum LogType {
  TRANSACTION = 'transaction',
  WAGER = 'wager',
  AUTHENTICATION = 'authentication',
  CASINO_BET = 'casino_bet',
  SYSTEM = 'system',
  SECURITY = 'security',
}

export enum LogStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum LanguageCode {
  EN = 'en',
  ES = 'es',
  PT = 'pt',
}

// !==!== Action Type Enums !==!==

export enum TransactionActionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  P2P = 'p2p',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  FEE = 'fee',
  BONUS_CREDIT = 'bonus_credit',
  BONUS_DEBIT = 'bonus_debit',
}

export enum WagerActionType {
  SPORTS_BET = 'sports_bet',
  CASINO_BET = 'casino_bet',
  LIVE_CASINO_BET = 'live_casino_bet',
  VIRTUAL_BET = 'virtual_bet',
  LOTTERY_BET = 'lottery_bet',
  POOL_BET = 'pool_bet',
}

export enum AuthenticationActionType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  VERIFY_EMAIL = 'verify_email',
  VERIFY_PHONE = 'verify_phone',
  PASSWORD_RESET = 'password_reset',
  TWO_FA_ENABLE = '2fa_enable',
  TWO_FA_DISABLE = '2fa_disable',
  KYC_SUBMIT = 'kyc_submit',
  KYC_APPROVE = 'kyc_approve',
  KYC_REJECT = 'kyc_reject',
}

export enum SecurityActionType {
  FRAUD_ATTEMPT = 'fraud_attempt',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  UNUSUAL_BETTING_PATTERN = 'unusual_betting_pattern',
  GEO_ANOMALY = 'geo_anomaly',
  DEVICE_CHANGE = 'device_change',
  RAPID_TRANSACTIONS = 'rapid_transactions',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

// !==!== Supporting Interfaces !==!==

export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface DeviceInfo {
  type: 'Mobile' | 'Desktop' | 'Tablet' | 'Unknown';
  os?: string;
  browser?: string;
  version?: string;
  fingerprint?: string;
}

export interface ComplianceFlag {
  type: 'aml' | 'kyc' | 'geo_restriction' | 'age_verification' | 'self_exclusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requiresManualReview: boolean;
}

// !==!== Specific Log Interfaces !==!==

export interface TransactionLog extends WebLogBase {
  logType: LogType.TRANSACTION;
  actionType: TransactionActionType;
  transactionDetails: {
    transactionType: TransactionActionType;
    amount: number;
    currency: string;
    fromAccount?: string;
    toAccount?: string;
    paymentMethod: 'pix' | 'bank_transfer' | 'crypto' | 'card';
    referenceId?: string;
    bankDetails?: Record<string, any>;
    cryptoDetails?: Record<string, any>;
    feesApplied: number;
    exchangeRate?: number;
    complianceChecked: boolean;
    amlScore?: number;
  };
}

export interface WagerLog extends WebLogBase {
  logType: LogType.WAGER;
  actionType: WagerActionType;
  wagerDetails: {
    wagerType: WagerActionType;
    sportType?: string;
    eventId?: string;
    eventName?: string;
    marketType?: string;
    selection?: string;
    odds: number;
    stakeAmount: number;
    potentialPayout: number;
    wagerStatus: 'pending' | 'won' | 'lost' | 'void' | 'cashed_out';
    settlementAmount?: number;
    settlementTime?: Date;
    bookmakerLimits?: Record<string, any>;
    isLiveBet: boolean;
  };
}

export interface AuthenticationLog extends WebLogBase {
  logType: LogType.AUTHENTICATION;
  actionType: AuthenticationActionType;
  authDetails: {
    authType: AuthenticationActionType;
    authMethod: 'password' | 'sms' | 'email' | 'biometric' | 'social';
    success: boolean;
    failureReason?: string;
    loginSource: 'web' | 'mobile_app' | 'api';
    mfaUsed: boolean;
    deviceFingerprint?: string;
    previousLogin?: Date;
    loginStreak: number;
    passwordStrength?: number;
    accountLocked: boolean;
    lockoutExpires?: Date;
  };
}

export interface CasinoBetLog extends WebLogBase {
  logType: LogType.CASINO_BET;
  actionType: 'casino_game';
  casinoDetails: {
    gameType: 'blackjack' | 'roulette' | 'baccarat' | 'slots' | 'poker' | 'craps';
    gameVariant?: string;
    tableId?: string;
    dealerId?: string;
    sessionId: string;
    betType: 'main' | 'side' | 'insurance';
    betAmount: number;
    betDetails: Record<string, any>;
    gameResult: Record<string, any>;
    payoutAmount: number;
    houseEdge: number;
    rtpPercentage: number;
    jackpotContribution: number;
    isBonusBet: boolean;
    bonusDetails?: Record<string, any>;
  };
}

export interface SecurityLog extends WebLogBase {
  logType: LogType.SECURITY;
  actionType: SecurityActionType;
  securityDetails: {
    incidentType: SecurityActionType;
    severityLevel: 'low' | 'medium' | 'high' | 'critical';
    threatIndicators: string[];
    automatedResponse: Record<string, any>;
    manualReviewRequired: boolean;
    investigationStatus: 'open' | 'investigating' | 'resolved' | 'false_positive';
    investigatorId?: string;
    resolutionNotes?: string;
    resolvedAt?: Date;
  };
}

// !==!== Analytics Interfaces !==!==

export interface LogAnalytics {
  id: string;
  dateHour: Date;
  logType: LogType;
  customerId?: string;
  totalEvents: number;
  successEvents: number;
  failedEvents: number;
  suspiciousEvents: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  avgProcessingTimeMs: number;
  maxProcessingTimeMs: number;
  avgRiskScore: number;
  maxRiskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// !==!== Storage Configuration !==!==

export interface StorageConfig {
  database: {
    binding: 'DB' | 'REGISTRY_DB';
    retentionDays: number;
    batchSize: number;
  };
  r2Storage: {
    binding: 'REGISTRY_STORAGE';
    archivePath: string;
    compressionEnabled: boolean;
  };
  kvCache: {
    binding: 'FIRE22_DATA_CACHE';
    ttlSeconds: number;
  };
}

// !==!== Filter and Query Interfaces !==!==

export interface LogQueryFilter {
  logTypes?: LogType[];
  actionTypes?: string[];
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  riskScoreMin?: number;
  riskScoreMax?: number;
  isSuspicious?: boolean;
  status?: LogStatus[];
  languageCode?: LanguageCode;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'riskScore' | 'processingTime';
  orderDirection?: 'ASC' | 'DESC';
}

export interface LogQueryResult {
  logs: WebLogBase[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
  aggregates?: {
    totalEvents: number;
    suspiciousEvents: number;
    avgRiskScore: number;
    totalAmount?: number;
  };
}

// !==!== Fire22 Language Key Mappings (Corrected from System) !==!==

export const FIRE22_LOG_LANGUAGE_KEYS = {
  [LogType.TRANSACTION]: 'L-69', // Amount
  [LogType.WAGER]: 'L-15', // Parlays (or L-12 for Straights)
  [LogType.AUTHENTICATION]: 'L-214', // Password
  [LogType.CASINO_BET]: 'L-1390', // Live/Props
  [LogType.SECURITY]: 'L-849', // Report Settings
  [LogType.SYSTEM]: 'L-407', // Settings
} as const;

// !==!== Utility Types !==!==

export type AnyWebLog = TransactionLog | WagerLog | AuthenticationLog | CasinoBetLog | SecurityLog;

export type LogTypeMap = {
  [LogType.TRANSACTION]: TransactionLog;
  [LogType.WAGER]: WagerLog;
  [LogType.AUTHENTICATION]: AuthenticationLog;
  [LogType.CASINO_BET]: CasinoBetLog;
  [LogType.SECURITY]: SecurityLog;
  [LogType.SYSTEM]: WebLogBase;
};

export type CreateLogRequest<T extends LogType> = Omit<
  LogTypeMap[T],
  'id' | 'timestamp' | 'createdAt' | 'updatedAt' | 'status'
> & {
  id?: string;
  timestamp?: Date;
  status?: LogStatus;
};
