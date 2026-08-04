// lib/partner-profile/schema.ts — unified Partner Profile v0 model.
//
// One canonical partner record across FactoryWager ops and Sports Terminal.
// Keyed by CODE (^[A-Z]{3,6}$); callSign (CODE-NNN) and treeNodeId are derived
// aliases. See docs/design/unified-partner-profile.md.
//
// Invariants:
//   1. CODE is the single key (vault · limits · dossier · telegram · boards).
//   2. books.<bookKey> references the canonical @factorywager/bookmakers
//      registry entry (many partners per bookmaker, many bookmakers per partner).
//   3. Credentials are vault-only — the profile carries account.vaultKey, never
//      a plaintext password.

import type { PartnerTemplateId } from '../types/branded';
import type { TelegramNotificationPreferences } from '../telegram/partner-notifications';

export const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
export const CALL_SIGN_RE = /^[A-Z]{3,6}-\d{3}$/;
export const BOOK_KEY_RE = /^[a-z][a-z0-9-]*$/;
export const VAULT_KEY_RE = /^[a-z][a-z0-9_.:-]*$/i;
export const TELEGRAM_CHAT_ID_RE = /^-?\d{5,}$/;

export const PARTNER_LIFECYCLE_STATUSES = [
  'signup',
  'materialized',
  'kyc_pending',
  'active',
  'cultivating',
  'graduated',
  'suspended',
  'terminated',
] as const;
export type PartnerLifecycleStatus = (typeof PARTNER_LIFECYCLE_STATUSES)[number];

export const PARTNER_PHASES = ['operator_ready', 'onboarding', 'incomplete', 'paused'] as const;
export type PartnerPhase = (typeof PARTNER_PHASES)[number];

export const BOOK_TYPES = [
  'legal',
  'offshore',
  'pph',
  'crypto',
  'sweepstakes',
  'exchange',
] as const;
export type BookType = (typeof BOOK_TYPES)[number];

export const SIGNAL_GATES = ['steam', 'arb', 'clv', 'manual', 'predictive'] as const;
export type SignalGate = (typeof SIGNAL_GATES)[number];

export const TELEGRAM_TOPICS = ['general', 'ops', 'alerts', 'liquidity', 'accounting'] as const;
export type TelegramTopic = (typeof TELEGRAM_TOPICS)[number];

export const PROFILE_SOURCES = ['referral', 'portal', 'telegram', 'promoted'] as const;
export type ProfileSource = (typeof PROFILE_SOURCES)[number];

// ── Shape ───────────────────────────────────────────────────────────────────

