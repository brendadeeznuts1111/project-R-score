/**
 * Partner Profile OS — Zod Schemas (Strict, Single Source of Truth)
 *
 * All profile domains validated at runtime. These schemas mirror the
 * SQLite schema (partner_profiles, partner_sources, partner_cultivation,
 * partner_settlement, partner_gates, partner_telegram_topics) and
 * the TOML template structure.
 *
 * Dependencies: zod (only non-Bun dependency)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const LifecycleStateSchema = z.enum([
  "signup",
  "materialized",
  "kyc_pending",
  "active",
  "cultivating",
  "graduated",
  "frozen",
  "suspended",
  "terminated",
]);

export const KycStatusSchema = z.enum(["pending", "verified", "rejected"]);
export const RiskLevelSchema = z.enum(["green", "yellow", "orange", "red"]);

export const GateActionSchema = z.enum(["allow", "block", "adjust", "defer"]);

export const SignalTypeSchema = z.enum([
  "steam",
  "arb",
  "clv",
  "manual",
  "predictive",
]);

export const TierSchema = z.enum(["T1", "T2", "T3", "T4"]);

export const CommissionStructureSchema = z.enum(["flat", "tiered"]);

export const PayoutCadenceSchema = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
]);

export const PayoutMethodSchema = z.enum([
  "ach",
  "usdc",
  "cash",
  "ach_usdc_split",
]);

export const JurisdictionTypeSchema = z.enum([
  "regulated-us",
  "offshore",
  "unregulated",
  "hybrid",
]);

export const KycTierSchema = z.enum(["basic", "standard", "enhanced"]);

export const SourceTypeSchema = z.enum([
  "book_api",
  "wallet",
  "kiosk",
  "exchange",
]);

// ---------------------------------------------------------------------------
// ProfileSource — attached books, APIs, kiosks, wallets
// ---------------------------------------------------------------------------

export const ProfileSourceSchema = z.object({
  id: z.string().min(1),
  type: SourceTypeSchema,
  book_id: z.string().optional(),
  endpoint: z.string().optional(),
  api_key_env: z.string().optional(),
  api_secret_env: z.string().optional(),
  webhook_url: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  chain: z.string().optional(),
  currency: z.string().default("USD"),
  max_stake: z.number().min(0).default(0),
  daily_limit: z.number().min(0).default(0),
  priority: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// ProfileJurisdiction — legal/geo constraints
// ---------------------------------------------------------------------------

export const ProfileJurisdictionSchema = z.object({
  type: JurisdictionTypeSchema,
  allowed_states: z.array(z.string()).default([]),
  allowed_countries: z.array(z.string()).default([]),
  minimum_age: z.number().int().min(18).default(21),
  kyc_tier: KycTierSchema.default("standard"),
  geo_fence_enabled: z.boolean().default(false),
  tax_form: z.enum(["W-9", "W-8BEN", "none"]).default("none"),
  self_exclusion_check: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// ProfileCultivation — limit raising plan
// ---------------------------------------------------------------------------

export const ProfileCultivationSchema = z.object({
  initial_deposit_target: z.number().min(0).default(0),
  deposit_schedule_weeks: z.array(z.number().int()).default([]),
  deposit_amounts: z.array(z.number().min(0)).default([]),
  initial_limit: z.number().min(0).default(0),
  limit_raise_target: z.number().min(0).default(0),
  raise_request_week: z.number().int().min(0).default(0),
  recreational_mix: z.string().default("any"),
  round_stakes: z.boolean().default(false),
  casino_play_pct: z.number().min(0).max(100).default(0),
  odds_boost_acceptance: z.boolean().default(false),
  max_bet_frequency_daily: z.number().int().min(0).default(0),
  required_sports_diversity: z.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Commission Tier
// ---------------------------------------------------------------------------

export const CommissionTierSchema = z.object({
  threshold: z.number().min(0),
  rate: z.number().min(0).max(1),
});

// ---------------------------------------------------------------------------
// ProfileSettlement — commission terms + payout
// ---------------------------------------------------------------------------

export const ProfileSettlementSchema = z.object({
  commission_structure: CommissionStructureSchema.default("flat"),
  commission_tiers: z.array(CommissionTierSchema).default([{ threshold: 0, rate: 0 }]),
  makeup_enabled: z.boolean().default(false),
  makeup_window_days: z.number().int().min(0).default(30),
  makeup_balance: z.number().default(0),
  payout_cadence: PayoutCadenceSchema.default("monthly"),
  payout_method: PayoutMethodSchema.default("ach"),
  payout_split: z
    .object({ ach_pct: z.number().min(0).max(100), usdc_pct: z.number().min(0).max(100) })
    .optional(),
  payout_minimum: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  hold_target_pct: z.number().min(0).max(100).default(0),
});

// ---------------------------------------------------------------------------
// ProfileSORGate — SOR eligibility + exposure limits
// ---------------------------------------------------------------------------

export const ProfileSORGateSchema = z.object({
  eligible_tiers: z.array(TierSchema).min(1),
  max_exposure_per_signal: z.number().min(0).default(0),
  max_daily_exposure: z.number().min(0).default(0),
  max_single_bet: z.number().min(0).default(0),
  book_whitelist: z.array(z.string()).default([]),
  book_blacklist: z.array(z.string()).default([]),
  steam_allowed: z.boolean().default(false),
  arb_allowed: z.boolean().default(false),
  clv_allowed: z.boolean().default(true),
  manual_allowed: z.boolean().default(true),
  predictive_allowed: z.boolean().default(false),
  require_opsec_green: z.boolean().default(false),
  opsec_score_max: z.number().int().min(0).max(100).default(50),
  auto_suspend_rules: z.array(z.string()).default([]),
  review_required: z.array(z.string()).default([]),
  /** EWMA decay rate λ per hour. 0 = disabled (static daily caps). 0.5 = moderate. */
  ewma_lambda: z.number().min(0).max(5).default(0),
});

