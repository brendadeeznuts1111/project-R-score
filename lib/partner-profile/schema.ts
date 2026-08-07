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

export function isPartnerLifecycleStatus(value: unknown): value is PartnerLifecycleStatus {
  return typeof value === 'string' && PARTNER_LIFECYCLE_STATUSES.some(status => status === value);
}

export function parsePartnerLifecycleStatus(value: unknown): PartnerLifecycleStatus {
  if (!isPartnerLifecycleStatus(value)) {
    throw new Error(`Invalid PartnerLifecycleStatus: ${String(value)}`);
  }
  return value;
}

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
  { valid: true; profile: PartnerProfile } | { valid: false; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const PARTNER_PROFILE_TOP_LEVEL_KEYS = [
  'meta',
  'identity',
  'lineage',
  'lifecycle',
  'telegram',
  'jurisdiction',
  'rules',
  'books',
  'cultivation',
  'settlement',
  'balance',
  'compliance',
  'accounting',
  'tracking',
] as const;

const FORBIDDEN_SECRET_FIELD_NAMES = new Set([
  'apikey',
  'apisecret',
  'bearer',
  'bearertoken',
  'credential',
  'credentials',
  'password',
  'passphrase',
  'privatekey',
  'secret',
  'token',
]);

function fieldPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

function normalizedFieldName(value: string): string {
  return value.replace(/[-_]/g, '').toLowerCase();
}

// Walks untyped TOML/JSON before validatePartnerProfile narrows the shape.
// eslint-disable-next-line harness/no-unknown-function-param -- boundary walk of raw profile input
function rejectSecretBearingFields(value: unknown, path: string, issues: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSecretBearingFields(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = fieldPath(path, key);
    if (FORBIDDEN_SECRET_FIELD_NAMES.has(normalizedFieldName(key))) {
      issues.push(`${nextPath} not allowed — credentials are vault-only`);
      continue;
    }
    rejectSecretBearingFields(child, nextPath, issues);
  }
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: string[]
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push(`${fieldPath(path, key)} is not allowed`);
  }
}

function optionalRecord(
  owner: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): Record<string, unknown> | undefined {
  const value = owner[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push(`${fieldPath(path, key)} must be an object`);
    return undefined;
  }
  return value;
}

function optionalString(
  owner: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
  options: { nonempty?: boolean; pattern?: RegExp } = {}
): void {
  const value = owner[key];
  if (value === undefined) return;
  if (
    typeof value !== 'string' ||
    (options.nonempty === true && value.length === 0) ||
    (options.pattern && !options.pattern.test(value))
  ) {
    issues.push(`${fieldPath(path, key)} must be a valid string`);
  }
}

function optionalBoolean(
  owner: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): void {
  const value = owner[key];
  if (value !== undefined && typeof value !== 'boolean') {
    issues.push(`${fieldPath(path, key)} must be a boolean`);
  }
}

