/**
 * 🔥 Fire22 OTC Trading Constants & Types
 * Complete definition of all parties, types, and constants with L-key mapping
 */

// !==!==!==!==!==!==!==!===
// PARTY TYPES & ROLES
// !==!==!==!==!==!==!==!===

export enum PartyType {
  // Primary Trading Parties
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  MARKET_MAKER = 'MARKET_MAKER',
  LIQUIDITY_PROVIDER = 'LIQUIDITY_PROVIDER',

  // Intermediary Parties
  BROKER = 'BROKER',
  AGENT = 'AGENT',
  INTRODUCER = 'INTRODUCER',
  REFERRER = 'REFERRER',

  // Service Parties
  ESCROW_AGENT = 'ESCROW_AGENT',
  CLEARING_HOUSE = 'CLEARING_HOUSE',
  CUSTODIAN = 'CUSTODIAN',
  SETTLEMENT_AGENT = 'SETTLEMENT_AGENT',

  // Regulatory Parties
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  REGULATOR = 'REGULATOR',
  AUDITOR = 'AUDITOR',
  KYC_PROVIDER = 'KYC_PROVIDER',

  // Platform Parties
  PLATFORM_OPERATOR = 'PLATFORM_OPERATOR',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  TELEGRAM_MODERATOR = 'TELEGRAM_MODERATOR',
}

// !==!==!==!==!==!==!==!===
// CUSTOMER TYPES
// !==!==!==!==!==!==!==!===

export enum CustomerType {
  // Standard Types
  NEW = 'NEW',
  REGULAR = 'REGULAR',
  VIP = 'VIP',
  VVIP = 'VVIP',

  // Credit Types
  POST_UP = 'POST_UP',
  CREDIT = 'CREDIT',
  CASH_ONLY = 'CASH_ONLY',
  PREPAID = 'PREPAID',

  // Risk Categories
  LOW_RISK = 'LOW_RISK',
  MEDIUM_RISK = 'MEDIUM_RISK',
  HIGH_RISK = 'HIGH_RISK',
  RESTRICTED = 'RESTRICTED',

  // Trading Categories
  RETAIL = 'RETAIL',
  PROFESSIONAL = 'PROFESSIONAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
  MARKET_MAKER_CUSTOMER = 'MARKET_MAKER_CUSTOMER',

  // Special Categories
  AFFILIATE = 'AFFILIATE',
  IB = 'IB', // Introducing Broker
  WHITE_LABEL = 'WHITE_LABEL',
  API_TRADER = 'API_TRADER',
}

// !==!==!==!==!==!==!==!===
// TRANSACTION TYPES
// !==!==!==!==!==!==!==!===

export enum TransactionType {
  // P2P Transactions
  P2P_TRANSFER = 'P2P_TRANSFER',
  P2P_EXCHANGE = 'P2P_EXCHANGE',
  P2P_ESCROW = 'P2P_ESCROW',

  // OTC Transactions
  OTC_SPOT = 'OTC_SPOT',
  OTC_BLOCK = 'OTC_BLOCK',
  OTC_FORWARD = 'OTC_FORWARD',
  OTC_SWAP = 'OTC_SWAP',

  // Deposits & Withdrawals
  DEPOSIT_FIAT = 'DEPOSIT_FIAT',
  DEPOSIT_CRYPTO = 'DEPOSIT_CRYPTO',
  WITHDRAWAL_FIAT = 'WITHDRAWAL_FIAT',
  WITHDRAWAL_CRYPTO = 'WITHDRAWAL_CRYPTO',

  // Internal Transfers
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  COMMISSION_PAYMENT = 'COMMISSION_PAYMENT',
  FEE_COLLECTION = 'FEE_COLLECTION',
  REBATE_PAYMENT = 'REBATE_PAYMENT',

  // Settlement Types
  INSTANT_SETTLEMENT = 'INSTANT_SETTLEMENT',
  DELAYED_SETTLEMENT = 'DELAYED_SETTLEMENT',
  BATCH_SETTLEMENT = 'BATCH_SETTLEMENT',
  NET_SETTLEMENT = 'NET_SETTLEMENT',
}