// ---------------------------------------------------------------------------
// ProfileTelegram — group auto-provisioning
// ---------------------------------------------------------------------------

export const TelegramGroupSchema = z.object({
  type: z.string(),
  name: z.string(),
  auto_create: z.boolean().default(true),
});

export const ProfileTelegramSchema = z.object({
  auto_create_groups: z.boolean().default(false),
  groups: z.array(TelegramGroupSchema).default([]),
  alert_stake_minimum: z.number().min(0).default(0),
  alert_types: z.array(z.string()).default([]),
  admin_bot_token_env: z.string().default("TELEGRAM_BOT_TOKEN"),
});

// ---------------------------------------------------------------------------
// ProfileBalance — capital requirements
// ---------------------------------------------------------------------------

export const ProfileBalanceSchema = z.object({
  initial_capital_requirement: z.number().min(0).default(0),
  margin_call_threshold: z.number().min(0).max(1).default(0.15),
  margin_call_action: z.string().default("reduce_limits_then_halt"),
  auto_inject_enabled: z.boolean().default(false),
  max_auto_inject: z.number().min(0).default(0),
  injection_cadence: z.string().default("as_needed"),
  return_threshold_pct: z.number().min(0).max(1).default(0.2),
});

// ---------------------------------------------------------------------------
// ProfileCompliance — auto-suspend + review rules
// ---------------------------------------------------------------------------