function optionalNumber(
  owner: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[],
  options: { min?: number; max?: number; integer?: boolean } = {}
): void {
  const value = owner[key];
  if (value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (options.integer === true && !Number.isSafeInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    issues.push(`${fieldPath(path, key)} must be a valid finite number`);
  }
}

function optionalStringArray(
  owner: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): void {
  const value = owner[key];
  if (
    value !== undefined &&
    (!Array.isArray(value) || value.some(item => typeof item !== 'string'))
  ) {
    issues.push(`${fieldPath(path, key)} must be an array of strings`);
  }
}

function optionalEnum(
  owner: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  path: string,
  issues: string[]
): void {
  const value = owner[key];
  if (value !== undefined && (typeof value !== 'string' || !allowed.includes(value))) {
    issues.push(`${fieldPath(path, key)} must be one of ${allowed.join('|')}`);
  }
}

function validateOptionalProfileSections(value: Record<string, unknown>, issues: string[]): void {
  const lineage = optionalRecord(value, 'lineage', '', issues);
  if (lineage) {
    exactKeys(lineage, ['parent', 'expert', 'cutPct'], 'lineage', issues);
    optionalString(lineage, 'parent', 'lineage', issues);
    optionalString(lineage, 'expert', 'lineage', issues);
    optionalNumber(lineage, 'cutPct', 'lineage', issues, { min: 0, max: 100 });
  }

  const telegram = optionalRecord(value, 'telegram', '', issues);
  if (telegram) {
    exactKeys(telegram, ['chatId', 'topics', 'preferences'], 'telegram', issues);
    optionalString(telegram, 'chatId', 'telegram', issues, { pattern: TELEGRAM_CHAT_ID_RE });
    const topics = optionalRecord(telegram, 'topics', 'telegram', issues);
    if (topics) {
      exactKeys(topics, TELEGRAM_TOPICS, 'telegram.topics', issues);
      for (const topic of TELEGRAM_TOPICS) {
        const topicId = topics[topic];
        if (
          topicId !== undefined &&
          topicId !== null &&
          (typeof topicId !== 'number' || !Number.isSafeInteger(topicId) || topicId < 0)
        ) {
          issues.push(`telegram.topics.${topic} must be a non-negative safe integer or null`);
        }
      }
    }
    const preferences = optionalRecord(telegram, 'preferences', 'telegram', issues);
    if (preferences) {
      exactKeys(
        preferences,
        ['dailyCapacity', 'newEvents', 'betConfirm', 'dailyFinance', 'newEventsSports'],
        'telegram.preferences',
        issues
      );
      for (const key of ['dailyCapacity', 'newEvents', 'betConfirm', 'dailyFinance']) {
        optionalBoolean(preferences, key, 'telegram.preferences', issues);
      }
      optionalStringArray(preferences, 'newEventsSports', 'telegram.preferences', issues);
    }
  }

  const jurisdiction = optionalRecord(value, 'jurisdiction', '', issues);
  if (jurisdiction) {
    exactKeys(
      jurisdiction,
      [
        'type',
        'allowedStates',
        'allowedCountries',
        'minimumAge',
        'kycTier',
        'geoFenceEnabled',
        'taxForm',
        'selfExclusionCheck',
      ],
      'jurisdiction',
      issues
    );
    optionalEnum(
      jurisdiction,
      'type',
      ['legal', 'offshore', 'pph', 'crypto'],
      'jurisdiction',
      issues
    );
    optionalStringArray(jurisdiction, 'allowedStates', 'jurisdiction', issues);
    optionalStringArray(jurisdiction, 'allowedCountries', 'jurisdiction', issues);
    optionalNumber(jurisdiction, 'minimumAge', 'jurisdiction', issues, { min: 18, integer: true });
    optionalEnum(jurisdiction, 'kycTier', ['none', 'basic', 'full'], 'jurisdiction', issues);
    optionalBoolean(jurisdiction, 'geoFenceEnabled', 'jurisdiction', issues);
    optionalString(jurisdiction, 'taxForm', 'jurisdiction', issues);
    optionalBoolean(jurisdiction, 'selfExclusionCheck', 'jurisdiction', issues);
  }

  const rules = optionalRecord(value, 'rules', '', issues);
  if (rules) {
    exactKeys(rules, ['sor'], 'rules', issues);
    const sor = optionalRecord(rules, 'sor', 'rules', issues);
    if (sor) {
      exactKeys(
        sor,
        [
          'eligibleTiers',
          'maxExposurePerSignal',
          'maxDailyExposure',
          'maxSingleBet',
          'bookWhitelist',
          'bookBlacklist',
          'signalGates',
          'requireOpsecGreen',
          'opsecScoreMax',
        ],
        'rules.sor',
        issues
      );
      optionalStringArray(sor, 'eligibleTiers', 'rules.sor', issues);
      optionalStringArray(sor, 'bookWhitelist', 'rules.sor', issues);
      optionalStringArray(sor, 'bookBlacklist', 'rules.sor', issues);
      for (const key of ['maxExposurePerSignal', 'maxDailyExposure', 'maxSingleBet']) {
        optionalNumber(sor, key, 'rules.sor', issues, { min: 0, integer: true });
      }
      optionalBoolean(sor, 'requireOpsecGreen', 'rules.sor', issues);
      optionalNumber(sor, 'opsecScoreMax', 'rules.sor', issues, {
        min: 0,
        max: 100,
        integer: true,
      });
      const gates = optionalRecord(sor, 'signalGates', 'rules.sor', issues);
      if (gates) {
        exactKeys(gates, SIGNAL_GATES, 'rules.sor.signalGates', issues);
        for (const key of SIGNAL_GATES)
          optionalBoolean(gates, key, 'rules.sor.signalGates', issues);
      }
    }
  }

  const books = optionalRecord(value, 'books', '', issues);
  if (books) {
    for (const [bookKey, candidate] of Object.entries(books)) {
      const path = `books.${bookKey}`;
      if (!BOOK_KEY_RE.test(bookKey)) issues.push(`bookKey "${bookKey}" must match ${BOOK_KEY_RE}`);
      if (!isRecord(candidate)) {
        issues.push(`${path} must be an object`);
        continue;
      }
      exactKeys(
        candidate,
        ['type', 'account', 'funding', 'limits', 'status', 'withdrawPath'],
        path,
        issues
      );
      if (typeof candidate.type !== 'string' || !BOOK_TYPES.includes(candidate.type as BookType)) {
        issues.push(`${path}.type must be one of ${BOOK_TYPES.join('|')}`);
      }
      optionalEnum(
        candidate,
        'status',
        ['ready', 'deferred', 'paused', 'blocked', 'partial', 'funded'],
        path,
        issues
      );
      optionalString(candidate, 'withdrawPath', path, issues);
      const account = optionalRecord(candidate, 'account', path, issues);
      if (account) {
        exactKeys(account, ['username', 'vaultKey'], `${path}.account`, issues);
        optionalString(account, 'username', `${path}.account`, issues);
        optionalString(account, 'vaultKey', `${path}.account`, issues, { pattern: VAULT_KEY_RE });
      }
      const funding = optionalRecord(candidate, 'funding', path, issues);
      if (funding) {
        exactKeys(funding, ['method', 'rail', 'target'], `${path}.funding`, issues);
        for (const key of ['method', 'rail', 'target']) {
          optionalString(funding, key, `${path}.funding`, issues);
        }
      }
      const limits = optionalRecord(candidate, 'limits', path, issues);
      if (limits) {
        exactKeys(limits, ['maxBet', 'freeRollPct'], `${path}.limits`, issues);
        optionalNumber(limits, 'maxBet', `${path}.limits`, issues, { min: 0, integer: true });
        optionalNumber(limits, 'freeRollPct', `${path}.limits`, issues, { min: 0, max: 100 });
      }
    }
  }

  const cultivation = optionalRecord(value, 'cultivation', '', issues);
  if (cultivation) {
    const keys = [
      'initialDepositTarget',
      'depositScheduleWeeks',
      'depositAmounts',
      'initialLimit',
      'limitRaiseTarget',
      'raiseRequestWeek',
      'recreationalMix',
      'roundStakes',
      'casinoPlayPct',
      'oddsBoostAcceptance',
      'maxBetFrequencyDaily',
      'requiredSportsDiversity',
    ] as const;
    exactKeys(cultivation, keys, 'cultivation', issues);
    for (const key of [
      'initialDepositTarget',
      'depositScheduleWeeks',
      'initialLimit',
      'limitRaiseTarget',
      'raiseRequestWeek',
      'maxBetFrequencyDaily',
      'requiredSportsDiversity',
    ]) {
      optionalNumber(cultivation, key, 'cultivation', issues, { min: 0, integer: true });
    }
    for (const key of ['recreationalMix', 'casinoPlayPct', 'oddsBoostAcceptance']) {
      optionalNumber(cultivation, key, 'cultivation', issues, { min: 0, max: 100 });
    }
    optionalBoolean(cultivation, 'roundStakes', 'cultivation', issues);
    const amounts = cultivation.depositAmounts;
    if (
      amounts !== undefined &&
      (!Array.isArray(amounts) ||
        amounts.some(
          amount => typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0
        ))
    ) {
      issues.push('cultivation.depositAmounts must be non-negative safe integers');
    }
  }

  const settlement = optionalRecord(value, 'settlement', '', issues);
  if (settlement) {
    exactKeys(
      settlement,
      [
        'commissionStructure',
        'commissionPct',
        'commissionTiers',
        'makeupCarry',
        'makeupCap',
        'payoutFrequency',
        'currency',
        'holdTargetPct',
      ],
      'settlement',
      issues
    );
    optionalString(settlement, 'commissionStructure', 'settlement', issues);
    optionalNumber(settlement, 'commissionPct', 'settlement', issues, { min: 0, max: 100 });
    optionalBoolean(settlement, 'makeupCarry', 'settlement', issues);
    optionalNumber(settlement, 'makeupCap', 'settlement', issues, { min: 0, integer: true });
    optionalString(settlement, 'payoutFrequency', 'settlement', issues);
    optionalString(settlement, 'currency', 'settlement', issues, { pattern: /^[A-Z]{3}$/ });
    optionalNumber(settlement, 'holdTargetPct', 'settlement', issues, { min: 0, max: 100 });
    const tiers = settlement.commissionTiers;
    if (
      tiers !== undefined &&
      (!Array.isArray(tiers) ||
        tiers.some(
          tier => typeof tier !== 'number' || !Number.isFinite(tier) || tier < 0 || tier > 1
        ))
    ) {
      issues.push('settlement.commissionTiers must contain finite ratios from 0 to 1');
    }
  }

  const balance = optionalRecord(value, 'balance', '', issues);
  if (balance) {
    exactKeys(
      balance,
      ['initialCapitalRequirement', 'marginCallThreshold', 'marginCallAction', 'autoInject'],
      'balance',
      issues
    );
    optionalNumber(balance, 'initialCapitalRequirement', 'balance', issues, { min: 0 });
    optionalNumber(balance, 'marginCallThreshold', 'balance', issues, { min: 0 });
    optionalEnum(balance, 'marginCallAction', ['notify', 'pause', 'block'], 'balance', issues);
    optionalBoolean(balance, 'autoInject', 'balance', issues);
  }

  const compliance = optionalRecord(value, 'compliance', '', issues);
  if (compliance) {
    exactKeys(
      compliance,
      [
        'autoSuspendRules',
        'reviewRequiredFor',
        'auditRetentionDays',
        'maxOpsecScore',
        'require2FA',
      ],
      'compliance',
      issues
    );
    optionalBoolean(compliance, 'autoSuspendRules', 'compliance', issues);
    optionalStringArray(compliance, 'reviewRequiredFor', 'compliance', issues);
    optionalNumber(compliance, 'auditRetentionDays', 'compliance', issues, {
      min: 0,
      integer: true,
    });
    optionalNumber(compliance, 'maxOpsecScore', 'compliance', issues, {
      min: 0,
      max: 100,
      integer: true,
    });
    optionalBoolean(compliance, 'require2FA', 'compliance', issues);
  }

  const accounting = optionalRecord(value, 'accounting', '', issues);
  if (accounting) {
    exactKeys(
      accounting,
      ['fundStatus', 'deposits', 'credits', 'freeRoll', 'ledger'],
      'accounting',
      issues
    );
    optionalEnum(
      accounting,
      'fundStatus',
      ['ready', 'deferred', 'paused', 'blocked'],
      'accounting',
      issues
    );
    for (const [key, allowedKeys] of [
      ['deposits', ['amount', 'date', 'rail']],
      ['credits', ['amount', 'date']],
    ] as const) {
      const rows = accounting[key];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) {
        issues.push(`accounting.${key} must be an array`);
        continue;
      }
      rows.forEach((row, index) => {
        const rowPath = `accounting.${key}[${index}]`;
        if (!isRecord(row)) {
          issues.push(`${rowPath} must be an object`);
          return;
        }
        exactKeys(row, allowedKeys, rowPath, issues);
        optionalNumber(row, 'amount', rowPath, issues, { min: 0 });
        optionalString(row, 'date', rowPath, issues, { nonempty: true });
        if (key === 'deposits') optionalString(row, 'rail', rowPath, issues, { nonempty: true });
      });
    }
    const freeRoll = optionalRecord(accounting, 'freeRoll', 'accounting', issues);
    if (freeRoll) {
      exactKeys(freeRoll, ['total', 'used'], 'accounting.freeRoll', issues);
      optionalNumber(freeRoll, 'total', 'accounting.freeRoll', issues, { min: 0 });
      optionalNumber(freeRoll, 'used', 'accounting.freeRoll', issues, { min: 0 });
    }
    if (accounting.ledger !== undefined && !Array.isArray(accounting.ledger)) {
      issues.push('accounting.ledger must be an array');
    }
  }

  const tracking = optionalRecord(value, 'tracking', '', issues);
  if (tracking) {
    exactKeys(tracking, ['accounts', 'limits', 'communication'], 'tracking', issues);
    const accounts = optionalRecord(tracking, 'accounts', 'tracking', issues);
    if (accounts) {
      exactKeys(accounts, ['total', 'ready', 'deferred', 'blocked'], 'tracking.accounts', issues);
      for (const key of ['total', 'ready', 'deferred', 'blocked']) {
        optionalNumber(accounts, key, 'tracking.accounts', issues, { min: 0, integer: true });
      }
    }
    const limits = optionalRecord(tracking, 'limits', 'tracking', issues);
    if (limits) {
      exactKeys(limits, ['tracked', 'missing', 'coveragePct'], 'tracking.limits', issues);
      optionalNumber(limits, 'tracked', 'tracking.limits', issues, { min: 0, integer: true });
      optionalNumber(limits, 'missing', 'tracking.limits', issues, { min: 0, integer: true });
      optionalNumber(limits, 'coveragePct', 'tracking.limits', issues, { min: 0, max: 100 });
    }
    const communication = optionalRecord(tracking, 'communication', 'tracking', issues);
    if (communication) {
      exactKeys(
        communication,
        ['chatLinked', 'topicsConfigured', 'topicsRequired', 'ready'],
        'tracking.communication',
        issues
      );
      optionalBoolean(communication, 'chatLinked', 'tracking.communication', issues);
      optionalNumber(communication, 'topicsConfigured', 'tracking.communication', issues, {
        min: 0,
        integer: true,
      });
      optionalNumber(communication, 'topicsRequired', 'tracking.communication', issues, {
        min: 0,
        integer: true,
      });
      optionalBoolean(communication, 'ready', 'tracking.communication', issues);
    }
  }
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
  exactKeys(value, PARTNER_PROFILE_TOP_LEVEL_KEYS, '', issues);
  rejectSecretBearingFields(value, '', issues);
  if (!isRecord(value.meta)) {
    issues.push('meta required');
  } else {
    exactKeys(value.meta, ['templateId', 'name', 'version', 'source'], 'meta', issues);
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
    exactKeys(value.identity, ['code', 'callSign', 'treeNodeId', 'status'], 'identity', issues);
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
    exactKeys(value.lifecycle, ['status', 'phase'], 'lifecycle', issues);
    if (!isPartnerLifecycleStatus(value.lifecycle.status)) {
      issues.push(`lifecycle.status must be one of ${PARTNER_LIFECYCLE_STATUSES.join('|')}`);
    }
    if (!PARTNER_PHASES.includes(value.lifecycle.phase as PartnerPhase)) {
      issues.push(`lifecycle.phase must be one of ${PARTNER_PHASES.join('|')}`);
    }
  }
  validateOptionalProfileSections(value, issues);
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, profile: value as PartnerProfile };
}