// !==!==!==!==!==!==!==!===
// PAYMENT METHODS
// !==!==!==!==!==!==!==!===

export enum PaymentMethod {
  // Traditional Banking
  BANK_WIRE = 'BANK_WIRE',
  ACH = 'ACH',
  SEPA = 'SEPA',
  SWIFT = 'SWIFT',

  // Digital Wallets
  PAYPAL = 'PAYPAL',
  SKRILL = 'SKRILL',
  NETELLER = 'NETELLER',
  PERFECT_MONEY = 'PERFECT_MONEY',

  // Mobile Money
  CASH_APP = 'CASH_APP',
  VENMO = 'VENMO',
  ZELLE = 'ZELLE',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',

  // Cryptocurrencies
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM',
  USDT = 'USDT',
  USDC = 'USDC',
  LITECOIN = 'LITECOIN',

  // Regional Methods
  ALIPAY = 'ALIPAY',
  WECHAT_PAY = 'WECHAT_PAY',
  PIX = 'PIX',
  UPI = 'UPI',
  M_PESA = 'M_PESA',

  // Cash Methods
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  CASH_PICKUP = 'CASH_PICKUP',
  ATM_DEPOSIT = 'ATM_DEPOSIT',
}

// !==!==!==!==!==!==!==!===
// ORDER CONSTANTS
// !==!==!==!==!==!==!==!===

export const ORDER_CONSTANTS = {
  // Order Types
  TYPES: {
    MARKET: 'MARKET',
    LIMIT: 'LIMIT',
    STOP_LOSS: 'STOP_LOSS',
    STOP_LIMIT: 'STOP_LIMIT',
    OTC_BLOCK: 'OTC_BLOCK',
    ICEBERG: 'ICEBERG',
    TWAP: 'TWAP',
    VWAP: 'VWAP',
    AON: 'AON', // All or Nothing
    IOC: 'IOC', // Immediate or Cancel
    FOK: 'FOK', // Fill or Kill
    GTC: 'GTC', // Good Till Cancel
    GTD: 'GTD', // Good Till Date
    PEGGED: 'PEGGED',
  },

  // Order Status
  STATUS: {
    PENDING: 'PENDING',
    OPEN: 'OPEN',
    PARTIALLY_FILLED: 'PARTIALLY_FILLED',
    FILLED: 'FILLED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    MATCHING: 'MATCHING',
    NEGOTIATING: 'NEGOTIATING',
    SUSPENDED: 'SUSPENDED',
  },

  // Order Sides
  SIDES: {
    BUY: 'BUY',
    SELL: 'SELL',
    BUY_STOP: 'BUY_STOP',
    SELL_STOP: 'SELL_STOP',
  },
} as const;

// !==!==!==!==!==!==!==!===
// FEE STRUCTURE CONSTANTS
// !==!==!==!==!==!==!==!===

export const FEE_STRUCTURE = {
  // Base Fees by Customer Type
  BASE_FEES: {
    RETAIL: 0.005, // 0.5%
    PROFESSIONAL: 0.003, // 0.3%
    INSTITUTIONAL: 0.0015, // 0.15%
    VIP: 0.001, // 0.1%
    MARKET_MAKER: 0.0005, // 0.05%
  },

  // P2P Transaction Fees
  P2P_FEES: {
    BASE_PERCENTAGE: 0.025, // 2.5%
    FIXED_PER_THOUSAND: 5, // $5 per $1000
    MINIMUM_FEE: 1, // $1 minimum
    MAXIMUM_FEE: 500, // $500 maximum
  },

  // Service Tier Discounts
  TIER_DISCOUNTS: {
    TIER_1: 0, // 0% discount
    TIER_2: 0.005, // 0.5% discount
    TIER_3: 0.015, // 1.5% discount
  },

  // Payment Method Surcharges
  PAYMENT_SURCHARGES: {
    BANK_WIRE: 0,
    PAYPAL: 0.002, // +0.2%
    CASH_APP: 0.001, // +0.1%
    CRYPTO: -0.001, // -0.1% (discount)
    CASH: 0.005, // +0.5%
  },

  // Volume Discounts (Monthly)
  VOLUME_DISCOUNTS: {
    TIER_1: { min: 0, max: 100000, discount: 0 },
    TIER_2: { min: 100000, max: 500000, discount: 0.0025 },
    TIER_3: { min: 500000, max: 1000000, discount: 0.005 },
    TIER_4: { min: 1000000, max: 5000000, discount: 0.0075 },
    TIER_5: { min: 5000000, max: Infinity, discount: 0.01 },
  },
} as const;