export type PartnerProfile = {
  meta: {
    templateId: PartnerTemplateId;
    name: string;
    version: string;
    source: ProfileSource;
  };
  identity: {
    code: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
    callSign: string; // brand-ok — call sign CODE-NNN (derived alias)
    treeNodeId?: string; // brand-ok — ops-tree node id (derived alias)
    status: string;
  };
  lineage?: {
    parent?: string; // brand-ok — parent partner CODE
    expert?: string; // brand-ok — expert partner CODE
    cutPct?: number;
  };
  lifecycle: {
    status: PartnerLifecycleStatus;
    phase: PartnerPhase; // derived, see derivePhase
  };
  telegram?: {
    chatId?: string; // brand-ok — telegram chat id wire
    topics?: Partial<Record<TelegramTopic, number | null>>;
    /** Notification opt-in flags (all default on). See lib/telegram/partner-notifications.ts. */
    preferences?: TelegramNotificationPreferences;
  };
  jurisdiction?: {
    type?: 'legal' | 'offshore' | 'pph' | 'crypto';
    allowedStates?: string[];
    allowedCountries?: string[];
    minimumAge?: number;
    kycTier?: 'none' | 'basic' | 'full';
    geoFenceEnabled?: boolean;
    taxForm?: string;
    selfExclusionCheck?: boolean;
  };
  rules?: {
    sor?: {
      eligibleTiers?: string[];
      maxExposurePerSignal?: number;
      maxDailyExposure?: number;
      maxSingleBet?: number;
      bookWhitelist?: string[];
      bookBlacklist?: string[];
      signalGates?: Partial<Record<SignalGate, boolean>>;
      requireOpsecGreen?: boolean;
      opsecScoreMax?: number;
    };
  };
  books?: Record<string, PartnerBookAccount>;
  cultivation?: {
    initialDepositTarget?: number;
    depositScheduleWeeks?: number;
    depositAmounts?: number[];
    initialLimit?: number;
    limitRaiseTarget?: number;
    raiseRequestWeek?: number;
    recreationalMix?: number;
    roundStakes?: boolean;
    casinoPlayPct?: number;
    oddsBoostAcceptance?: number;
    maxBetFrequencyDaily?: number;
    requiredSportsDiversity?: number;
  };
  settlement?: {
    commissionStructure?: string;
    commissionPct?: number;
    commissionTiers?: number[];
    makeupCarry?: boolean;
    makeupCap?: number;
    payoutFrequency?: string;
    currency?: string;
    holdTargetPct?: number;
  };
  balance?: {
    initialCapitalRequirement?: number;
    marginCallThreshold?: number;
    marginCallAction?: 'notify' | 'pause' | 'block';
    autoInject?: boolean;
  };
  compliance?: {
    autoSuspendRules?: boolean;
    reviewRequiredFor?: string[];
    auditRetentionDays?: number;
    maxOpsecScore?: number;
    require2FA?: boolean;
  };
  accounting?: {
    fundStatus?: 'ready' | 'deferred' | 'paused' | 'blocked';
    deposits?: Array<{ amount: number; date: string; rail: string }>;
    credits?: Array<{ amount: number; date: string }>;
    freeRoll?: { total: number; used: number };
    ledger?: unknown[];
  };
  tracking?: {
    accounts?: { total: number; ready: number; deferred: number; blocked: number };
    limits?: { tracked: number; missing: number; coveragePct: number };
    communication?: {
      chatLinked: boolean;
      topicsConfigured: number;
      topicsRequired: number;
      ready: boolean;
    };
  };
};

export type PartnerBookAccount = {
  type: BookType;
  account?: {
    username?: string;
    vaultKey?: string; // brand-ok — partner_vault key, never a plaintext secret
  };
  funding?: {
    method?: string; // deposit.method.* concept ref (e.g. deposit.method.venmo)
    rail?: string; // brand-ok — payment rail ref (Venmo/CashApp/Zelle/…)
    target?: string;
  };
  limits?: {
    maxBet?: number;
    freeRollPct?: number;
  };
  status?: 'ready' | 'deferred' | 'paused' | 'blocked' | 'partial' | 'funded';
  withdrawPath?: string;
};

// ── Validation ─────────────────────────────────────────────────────────────

