/**
 * Core constants for Fire22 Dashboard
 */

export const CONSTANTS = {
  // API Endpoints
  ENDPOINTS: {
    AGENTS: '/api/agents',
    CUSTOMERS: '/api/customers',
    WAGERS: '/api/wagers',
    TRANSACTIONS: '/api/transactions',
    REPORTS: '/api/reports',
  },

  // Status codes
  STATUS: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },

  // Wager statuses
  WAGER_STATUS: {
    PENDING: 'pending',
    WON: 'won',
    LOST: 'lost',
    VOID: 'void',
    CANCELLED: 'cancelled',
  },

  // Transaction types
  TRANSACTION_TYPE: {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    WAGER: 'wager',
    PAYOUT: 'payout',
    ADJUSTMENT: 'adjustment',
  },

  // Agent levels
  AGENT_LEVELS: {
    SUPER_AGENT: 1,
    MASTER_AGENT: 2,
    AGENT: 3,
    SUB_AGENT: 4,
  },
} as const;

export type WagerStatus = (typeof CONSTANTS.WAGER_STATUS)[keyof typeof CONSTANTS.WAGER_STATUS];
export type TransactionType =
  (typeof CONSTANTS.TRANSACTION_TYPE)[keyof typeof CONSTANTS.TRANSACTION_TYPE];