// !==!==!==!==!==!==!==!===
// COMMISSION STRUCTURE
// !==!==!==!==!==!==!==!===

export const COMMISSION_STRUCTURE = {
  // Agent Commission Tiers
  AGENT_TIERS: {
    JUNIOR: { level: 1, rate: 0.15, minVolume: 0 },
    SENIOR: { level: 2, rate: 0.2, minVolume: 50000 },
    TEAM_LEAD: { level: 3, rate: 0.25, minVolume: 200000 },
    MANAGER: { level: 4, rate: 0.3, minVolume: 500000 },
    DIRECTOR: { level: 5, rate: 0.35, minVolume: 1000000 },
  },

  // Referral Commissions
  REFERRAL_RATES: {
    DIRECT: 0.3, // 30% of platform revenue
    SECOND_TIER: 0.1, // 10% of direct referral's commission
    THIRD_TIER: 0.05, // 5% of second tier's commission
  },

  // Affiliate Program
  AFFILIATE_TIERS: {
    BRONZE: { minReferrals: 0, rate: 0.25, bonus: 0 },
    SILVER: { minReferrals: 10, rate: 0.3, bonus: 100 },
    GOLD: { minReferrals: 50, rate: 0.35, bonus: 500 },
    DIAMOND: { minReferrals: 100, rate: 0.4, bonus: 2000 },
  },

  // Performance Bonuses
  BONUSES: {
    MONTHLY_TARGET: { target: 100000, bonus: 1000 },
    QUARTERLY_TARGET: { target: 500000, bonus: 5000 },
    ANNUAL_TARGET: { target: 2000000, bonus: 25000 },
  },
} as const;

// !==!==!==!==!==!==!==!===
// TRADING LIMITS
// !==!==!==!==!==!==!==!===

export const TRADING_LIMITS = {
  // Daily Limits by Customer Type
  DAILY_LIMITS: {
    NEW: { deposit: 5000, withdrawal: 2500, transaction: 1000 },
    REGULAR: { deposit: 10000, withdrawal: 5000, transaction: 2500 },
    VIP: { deposit: 50000, withdrawal: 25000, transaction: 10000 },
    INSTITUTIONAL: {
      deposit: 1000000,
      withdrawal: 500000,
      transaction: 250000,
    },
  },

  // Single Transaction Limits
  SINGLE_LIMITS: {
    RETAIL_MIN: 10,
    RETAIL_MAX: 25000,
    PROFESSIONAL_MIN: 1000,
    PROFESSIONAL_MAX: 250000,
    INSTITUTIONAL_MIN: 25000,
    INSTITUTIONAL_MAX: Infinity,
  },

  // OTC Block Trade Minimums
  OTC_MINIMUMS: {
    BTC: 100000, // $100K
    ETH: 50000, // $50K
    USDT: 25000, // $25K
    FOREX: 100000, // $100K
    COMMODITIES: 250000, // $250K
  },
} as const;

// !==!==!==!==!==!==!==!===
// L-KEY MAPPING SYSTEM
// !==!==!==!==!==!==!==!===