export type ProfileValidation =
  | { valid: true; profile: PartnerProfile }
  | { valid: false; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Derive the ops phase from lifecycle status + completeness (pure). */
export function derivePhase(
  status: PartnerLifecycleStatus,
  completeness: { telegramLinked: boolean; hasBooks: boolean }
): PartnerPhase {
  if (status === 'suspended' || status === 'terminated') return 'paused';
  if (status === 'signup' || status === 'materialized' || status === 'kyc_pending') {
    return 'onboarding';
  }
  if (status === 'active' || status === 'cultivating' || status === 'graduated') {
    if (!completeness.telegramLinked || !completeness.hasBooks) return 'incomplete';
    return 'operator_ready';
  }
  return 'incomplete';
}

/** Validate a candidate profile. Returns issues ([] = valid).
 * Wire validator: raw profile input (TOML / intake) parsed at the edge; see
 * WIRE_BOUNDARY — issues-only return, no re-decode inward. */
// eslint-disable-next-line harness/no-unknown-function-param
export function validatePartnerProfile(value: unknown): ProfileValidation {
  const issues: string[] = [];
  if (!isRecord(value)) return { valid: false, issues: ['profile is not an object'] };
  if (!isRecord(value.meta)) {
    issues.push('meta required');
  } else {
    if (typeof value.meta.templateId !== 'string' || value.meta.templateId.length === 0) {
      issues.push('meta.templateId required');
    }
    if (typeof value.meta.name !== 'string' || value.meta.name.length === 0) {
      issues.push('meta.name required');
    }
    if (typeof value.meta.version !== 'string') issues.push('meta.version required');
    if (!PROFILE_SOURCES.includes(value.meta.source as ProfileSource)) {
      issues.push(`meta.source must be one of ${PROFILE_SOURCES.join('|')}`);
    }
  }
  if (!isRecord(value.identity)) {
    issues.push('identity required');
  } else {
    const code = value.identity.code;
    if (typeof code !== 'string' || !PARTNER_CODE_RE.test(code)) {
      issues.push(`identity.code must match ${PARTNER_CODE_RE}`);
    }
    const callSign = value.identity.callSign;
    if (typeof callSign !== 'string' || !CALL_SIGN_RE.test(callSign)) {
      issues.push(`identity.callSign must match ${CALL_SIGN_RE}`);
    } else if (typeof code === 'string' && !callSign.startsWith(code)) {
      issues.push(`identity.callSign ${callSign} must derive from code ${code}`);
    }
    if (value.identity.treeNodeId !== undefined && typeof value.identity.treeNodeId !== 'string') {
      issues.push('identity.treeNodeId must be a string');
    }
    if (typeof value.identity.status !== 'string' || value.identity.status.length === 0) {
      issues.push('identity.status required');
    }
  }
  if (!isRecord(value.lifecycle)) {
    issues.push('lifecycle required');
  } else {
    if (!PARTNER_LIFECYCLE_STATUSES.includes(value.lifecycle.status as PartnerLifecycleStatus)) {
      issues.push(`lifecycle.status must be one of ${PARTNER_LIFECYCLE_STATUSES.join('|')}`);
    }
    if (!PARTNER_PHASES.includes(value.lifecycle.phase as PartnerPhase)) {
      issues.push(`lifecycle.phase must be one of ${PARTNER_PHASES.join('|')}`);
    }
  }
  if (value.books !== undefined) {
    if (!isRecord(value.books)) {
      issues.push('books must be an object keyed by bookKey');
    } else {
      for (const [bookKey, account] of Object.entries(value.books)) {
        if (!BOOK_KEY_RE.test(bookKey)) {
          issues.push(`bookKey "${bookKey}" must match ${BOOK_KEY_RE}`);
        }
        if (!isRecord(account)) {
          issues.push(`books.${bookKey} must be an object`);
          continue;
        }
        if (!BOOK_TYPES.includes(account.type as BookType)) {
          issues.push(`books.${bookKey}.type must be one of ${BOOK_TYPES.join('|')}`);
        }
        const vaultKey = (account.account as Record<string, unknown> | undefined)?.vaultKey;
        if (
          vaultKey !== undefined &&
          (typeof vaultKey !== 'string' || !VAULT_KEY_RE.test(vaultKey))
        ) {
          issues.push(`books.${bookKey}.account.vaultKey invalid`);
        }
        const username = (account.account as Record<string, unknown> | undefined)?.username;
        if (username !== undefined && typeof username !== 'string') {
          issues.push(`books.${bookKey}.account.username must be a string`);
        }
        if (account.password !== undefined) {
          issues.push(`books.${bookKey}.password not allowed — credentials are vault-only`);
        }
      }
    }
  }
  if (value.telegram !== undefined) {
    if (!isRecord(value.telegram)) {
      issues.push('telegram must be an object');
    } else {
      const chatId = value.telegram.chatId;
      if (
        chatId !== undefined &&
        (typeof chatId !== 'string' || !TELEGRAM_CHAT_ID_RE.test(chatId))
      ) {
        issues.push('telegram.chatId must be a numeric telegram chat id');
      }
      if (value.telegram.topics !== undefined && !isRecord(value.telegram.topics)) {
        issues.push('telegram.topics must be an object');
      }
      if (value.telegram.preferences !== undefined) {
        if (!isRecord(value.telegram.preferences)) {
          issues.push('telegram.preferences must be an object');
        } else {
          for (const [key, val] of Object.entries(value.telegram.preferences)) {
            if (typeof val !== 'boolean') {
              issues.push(`telegram.preferences.${key} must be a boolean`);
            }
          }
        }
      }
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, profile: value as unknown as PartnerProfile };
}