export const ProfileComplianceSchema = z.object({
  auto_suspend_rules: z.array(z.string()).default([]),
  review_required_for: z.array(z.string()).default([]),
  audit_retention_days: z.number().int().min(0).default(2555),
  max_opsec_score: z.number().int().min(0).max(100).default(50),
  require_2fa: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// ProfileTemplate — TOML-defined defaults per use case
// ---------------------------------------------------------------------------

export const ProfileTemplateSchema = z.object({
  meta: z.object({
    template_id: z.string().min(1),
    name: z.string(),
    description: z.string().default(""),
    version: z.string().default("1.0.0"),
  }),
  jurisdiction: ProfileJurisdictionSchema,
  sources: z.object({
    defaults: z.array(ProfileSourceSchema).default([]),
    api_access: z.boolean().default(false),
    max_sources: z.number().int().min(0).default(5),
  }),
  cultivation: ProfileCultivationSchema,
  settlement: ProfileSettlementSchema,
  sor: ProfileSORGateSchema,
  telegram: ProfileTelegramSchema,
  balance: ProfileBalanceSchema,
  compliance: ProfileComplianceSchema,
});

// ---------------------------------------------------------------------------
// PartnerProfile — canonical identity (static TOML-derived config)
// ---------------------------------------------------------------------------

export const PartnerProfileSchema = z.object({
  partner_id: z.string().min(1),
  template_id: z.string().min(1),
  state: LifecycleStateSchema.default("signup"),
  display_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  created_at: z.number().int(),
  materialized_at: z.number().int().optional(),
  activated_at: z.number().int().optional(),
  graduated_at: z.number().int().optional(),
  frozen_at: z.number().int().optional(),
  frozen_reason: z.string().optional(),
  terminated_at: z.number().int().optional(),
  jurisdiction: ProfileJurisdictionSchema,
  sources: z.object({
    defaults: z.array(ProfileSourceSchema),
    api_access: z.boolean(),
    max_sources: z.number().int(),
  }),
  cultivation: ProfileCultivationSchema,
  settlement: ProfileSettlementSchema,
  sor: ProfileSORGateSchema,
  telegram: ProfileTelegramSchema,
  balance: ProfileBalanceSchema,
  compliance: ProfileComplianceSchema,
});

// ---------------------------------------------------------------------------
// PartnerRuntimeState — live mutable state
// ---------------------------------------------------------------------------

export const PartnerRuntimeStateSchema = z.object({
  // Financial
  currentBalance: z.number().default(0),
  dailyUsed: z.number().min(0).default(0),
  totalDeposited: z.number().min(0).default(0),
  totalWithdrawn: z.number().min(0).default(0),
  totalSettledPnl: z.number().default(0),
  currentLimit: z.number().min(0).default(0),

  // Per-market limits (sport-specific separation)
  currentLimits: z.record(z.string(), z.number().min(0)).default({}),

  // Compliance
  kycStatus: KycStatusSchema.default("pending"),
  riskLevel: RiskLevelSchema.default("green"),
  opsecScore: z.number().int().min(0).max(100).default(0),

  // Timestamps
  lastDepositAt: z.number().int().optional(),
  lastBetAt: z.number().int().optional(),
  lastSettlementAt: z.number().int().optional(),
  dailyResetAt: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// GateResult — decision object from evaluate()
// ---------------------------------------------------------------------------

export const GateResultSchema = z.object({
  allowed: z.boolean(),
  action: GateActionSchema,
  reason: z.string().optional(),
  adjustedStake: z.number().optional(),
  deferredUntil: z.number().int().optional(),
  metadata: z.object({
    originalStake: z.number(),
    maxExposure: z.number(),
    maxDaily: z.number(),
    remainingDaily: z.number(),
    tier: z.string(),
    template: z.string(),
    bookAllowed: z.boolean(),
    typeAllowed: z.boolean(),
    kycPass: z.boolean(),
    balancePass: z.boolean(),
    opsecPass: z.boolean(),
    marketLimit: z.number().optional(),
  }),
});

// ---------------------------------------------------------------------------
// SignalContext — incoming betting opportunity
// ---------------------------------------------------------------------------

export const SignalContextSchema = z.object({
  signalId: z.string().min(1),
  partnerId: z.string().min(1),
  bookId: z.string().min(1),
  tier: TierSchema,
  type: SignalTypeSchema,
  suggestedStake: z.number().min(0),
  eventId: z.string().min(1),
  market: z.string().min(1),
  sport: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.5),
  urgencyMs: z.number().int().min(0).default(5000),
  // Optional routing fields
  sourceAccount: z.string().optional(),
  odds: z.number().optional(),
  line: z.number().optional(),
  side: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Type Exports (inferred from Zod)
// ---------------------------------------------------------------------------

export type PartnerProfile = z.infer<typeof PartnerProfileSchema>;
export type PartnerRuntimeState = z.infer<typeof PartnerRuntimeStateSchema>;
export type ProfileTemplate = z.infer<typeof ProfileTemplateSchema>;
export type ProfileSource = z.infer<typeof ProfileSourceSchema>;
export type ProfileJurisdiction = z.infer<typeof ProfileJurisdictionSchema>;
export type ProfileCultivation = z.infer<typeof ProfileCultivationSchema>;
export type ProfileSettlement = z.infer<typeof ProfileSettlementSchema>;
export type ProfileSORGate = z.infer<typeof ProfileSORGateSchema>;
export type ProfileTelegram = z.infer<typeof ProfileTelegramSchema>;
export type ProfileBalance = z.infer<typeof ProfileBalanceSchema>;
export type ProfileCompliance = z.infer<typeof ProfileComplianceSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type SignalContext = z.infer<typeof SignalContextSchema>;
export type GateAction = z.infer<typeof GateActionSchema>;
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;
export type KycStatus = z.infer<typeof KycStatusSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type CommissionTier = z.infer<typeof CommissionTierSchema>;