export const L_KEY_MAPPING = {
  // Party L-Keys (L1xxx)
  PARTIES: {
    L1001: PartyType.BUYER,
    L1002: PartyType.SELLER,
    L1003: PartyType.MARKET_MAKER,
    L1004: PartyType.LIQUIDITY_PROVIDER,
    L1005: PartyType.BROKER,
    L1006: PartyType.AGENT,
    L1007: PartyType.ESCROW_AGENT,
    L1008: PartyType.CLEARING_HOUSE,
    L1009: PartyType.COMPLIANCE_OFFICER,
    L1010: PartyType.PLATFORM_OPERATOR,
  },

  // Customer Type L-Keys (L2xxx)
  CUSTOMERS: {
    L2001: CustomerType.NEW,
    L2002: CustomerType.REGULAR,
    L2003: CustomerType.VIP,
    L2004: CustomerType.POST_UP,
    L2005: CustomerType.CREDIT,
    L2006: CustomerType.RETAIL,
    L2007: CustomerType.PROFESSIONAL,
    L2008: CustomerType.INSTITUTIONAL,
    L2009: CustomerType.HIGH_RISK,
    L2010: CustomerType.AFFILIATE,
  },

  // Transaction L-Keys (L3xxx)
  TRANSACTIONS: {
    L3001: TransactionType.P2P_TRANSFER,
    L3002: TransactionType.OTC_SPOT,
    L3003: TransactionType.OTC_BLOCK,
    L3004: TransactionType.DEPOSIT_FIAT,
    L3005: TransactionType.DEPOSIT_CRYPTO,
    L3006: TransactionType.WITHDRAWAL_FIAT,
    L3007: TransactionType.WITHDRAWAL_CRYPTO,
    L3008: TransactionType.COMMISSION_PAYMENT,
    L3009: TransactionType.FEE_COLLECTION,
    L3010: TransactionType.INSTANT_SETTLEMENT,
  },

  // Payment Method L-Keys (L4xxx)
  PAYMENTS: {
    L4001: PaymentMethod.BANK_WIRE,
    L4002: PaymentMethod.PAYPAL,
    L4003: PaymentMethod.CASH_APP,
    L4004: PaymentMethod.BITCOIN,
    L4005: PaymentMethod.ETHEREUM,
    L4006: PaymentMethod.USDT,
    L4007: PaymentMethod.VENMO,
    L4008: PaymentMethod.ZELLE,
    L4009: PaymentMethod.CASH_DEPOSIT,
    L4010: PaymentMethod.CRYPTO,
  },

  // Order Type L-Keys (L5xxx)
  ORDERS: {
    L5001: ORDER_CONSTANTS.TYPES.MARKET,
    L5002: ORDER_CONSTANTS.TYPES.LIMIT,
    L5003: ORDER_CONSTANTS.TYPES.STOP_LOSS,
    L5004: ORDER_CONSTANTS.TYPES.OTC_BLOCK,
    L5005: ORDER_CONSTANTS.TYPES.ICEBERG,
    L5006: ORDER_CONSTANTS.TYPES.TWAP,
    L5007: ORDER_CONSTANTS.TYPES.AON,
    L5008: ORDER_CONSTANTS.TYPES.IOC,
    L5009: ORDER_CONSTANTS.TYPES.FOK,
    L5010: ORDER_CONSTANTS.TYPES.GTC,
  },

  // Status L-Keys (L6xxx)
  STATUS: {
    L6001: ORDER_CONSTANTS.STATUS.PENDING,
    L6002: ORDER_CONSTANTS.STATUS.OPEN,
    L6003: ORDER_CONSTANTS.STATUS.PARTIALLY_FILLED,
    L6004: ORDER_CONSTANTS.STATUS.FILLED,
    L6005: ORDER_CONSTANTS.STATUS.CANCELLED,
    L6006: ORDER_CONSTANTS.STATUS.REJECTED,
    L6007: ORDER_CONSTANTS.STATUS.MATCHING,
    L6008: ORDER_CONSTANTS.STATUS.NEGOTIATING,
    L6009: ORDER_CONSTANTS.STATUS.EXPIRED,
    L6010: ORDER_CONSTANTS.STATUS.SUSPENDED,
  },

  // Fee Type L-Keys (L7xxx)
  FEES: {
    L7001: 'BASE_FEE',
    L7002: 'P2P_PERCENTAGE',
    L7003: 'P2P_FIXED',
    L7004: 'TIER_DISCOUNT',
    L7005: 'VOLUME_DISCOUNT',
    L7006: 'PAYMENT_SURCHARGE',
    L7007: 'COMMISSION',
    L7008: 'REFERRAL_BONUS',
    L7009: 'REBATE',
    L7010: 'NETWORK_FEE',
  },

  // Risk Level L-Keys (L8xxx)
  RISK: {
    L8001: 'LOW_RISK',
    L8002: 'MEDIUM_RISK',
    L8003: 'HIGH_RISK',
    L8004: 'CRITICAL_RISK',
    L8005: 'BLOCKED',
    L8006: 'UNDER_REVIEW',
    L8007: 'VERIFIED',
    L8008: 'ENHANCED_KYC',
    L8009: 'RESTRICTED',
    L8010: 'WHITELIST',
  },

  // Service Tier L-Keys (L9xxx)
  SERVICE_TIERS: {
    L9001: 'TIER_1_ESSENTIAL',
    L9002: 'TIER_2_PREMIUM',
    L9003: 'TIER_3_VIP',
    L9004: 'TIER_4_INSTITUTIONAL',
    L9005: 'CUSTOM_TIER',
  },
} as const;

// !==!==!==!==!==!==!==!===
// REVERSE L-KEY LOOKUP
// !==!==!==!==!==!==!==!===

export function getLKeyForValue(value: string): string | undefined {
  // Search through all L_KEY_MAPPING categories
  for (const category of Object.values(L_KEY_MAPPING)) {
    for (const [lKey, mappedValue] of Object.entries(category)) {
      if (mappedValue === value) {
        return lKey;
      }
    }
  }
  return undefined;
}

export function getValueForLKey(lKey: string): string | undefined {
  // Search through all L_KEY_MAPPING categories
  for (const category of Object.values(L_KEY_MAPPING)) {
    if (lKey in category) {
      return (category as any)[lKey];
    }
  }
  return undefined;
}

// !==!==!==!==!==!==!==!===
// COMPLIANCE CONSTANTS
// !==!==!==!==!==!==!==!===

export const COMPLIANCE_CONSTANTS = {
  // KYC Levels
  KYC_LEVELS: {
    NONE: { level: 0, dailyLimit: 1000 },
    BASIC: { level: 1, dailyLimit: 5000 },
    ENHANCED: { level: 2, dailyLimit: 25000 },
    FULL: { level: 3, dailyLimit: 100000 },
    INSTITUTIONAL: { level: 4, dailyLimit: Infinity },
  },

  // AML Risk Scores
  AML_RISK_SCORES: {
    LOW: { min: 0, max: 30, action: 'AUTO_APPROVE' },
    MEDIUM: { min: 31, max: 60, action: 'MANUAL_REVIEW' },
    HIGH: { min: 61, max: 80, action: 'ENHANCED_REVIEW' },
    CRITICAL: { min: 81, max: 100, action: 'BLOCK' },
  },

  // Document Requirements
  DOCUMENTS: {
    IDENTITY: ['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID'],
    PROOF_OF_ADDRESS: ['UTILITY_BILL', 'BANK_STATEMENT', 'RENTAL_AGREEMENT'],
    PROOF_OF_FUNDS: ['BANK_STATEMENT', 'PAYSLIP', 'TAX_RETURN'],
    BUSINESS: ['INCORPORATION', 'BUSINESS_LICENSE', 'FINANCIAL_STATEMENTS'],
  },

  // Reporting Thresholds
  REPORTING_THRESHOLDS: {
    CTR: 10000, // Currency Transaction Report
    SAR: 5000, // Suspicious Activity Report
    LARGE_TRANSACTION: 25000,
    AGGREGATE_DAILY: 10000,
  },
} as const;

// !==!==!==!==!==!==!==!===
// SYSTEM CONSTANTS
// !==!==!==!==!==!==!==!===

export const SYSTEM_CONSTANTS = {
  // API Rate Limits
  RATE_LIMITS: {
    PUBLIC_API: 100, // requests per minute
    AUTHENTICATED_API: 1000,
    TRADING_API: 2000,
    ADMIN_API: 5000,
  },

  // Session Timeouts (seconds)
  TIMEOUTS: {
    USER_SESSION: 3600, // 1 hour
    API_TOKEN: 86400, // 24 hours
    OTP: 300, // 5 minutes
    NEGOTIATION: 1800, // 30 minutes
    ORDER_EXPIRY: 86400, // 24 hours
  },

  // System Limits
  SYSTEM_LIMITS: {
    MAX_ORDERS_PER_USER: 100,
    MAX_API_KEYS_PER_USER: 5,
    MAX_WITHDRAWAL_ADDRESSES: 10,
    MAX_REFERRALS_PER_USER: 1000,
    MAX_COMMISSION_DEPTH: 5,
  },

  // Cache TTL (seconds)
  CACHE_TTL: {
    USER_PROFILE: 300,
    ORDER_BOOK: 1,
    MARKET_DATA: 5,
    BALANCE: 10,
    COMMISSION: 3600,
  },
} as const;

// !==!==!==!==!==!==!==!===
// TELEGRAM BOT CONSTANTS
// !==!==!==!==!==!==!==!===

export const TELEGRAM_CONSTANTS = {
  // Bot Commands
  COMMANDS: {
    // Trading Commands
    PLACE_ORDER: '/place_order',
    CANCEL_ORDER: '/cancel_order',
    VIEW_ORDERS: '/view_orders',
    ORDER_BOOK: '/orderbook',

    // Account Commands
    BALANCE: '/balance',
    DEPOSIT: '/deposit',
    WITHDRAW: '/withdraw',
    HISTORY: '/history',

    // P2P Commands
    P2P_POST: '/p2p_post',
    P2P_MATCH: '/p2p_match',
    P2P_CONFIRM: '/p2p_confirm',
    P2P_DISPUTE: '/p2p_dispute',

    // Support Commands
    SUPPORT: '/support',
    FAQ: '/faq',
    HELP: '/help',
    STATUS: '/status',
  },

  // Channel IDs
  CHANNELS: {
    MAIN_HALL: '@Fire22OTCHall',
    VIP_LOUNGE: '@Fire22VIPLounge',
    ANNOUNCEMENTS: '@Fire22Announcements',
    SUPPORT: '@Fire22Support',
    P2P_MATCHING: '@Fire22P2P',
  },

  // Response Templates
  TEMPLATES: {
    WELCOME: '🔥 Welcome to Fire22 OTC Trading!',
    ORDER_PLACED: '✅ Order #{orderId} placed successfully',
    ORDER_MATCHED: '🤝 Order matched! Deal room: {roomId}',
    TRADE_COMPLETE: '🎉 Trade completed! Amount: ${amount}',
    ERROR: '❌ Error: {message}',
  },
} as const;

// !==!==!==!==!==!==!==!===
// EXPORT TYPE DEFINITIONS
// !==!==!==!==!==!==!==!===

export type LKey = keyof (typeof L_KEY_MAPPING)[keyof typeof L_KEY_MAPPING];
export type PartyTypeValue = (typeof PartyType)[keyof typeof PartyType];
export type CustomerTypeValue = (typeof CustomerType)[keyof typeof CustomerType];
export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];
export type PaymentMethodValue = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// Type guards
export function isValidLKey(key: string): key is LKey {
  return getValueForLKey(key) !== undefined;
}

export function isValidPartyType(type: string): type is PartyTypeValue {
  return Object.values(PartyType).includes(type as PartyTypeValue);
}

export function isValidCustomerType(type: string): type is CustomerTypeValue {
  return Object.values(CustomerType).includes(type as CustomerTypeValue);
}

export function isValidPaymentMethod(method: string): method is PaymentMethodValue {
  return Object.values(PaymentMethod).includes(method as PaymentMethodValue);
}

// !==!==!==!==!==!==!==!===
// UTILITY FUNCTIONS
// !==!==!==!==!==!==!==!===

/**
 * Calculate total fee based on all parameters
 */
export function calculateTotalFee(params: {
  amount: number;
  customerType: CustomerTypeValue;
  paymentMethod: PaymentMethodValue;
  serviceTier: number;
  monthlyVolume: number;
}): {
  baseFee: number;
  tierDiscount: number;
  volumeDiscount: number;
  paymentSurcharge: number;
  totalFee: number;
  effectiveRate: number;
} {
  const { amount, customerType, paymentMethod, serviceTier, monthlyVolume } = params;

  // Get base fee rate
  let baseFeeRate = FEE_STRUCTURE.P2P_FEES.BASE_PERCENTAGE;
  if (customerType === CustomerType.INSTITUTIONAL) {
    baseFeeRate = FEE_STRUCTURE.BASE_FEES.INSTITUTIONAL;
  } else if (customerType === CustomerType.PROFESSIONAL) {
    baseFeeRate = FEE_STRUCTURE.BASE_FEES.PROFESSIONAL;
  } else if (customerType === CustomerType.VIP) {
    baseFeeRate = FEE_STRUCTURE.BASE_FEES.VIP;
  }

  // Calculate base fee
  const percentageFee = amount * baseFeeRate;
  const fixedFee = Math.ceil(amount / 1000) * FEE_STRUCTURE.P2P_FEES.FIXED_PER_THOUSAND;
  const baseFee = percentageFee + fixedFee;

  // Apply tier discount
  const tierDiscountRate =
    serviceTier === 3
      ? FEE_STRUCTURE.TIER_DISCOUNTS.TIER_3
      : serviceTier === 2
        ? FEE_STRUCTURE.TIER_DISCOUNTS.TIER_2
        : 0;
  const tierDiscount = amount * tierDiscountRate;

  // Apply volume discount
  let volumeDiscountRate = 0;
  for (const tier of Object.values(FEE_STRUCTURE.VOLUME_DISCOUNTS)) {
    if (monthlyVolume >= tier.min && monthlyVolume < tier.max) {
      volumeDiscountRate = tier.discount;
      break;
    }
  }
  const volumeDiscount = amount * volumeDiscountRate;

  // Apply payment method surcharge
  const surchargeRate = FEE_STRUCTURE.PAYMENT_SURCHARGES[paymentMethod] || 0;
  const paymentSurcharge = amount * surchargeRate;

  // Calculate total fee
  const totalFee = Math.max(
    FEE_STRUCTURE.P2P_FEES.MINIMUM_FEE,
    Math.min(
      FEE_STRUCTURE.P2P_FEES.MAXIMUM_FEE,
      baseFee - tierDiscount - volumeDiscount + paymentSurcharge
    )
  );

  const effectiveRate = totalFee / amount;

  return {
    baseFee,
    tierDiscount,
    volumeDiscount,
    paymentSurcharge,
    totalFee,
    effectiveRate,
  };
}

/**
 * Get commission rate for agent level
 */
export function getAgentCommissionRate(level: number, volume: number): number {
  const tiers = Object.values(COMMISSION_STRUCTURE.AGENT_TIERS);
  const tier = tiers.find(t => t.level === level && volume >= t.minVolume);
  return tier ? tier.rate : 0;
}

/**
 * Check if transaction requires enhanced KYC
 */
export function requiresEnhancedKYC(amount: number, customerType: CustomerTypeValue): boolean {
  if (amount > COMPLIANCE_CONSTANTS.REPORTING_THRESHOLDS.LARGE_TRANSACTION) {
    return true;
  }
  if (customerType === CustomerType.HIGH_RISK || customerType === CustomerType.RESTRICTED) {
    return true;
  }
  return false;
}

/**
 * Get L-Key category prefix
 */
export function getLKeyCategoryPrefix(lKey: string): string {
  const prefix = lKey.substring(0, 2);
  const categoryMap: Record<string, string> = {
    L1: 'PARTY',
    L2: 'CUSTOMER',
    L3: 'TRANSACTION',
    L4: 'PAYMENT',
    L5: 'ORDER',
    L6: 'STATUS',
    L7: 'FEE',
    L8: 'RISK',
    L9: 'SERVICE',
  };
  return categoryMap[prefix] || 'UNKNOWN';
}

export default {
  PartyType,
  CustomerType,
  TransactionType,
  PaymentMethod,
  ORDER_CONSTANTS,
  FEE_STRUCTURE,
  COMMISSION_STRUCTURE,
  TRADING_LIMITS,
  L_KEY_MAPPING,
  COMPLIANCE_CONSTANTS,
  SYSTEM_CONSTANTS,
  TELEGRAM_CONSTANTS,
  getLKeyForValue,
  getValueForLKey,
  calculateTotalFee,
  getAgentCommissionRate,
  requiresEnhancedKYC,
  getLKeyCategoryPrefix,
};
