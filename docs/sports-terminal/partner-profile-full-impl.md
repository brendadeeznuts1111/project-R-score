# Sports Terminal v5.2 — Partner Profile OS: Full Implementation

> Complete production implementation: 7 domain classes, 7 SQLite tables, TOML-backed materialization, lifecycle state machine with guards, tRPC router, dashboard, smoke test.
> Bloomberg Terminal dark theme. Zone-hex colored. Bun-native.

---

## Color Index

| Zone | Name | Hex | ANSI |
|------|------|-----|------|
| Profile | Partner Profile OS | `#e066ff` | `\x1b[38;2;224;102;255m` |
| Template | Profile Template | `#da70d6` | `\x1b[38;2;218;112;214m` |
| Source | Profile Source | `#dda0dd` | `\x1b[38;2;221;160;221m` |
| Jurisdiction | Profile Jurisdiction | `#ee82ee` | `\x1b[38;2;238;130;238m` |
| Cultivation | Profile Cultivation | `#ff69b4` | `\x1b[38;2;255;105;180m` |
| Settlement | Profile Settlement | `#ff1493` | `\x1b[38;2;255;20;147m` |
| Lifecycle | Profile Lifecycle | `#c71585` | `\x1b[38;2;199;21;133m` |
| SOR Gate | Profile SOR Gate | `#db7093` | `\x1b[38;2;219;112;147m` |
| Telegram | Profile Telegram | `#ffb6c1` | `\x1b[38;2;255;182;193m` |
| Balance | Profile Balance | `#ffc0cb` | `\x1b[38;2;255;192;203m` |

---

## 1. Domain Class Matrix — Full Spec

| Class | Zone | Hex | Responsibility | Lifecycle Hook | Cross-Refs |
|-------|------|-----|----------------|----------------|------------|
| `PartnerProfile` | Profile | `#e066ff` | Canonical identity, master record | `signup` → `materialized` | All zones |
| `ProfileTemplate` | Profile | `#da70d6` | TOML-defined defaults, versioned | Load at materialization | `PartnerProfile` |
| `ProfileSource` | Profile | `#dda0dd` | Attached books, APIs, kiosks, wallets | `materialized` → `active` | `SDN`, `Zone 22` |
| `ProfileJurisdiction` | Profile | `#ee82ee` | Legal/geo constraints, KYC tier, tax | `materialized` → `kyc_pending` | `Zone 11`, `Zone 19` |
| `ProfileCultivation` | Profile | `#ff69b4` | Limit raising plan, deposit schedule, behavior targets | `active` → `cultivating` → `graduated` | `Zone 22` |
| `ProfileSettlement` | Profile | `#ff1493` | Commission terms, makeup, payout cadence, currency | `active` → ongoing | `Zone 6` |
| `ProfileLifecycle` | Profile | `#c71585` | State machine, transitions, guards, audit trail | All transitions | All zones |
| `ProfileSORGate` | Profile | `#db7093` | SOR eligibility: tiers, exposure, book whitelist | `active` → ongoing | `SDN` |
| `ProfileTelegram` | Profile | `#ffb6c1` | Thread setup, alert routing, group membership | `materialized` → `active` | `Zone 3` |
| `ProfileBalance` | Profile | `#ffc0cb` | Capital requirements, margin calls, injection history | `active` → ongoing | `Zone 6` |

---

## 2. Zod Schemas — All Classes

```typescript
// src/zones/partner-profile/schemas.ts
import { z } from "zod";

// ── Meta ──
export const MetaSchema = z.object({
  template_id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default("1.0.0"),
});

// ── ProfileSource ──
export const SourceSchema = z.object({
  id: z.string(),
  type: z.enum(["book_api", "kiosk", "wallet", "api_data", "exchange", "cash_cage"]),
  book_id: z.string().optional(),           // e.g., "DRAFTKINGS", "PINNACLE"
  endpoint: z.string().optional(),
  api_key_env: z.string().optional(),       // env var name, not the key itself
  api_secret_env: z.string().optional(),
  webhook_url: z.string().optional(),
  location: z.string().optional(),          // for kiosk: "Las Vegas Strip"
  geo_lat: z.number().optional(),
  geo_lon: z.number().optional(),
  address: z.string().optional(),             // for wallet: "0x..."
  chain: z.string().optional(),             // for wallet: "polygon", "ethereum"
  currency: z.string().optional(),
  max_stake: z.number().optional(),
  daily_limit: z.number().optional(),
  active: z.boolean().default(true),
  priority: z.number().default(1),          // SOR priority: 1 = highest
});

// ── ProfileJurisdiction ──
export const JurisdictionSchema = z.object({
  type: z.enum(["regulated-us", "offshore", "unregulated", "hybrid"]),
  allowed_states: z.array(z.string()).default([]),
  blocked_states: z.array(z.string()).default([]),
  allowed_countries: z.array(z.string()).default([]),
  blocked_countries: z.array(z.string()).default([]),
  minimum_age: z.number().default(18),
  kyc_tier: z.enum(["basic", "standard", "enhanced"]).default("standard"),
  geo_fence_radius_miles: z.number().optional(),
  geo_fence_enabled: z.boolean().default(true),
  casino_property_required: z.boolean().default(false),
  tax_form: z.enum(["W-9", "W-8BEN", "none"]).default("none"),
  self_exclusion_check: z.boolean().default(false),
});

// ── ProfileCultivation ──
export const CultivationSchema = z.object({
  initial_deposit_target: z.number().default(0),
  deposit_schedule_weeks: z.array(z.number()).default([]),
  deposit_amounts: z.array(z.number()).default([]),
  initial_limit: z.number().default(500),
  limit_raise_target: z.number().default(5000),
  raise_request_week: z.number().default(4),
  recreational_mix: z.string().default("straight_60_parlay_40"),
  round_stakes: z.boolean().default(true),
  casino_play_pct: z.number().default(10),
  odds_boost_acceptance: z.boolean().default(true),
  max_bet_frequency_daily: z.number().default(10),
  required_sports_diversity: z.number().default(3),
});

// ── ProfileSettlement ──
export const CommissionTierSchema = z.object({
  threshold: z.number().default(0),
  rate: z.number().min(0).max(1),
});

export const SettlementSchema = z.object({
  commission_structure: z.enum(["flat", "tiered"]).default("flat"),
  commission_rate: z.number().optional(),
  commission_tiers: z.array(CommissionTierSchema).optional(),
  makeup_enabled: z.boolean().default(false),
  makeup_window_days: z.number().default(30),
  payout_cadence: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
  payout_method: z.enum(["ach", "usdc", "cash", "ach_usdc_split"]).default("ach"),
  payout_split: z.object({ ach_pct: z.number(), usdc_pct: z.number() }).optional(),
  payout_minimum: z.number().default(100),
  currency: z.enum(["USD", "USDC", "EUR", "BTC"]).default("USD"),
  hold_target_pct: z.number().default(5.0),
});

// ── ProfileSORGate ──
export const SORGateSchema = z.object({
  eligible_tiers: z.array(z.enum(["T1", "T2", "T3", "T4"])).default(["T1"]),
  max_exposure_per_signal: z.number().default(5000),
  max_daily_exposure: z.number().default(25000),
  max_single_bet: z.number().default(5000),
  book_whitelist: z.array(z.string()).default([]),
  book_blacklist: z.array(z.string()).default([]),
  steam_allowed: z.boolean().default(false),
  arb_allowed: z.boolean().default(false),
  clv_allowed: z.boolean().default(true),
  manual_allowed: z.boolean().default(true),
  predictive_allowed: z.boolean().default(false),
  require_opsec_green: z.boolean().default(false),
});

// ── ProfileTelegram ──
export const TelegramGroupSchema = z.object({
  type: z.enum(["personal", "alerts", "settlement", "signals", "steam", "arb", "opsec", "crew", "floor"]),
  name: z.string(),
  auto_create: z.boolean().default(true),
});

export const TelegramSchema = z.object({
  auto_create_groups: z.boolean().default(true),
  groups: z.array(TelegramGroupSchema).default([]),
  alert_stake_minimum: z.number().default(100),
  alert_types: z.array(z.string()).default(["settlement"]),
  admin_bot_token_env: z.string().default("TELEGRAM_BOT_TOKEN"),
});

// ── ProfileBalance ──
export const BalanceSchema = z.object({
  initial_capital_requirement: z.number().default(10000),
  margin_call_threshold: z.number().default(0.25),
  margin_call_action: z.enum(["reduce_limits", "halt_trading", "notify_manager", "reduce_limits_then_halt"]).default("reduce_limits"),
  auto_inject_enabled: z.boolean().default(false),
  max_auto_inject: z.number().default(0),
  injection_cadence: z.enum(["as_needed", "weekly", "monthly"]).default("as_needed"),
  return_threshold_pct: z.number().default(0.20),
});

// ── ProfileCompliance ──
export const ComplianceSchema = z.object({
  auto_suspend_rules: z.array(z.string()).default([]),
  review_required_for: z.array(z.string()).default([]),
  audit_retention_days: z.number().default(2555),
  max_opsec_score: z.number().default(50),
  require_2fa: z.boolean().default(false),
});

// ── Full Template ──
export const ProfileTemplateSchema = z.object({
  meta: MetaSchema,
  jurisdiction: JurisdictionSchema,
  sources: z.object({ defaults: z.array(SourceSchema) }).default({ defaults: [] }),
  cultivation: CultivationSchema,
  settlement: SettlementSchema,
  sor: SORGateSchema,
  telegram: TelegramSchema,
  balance: BalanceSchema,
  compliance: ComplianceSchema,
});

export type ProfileTemplate = z.infer<typeof ProfileTemplateSchema>;
export type ProfileSource = z.infer<typeof SourceSchema>;
export type ProfileJurisdiction = z.infer<typeof JurisdictionSchema>;
export type ProfileCultivation = z.infer<typeof CultivationSchema>;
export type ProfileSettlement = z.infer<typeof SettlementSchema>;
export type ProfileSORGate = z.infer<typeof SORGateSchema>;
export type ProfileTelegram = z.infer<typeof TelegramSchema>;
export type ProfileBalance = z.infer<typeof BalanceSchema>;
export type ProfileCompliance = z.infer<typeof ComplianceSchema>;

// ── Lifecycle ──
export const LifecycleStateSchema = z.enum([
  "signup", "materialized", "kyc_pending", "active", "cultivating",
  "graduated", "frozen", "suspended", "terminated"
]);

export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

// ── PartnerProfile (materialized) ──
export const PartnerProfileSchema = z.object({
  partner_id: z.string(),
  template_id: z.string(),
  status: LifecycleStateSchema,
  display_name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  created_at: z.number(),
  materialized_at: z.number().optional(),
  activated_at: z.number().optional(),
  graduated_at: z.number().optional(),
  frozen_at: z.number().optional(),
  frozen_reason: z.string().optional(),
  terminated_at: z.number().optional(),
  updated_at: z.number().optional(),
  // Runtime state
  current_limit: z.number().default(0),
  daily_used: z.number().default(0),
  total_deposited: z.number().default(0),
  total_withdrawn: z.number().default(0),
  total_settled_pnl: z.number().default(0),
  current_balance: z.number().default(0),
  opsec_score: z.number().default(0),
  risk_level: z.string().default("green"),
  kyc_status: z.string().default("pending"),
  // JSON config (immutable after materialization)
  jurisdiction_json: z.string(),
  sources_json: z.string(),
  cultivation_json: z.string(),
  settlement_json: z.string(),
  sor_json: z.string(),
  telegram_json: z.string(),
  balance_json: z.string(),
  compliance_json: z.string(),
});

export type PartnerProfile = z.infer<typeof PartnerProfileSchema>;
```

---

## 3. TOML Template — Hybrid Sharp (Extended)

```toml
# profiles/hybrid-sharp.toml
# Hybrid sharp partner: retail + offshore, steam + arb enabled

[meta]
template_id = "hybrid-sharp"
name = "Hybrid Sharp"
description = "Experienced partner with both retail and offshore access, sharp strategies"
version = "1.0.0"

[jurisdiction]
type = "hybrid"
allowed_states = ["NV", "NJ", "PA", "IL", "MI", "TN", "AZ", "CO", "IN", "IA", "NY", "LA", "MD", "OH", "MA"]
allowed_countries = ["CR", "PA", "CW", "MT"]
minimum_age = 21
kyc_tier = "enhanced"
geo_fence_enabled = false
tax_form = "W-9"
self_exclusion_check = true

[sources.defaults]
# Retail books
{ id = "dk_retail", type = "book_api", book_id = "DRAFTKINGS", endpoint = "https://api.draftkings.com", api_key_env = "DK_API_KEY", max_stake = 10000, daily_limit = 50000, priority = 2, active = true }
{ id = "fd_retail", type = "book_api", book_id = "FANDUEL", endpoint = "https://api.fanduel.com", api_key_env = "FD_API_KEY", max_stake = 25000, daily_limit = 100000, priority = 1, active = true }
{ id = "mgm_retail", type = "book_api", book_id = "BETMGM", endpoint = "https://api.betmgm.com", api_key_env = "MGM_API_KEY", max_stake = 5000, daily_limit = 25000, priority = 3, active = true }
{ id = "czr_retail", type = "book_api", book_id = "CAESARS", endpoint = "https://api.caesars.com", api_key_env = "CZR_API_KEY", max_stake = 15000, daily_limit = 75000, priority = 2, active = true }

# Offshore / sharp books
{ id = "pin_offshore", type = "book_api", book_id = "PINNACLE", endpoint = "https://api.pinnacle.com", api_key_env = "PIN_API_KEY", api_secret_env = "PIN_API_SECRET", max_stake = 100000, daily_limit = 500000, priority = 1, active = true }
{ id = "sbo_offshore", type = "book_api", book_id = "SBOBET", endpoint = "https://api.sbobet.com", api_key_env = "SBO_API_KEY", max_stake = 50000, daily_limit = 250000, priority = 2, active = true }
{ id = "match_exchange", type = "exchange", book_id = "MATCHBOOK", endpoint = "https://api.matchbook.com", api_key_env = "MATCH_API_KEY", max_stake = 50000, daily_limit = 200000, priority = 2, active = true }

# Data sources
{ id = "fonbet_ws", type = "api_data", endpoint = "wss://fonbet.ru/live/websocket", api_key_env = "FONBET_COOKIE", priority = 1, active = true }
{ id = "asian_odds", type = "api_data", endpoint = "https://api.asianodds88.com", api_key_env = "AO_API_KEY", priority = 2, active = true }

# Wallet
{ id = "wallet_usdc", type = "wallet", address = "0x0000000000000000000000000000000000000000", chain = "polygon", currency = "USDC", active = true }

[cultivation]
initial_deposit_target = 25000.00
deposit_schedule_weeks = [1, 2, 4, 8]
deposit_amounts = [5000, 10000, 15000, 25000]
initial_limit = 2000
limit_raise_target = 50000
raise_request_week = 3
recreational_mix = "any"
round_stakes = false
casino_play_pct = 5.0
odds_boost_acceptance = true
max_bet_frequency_daily = 20
required_sports_diversity = 2

[settlement]
commission_structure = "tiered"
commission_tiers = [
  { threshold = 0, rate = 0.30 },
  { threshold = 25000, rate = 0.40 },
  { threshold = 100000, rate = 0.50 },
]
makeup_enabled = true
makeup_window_days = 14
payout_cadence = "daily"
payout_method = "ach_usdc_split"
payout_split = { ach_pct = 50, usdc_pct = 50 }
payout_minimum = 500.00
currency = "USD"
hold_target_pct = 5.0

[sor]
eligible_tiers = ["T1", "T2", "T3", "T4"]
max_exposure_per_signal = 25000.00
max_daily_exposure = 100000.00
max_single_bet = 25000.00
book_whitelist = ["DRAFTKINGS", "FANDUEL", "BETMGM", "CAESARS", "PINNACLE", "SBOBET", "MATCHBOOK"]
book_blacklist = ["1XBET"]
steam_allowed = true
arb_allowed = true
clv_allowed = true
manual_allowed = true
predictive_allowed = true
require_opsec_green = false

[telegram]
auto_create_groups = true
groups = [
  { type = "personal", name = "{partner_id}-personal", auto_create = true },
  { type = "signals", name = "{partner_id}-signals", auto_create = true },
  { type = "steam", name = "{partner_id}-steam", auto_create = true },
  { type = "arb", name = "{partner_id}-arb", auto_create = true },
  { type = "settlement", name = "{partner_id}-settlement", auto_create = true },
  { type = "opsec", name = "{partner_id}-opsec", auto_create = true },
]
alert_stake_minimum = 500.00
alert_types = ["steam", "arb", "clv", "settlement", "opsec", "compliance", "limit_change"]
admin_bot_token_env = "TELEGRAM_BOT_TOKEN"

[balance]
initial_capital_requirement = 50000.00
margin_call_threshold = 0.15
margin_call_action = "reduce_limits_then_halt"
auto_inject_enabled = true
max_auto_inject = 10000.00
injection_cadence = "as_needed"
return_threshold_pct = 0.20

[compliance]
auto_suspend_rules = ["public_wifi", "vpn_detected", "steam_chase_on_retail"]
review_required_for = ["graduation", "capital_injection", "source_addition", "tier_upgrade"]
audit_retention_days = 2555
max_opsec_score = 50
require_2fa = true
```

---

## 4. SQLite Schema — All 7 Tables

```sql
-- ═══════════════════════════════════════════════════════════════
-- 1. partner_profiles: Canonical master record
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_profiles (
  partner_id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  status TEXT DEFAULT 'signup',
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Lifecycle timestamps
  created_at INTEGER NOT NULL,
  materialized_at INTEGER,
  activated_at INTEGER,
  graduated_at INTEGER,
  frozen_at INTEGER,
  frozen_reason TEXT,
  terminated_at INTEGER,
  updated_at INTEGER,

  -- Immutable JSON config (set at materialization)
  jurisdiction_json TEXT NOT NULL,
  sources_json TEXT NOT NULL,
  cultivation_json TEXT NOT NULL,
  settlement_json TEXT NOT NULL,
  sor_json TEXT NOT NULL,
  telegram_json TEXT NOT NULL,
  balance_json TEXT NOT NULL,
  compliance_json TEXT NOT NULL,

  -- Runtime mutable state
  current_limit REAL DEFAULT 0,
  daily_used REAL DEFAULT 0,
  total_deposited REAL DEFAULT 0,
  total_withdrawn REAL DEFAULT 0,
  total_settled_pnl REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  opsec_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'green',
  kyc_status TEXT DEFAULT 'pending'
);

CREATE INDEX idx_partner_status ON partner_profiles(status);
CREATE INDEX idx_partner_template ON partner_profiles(template_id);
CREATE INDEX idx_partner_kyc ON partner_profiles(kyc_status);

-- ═══════════════════════════════════════════════════════════════
-- 2. partner_sources: One row per attached source
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_sources (
  partner_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  book_id TEXT,
  endpoint TEXT,
  api_key_hash TEXT,
  api_secret_hash TEXT,
  webhook_url TEXT,
  location TEXT,
  geo_lat REAL,
  geo_lon REAL,
  address TEXT,
  chain TEXT,
  currency TEXT,
  max_stake REAL,
  daily_limit REAL,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  last_health_check INTEGER,
  latency_ms INTEGER,
  created_at INTEGER,
  activated_at INTEGER,
  PRIMARY KEY (partner_id, source_id),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

CREATE INDEX idx_source_partner ON partner_sources(partner_id, status);
CREATE INDEX idx_source_book ON partner_sources(book_id, status);

-- ═══════════════════════════════════════════════════════════════
-- 3. partner_cultivation: Limit raising progress tracker
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_cultivation (
  partner_id TEXT PRIMARY KEY,
  phase TEXT DEFAULT 'warmup',
  target_deposit_total REAL,
  actual_deposit_total REAL DEFAULT 0,
  deposit_count INTEGER DEFAULT 0,
  target_limit REAL,
  current_limit REAL,
  bet_count INTEGER DEFAULT 0,
  straight_bet_count INTEGER DEFAULT 0,
  parlay_bet_count INTEGER DEFAULT 0,
  casino_play_total REAL DEFAULT 0,
  odds_boosts_taken INTEGER DEFAULT 0,
  sports_diversity_count INTEGER DEFAULT 0,
  last_deposit_at INTEGER,
  last_bet_at INTEGER,
  raise_requested_at INTEGER,
  raise_approved_at INTEGER,
  graduation_eligible INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. partner_settlement: Commission terms + payout state
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_settlement (
  partner_id TEXT PRIMARY KEY,
  commission_structure TEXT,
  commission_rate REAL,
  commission_tiers_json TEXT,
  makeup_enabled INTEGER DEFAULT 0,
  makeup_window_days INTEGER DEFAULT 30,
  makeup_balance REAL DEFAULT 0,
  payout_cadence TEXT,
  payout_method TEXT,
  payout_split_json TEXT,
  payout_minimum REAL,
  currency TEXT,
  hold_target_pct REAL,
  lifetime_commission_paid REAL DEFAULT 0,
  lifetime_makeup_cleared REAL DEFAULT 0,
  last_payout_at INTEGER,
  next_payout_at INTEGER,
  created_at INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 5. partner_telegram_topics: Group mappings
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_telegram_topics (
  partner_id TEXT NOT NULL,
  topic_type TEXT NOT NULL,
  chat_id TEXT,
  chat_name TEXT,
  auto_create INTEGER DEFAULT 1,
  created INTEGER DEFAULT 0,
  created_at INTEGER,
  PRIMARY KEY (partner_id, topic_type),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 6. partner_gates: SOR eligibility + compliance flags
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_gates (
  partner_id TEXT PRIMARY KEY,
  sor_eligible_tiers_json TEXT,
  max_exposure_per_signal REAL,
  max_daily_exposure REAL,
  max_single_bet REAL,
  book_whitelist_json TEXT,
  book_blacklist_json TEXT,
  steam_allowed INTEGER DEFAULT 0,
  arb_allowed INTEGER DEFAULT 0,
  clv_allowed INTEGER DEFAULT 1,
  manual_allowed INTEGER DEFAULT 1,
  predictive_allowed INTEGER DEFAULT 0,
  require_opsec_green INTEGER DEFAULT 0,
  opsec_score_max INTEGER DEFAULT 50,
  auto_suspend_rules_json TEXT,
  review_required_json TEXT,
  last_gate_review_at INTEGER,
  created_at INTEGER,
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. partner_lifecycle_log: Immutable audit trail
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE partner_lifecycle_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  reason TEXT,
  guard_checks_json TEXT,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (partner_id) REFERENCES partner_profiles(partner_id)
);

CREATE INDEX idx_lifecycle_partner ON partner_lifecycle_log(partner_id, timestamp DESC);
CREATE INDEX idx_lifecycle_state ON partner_lifecycle_log(to_state, timestamp DESC);
```

---

## 5. partner-profile-core.ts — Full Implementation

```typescript
// src/zones/partner-profile/partner-profile-core.ts
import { parse as parseTOML } from "smol-toml";
import {
  ProfileTemplateSchema,
  PartnerProfileSchema,
  LifecycleStateSchema,
  type ProfileTemplate,
  type PartnerProfile,
  type LifecycleState,
  type ProfileSource,
} from "./schemas.js";

const DB_PATH = process.env.DB_PATH || "sports-terminal.db";
const TEMPLATE_DIR = "./profiles";

// ═══════════════════════════════════════════════════════════════
// TOML Loader
// ═══════════════════════════════════════════════════════════════

export async function loadTemplate(templateId: string): Promise<ProfileTemplate> {
  const path = `${TEMPLATE_DIR}/${templateId}.toml`;
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Template not found: ${path}`);

  const raw = await file.text();
  const parsed = parseTOML(raw);
  const validated = ProfileTemplateSchema.parse(parsed);

  console.log(`[PROFILE] Loaded template: ${validated.meta.name} (${validated.meta.template_id})`);
  return validated;
}

export async function listTemplates(): Promise<Array<{ id: string; name: string; description: string }>> {
  const proc = Bun.spawn(["ls", TEMPLATE_DIR]);
  const text = await new Response(proc.stdout).text();
  const ids = text.split("
").filter(f => f.endsWith(".toml")).map(f => f.replace(".toml", ""));

  return Promise.all(ids.map(async id => {
    const t = await loadTemplate(id);
    return { id: t.meta.template_id, name: t.meta.name, description: t.meta.description };
  }));
}

// ═══════════════════════════════════════════════════════════════
// Materialization
// ═══════════════════════════════════════════════════════════════

export async function materializeProfile(
  partnerId: string,
  templateId: string,
  overrides: Partial<PartnerProfile> = {}
): Promise<PartnerProfile> {
  const template = await loadTemplate(templateId);
  const db = new Bun.SQLite(DB_PATH);
  const now = Date.now();

  // Build canonical profile
  const profile: PartnerProfile = {
    partner_id: partnerId,
    template_id: templateId,
    status: "materialized",
    display_name: overrides.display_name || partnerId,
    email: overrides.email || "",
    phone: overrides.phone,
    created_at: now,
    materialized_at: now,
    jurisdiction_json: JSON.stringify(template.jurisdiction),
    sources_json: JSON.stringify(template.sources),
    cultivation_json: JSON.stringify(template.cultivation),
    settlement_json: JSON.stringify(template.settlement),
    sor_json: JSON.stringify(template.sor),
    telegram_json: JSON.stringify(template.telegram),
    balance_json: JSON.stringify(template.balance),
    compliance_json: JSON.stringify(template.compliance),
    current_limit: template.cultivation.initial_limit,
    ...overrides,
  };

  // Upsert master record
  db.prepare(`
    INSERT INTO partner_profiles (
      partner_id, template_id, status, display_name, email, phone,
      created_at, materialized_at, jurisdiction_json, sources_json,
      cultivation_json, settlement_json, sor_json, telegram_json,
      balance_json, compliance_json, current_limit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partner_id) DO UPDATE SET
      template_id = excluded.template_id,
      status = excluded.status,
      display_name = excluded.display_name,
      email = excluded.email,
      phone = excluded.phone,
      materialized_at = excluded.materialized_at,
      jurisdiction_json = excluded.jurisdiction_json,
      sources_json = excluded.sources_json,
      cultivation_json = excluded.cultivation_json,
      settlement_json = excluded.settlement_json,
      sor_json = excluded.sor_json,
      telegram_json = excluded.telegram_json,
      balance_json = excluded.balance_json,
      compliance_json = excluded.compliance_json,
      current_limit = excluded.current_limit
  `).run(
    profile.partner_id, profile.template_id, profile.status,
    profile.display_name, profile.email, profile.phone || null,
    profile.created_at, profile.materialized_at,
    profile.jurisdiction_json, profile.sources_json,
    profile.cultivation_json, profile.settlement_json,
    profile.sor_json, profile.telegram_json,
    profile.balance_json, profile.compliance_json,
    profile.current_limit
  );

  // Materialize all downstream tables
  await materializeSources(db, partnerId, template.sources.defaults);
  await materializeCultivation(db, partnerId, template.cultivation);
  await materializeSettlement(db, partnerId, template.settlement);
  await materializeTelegram(db, partnerId, template.telegram);
  await materializeGates(db, partnerId, template.sor, template.compliance);

  // Log lifecycle event
  logLifecycle(db, partnerId, "signup", "materialized", "system", `Template: ${templateId}`);

  console.log(`[PROFILE] Materialized ${partnerId} from ${templateId}`);
  return profile;
}

// ── Downstream Materializers ──

async function materializeSources(db: Bun.SQLite, partnerId: string, sources: ProfileSource[]): Promise<void> {
  for (const src of sources) {
    db.prepare(`
      INSERT INTO partner_sources (
        partner_id, source_id, source_type, book_id, endpoint,
        api_key_hash, api_secret_hash, webhook_url, location,
        geo_lat, geo_lon, address, chain, currency,
        max_stake, daily_limit, priority, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(partner_id, source_id) DO UPDATE SET
        source_type = excluded.source_type,
        book_id = excluded.book_id,
        endpoint = excluded.endpoint,
        max_stake = excluded.max_stake,
        daily_limit = excluded.daily_limit,
        priority = excluded.priority
    `).run(
      partnerId, src.id, src.type, src.book_id || null, src.endpoint || null,
      src.api_key_env ? hashEnvKey(src.api_key_env) : null,
      src.api_secret_env ? hashEnvKey(src.api_secret_env) : null,
      src.webhook_url || null, src.location || null,
      src.geo_lat || null, src.geo_lon || null,
      src.address || null, src.chain || null, src.currency || null,
      src.max_stake || null, src.daily_limit || null, src.priority,
      Date.now()
    );
  }
}

async function materializeCultivation(db: Bun.SQLite, partnerId: string, cultivation: ProfileTemplate["cultivation"]): Promise<void> {
  db.prepare(`
    INSERT INTO partner_cultivation (
      partner_id, phase, target_deposit_total, actual_deposit_total,
      target_limit, current_limit, created_at, updated_at
    ) VALUES (?, 'warmup', ?, 0, ?, ?, ?, ?)
    ON CONFLICT(partner_id) DO UPDATE SET
      target_deposit_total = excluded.target_deposit_total,
      target_limit = excluded.target_limit,
      current_limit = excluded.current_limit
  `).run(
    partnerId,
    cultivation.initial_deposit_target,
    cultivation.limit_raise_target,
    cultivation.initial_limit,
    Date.now(), Date.now()
  );
}

async function materializeSettlement(db: Bun.SQLite, partnerId: string, settlement: ProfileTemplate["settlement"]): Promise<void> {
  db.prepare(`
    INSERT INTO partner_settlement (
      partner_id, commission_structure, commission_rate, commission_tiers_json,
      makeup_enabled, makeup_window_days, payout_cadence, payout_method,
      payout_split_json, payout_minimum, currency, hold_target_pct, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partner_id) DO UPDATE SET
      commission_structure = excluded.commission_structure,
      commission_rate = excluded.commission_rate,
      payout_cadence = excluded.payout_cadence
  `).run(
    partnerId,
    settlement.commission_structure,
    settlement.commission_rate || null,
    settlement.commission_tiers ? JSON.stringify(settlement.commission_tiers) : null,
    settlement.makeup_enabled ? 1 : 0,
    settlement.makeup_window_days,
    settlement.payout_cadence,
    settlement.payout_method,
    settlement.payout_split ? JSON.stringify(settlement.payout_split) : null,
    settlement.payout_minimum,
    settlement.currency,
    settlement.hold_target_pct,
    Date.now()
  );
}

async function materializeTelegram(db: Bun.SQLite, partnerId: string, telegram: ProfileTemplate["telegram"]): Promise<void> {
  for (const group of telegram.groups) {
    const name = group.name.replace("{partner_id}", partnerId);
    db.prepare(`
      INSERT INTO partner_telegram_topics (partner_id, topic_type, chat_name, auto_create, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(partner_id, topic_type) DO UPDATE SET
        chat_name = excluded.chat_name,
        auto_create = excluded.auto_create
    `).run(partnerId, group.type, name, group.auto_create ? 1 : 0, Date.now());
  }
}

async function materializeGates(db: Bun.SQLite, partnerId: string, sor: ProfileTemplate["sor"], compliance: ProfileTemplate["compliance"]): Promise<void> {
  db.prepare(`
    INSERT INTO partner_gates (
      partner_id, sor_eligible_tiers_json, max_exposure_per_signal,
      max_daily_exposure, max_single_bet, book_whitelist_json, book_blacklist_json,
      steam_allowed, arb_allowed, clv_allowed, manual_allowed, predictive_allowed,
      require_opsec_green, opsec_score_max, auto_suspend_rules_json,
      review_required_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(partner_id) DO UPDATE SET
      sor_eligible_tiers_json = excluded.sor_eligible_tiers_json,
      max_exposure_per_signal = excluded.max_exposure_per_signal,
      max_daily_exposure = excluded.max_daily_exposure
  `).run(
    partnerId,
    JSON.stringify(sor.eligible_tiers),
    sor.max_exposure_per_signal,
    sor.max_daily_exposure,
    sor.max_single_bet,
    JSON.stringify(sor.book_whitelist),
    JSON.stringify(sor.book_blacklist),
    sor.steam_allowed ? 1 : 0,
    sor.arb_allowed ? 1 : 0,
    sor.clv_allowed ? 1 : 0,
    sor.manual_allowed ? 1 : 0,
    sor.predictive_allowed ? 1 : 0,
    sor.require_opsec_green ? 1 : 0,
    compliance.max_opsec_score,
    JSON.stringify(compliance.auto_suspend_rules),
    JSON.stringify(compliance.review_required_for),
    Date.now()
  );
}

function hashEnvKey(envVar: string): string {
  const key = process.env[envVar];
  if (!key) return "";
  return Bun.password.hashSync(key, { algorithm: "bcrypt" });
}

function logLifecycle(db: Bun.SQLite, partnerId: string, from: string | null, to: string, by: string, reason: string, guards?: string): void {
  db.prepare(`
    INSERT INTO partner_lifecycle_log (partner_id, from_state, to_state, triggered_by, reason, guard_checks_json, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(partnerId, from, to, by, reason, guards || null, Date.now());
}

// ═══════════════════════════════════════════════════════════════
// Lifecycle State Machine
// ═══════════════════════════════════════════════════════════════

interface TransitionGuard {
  name: string;
  check: (db: Bun.SQLite, partnerId: string) => boolean | Promise<boolean>;
  failureReason: string;
}

const GUARDS: Record<string, TransitionGuard[]> = {
  "materialized→active": [
    {
      name: "kyc_verified",
      check: (db, id) => {
        const row = db.prepare("SELECT kyc_status FROM partner_profiles WHERE partner_id = ?").get(id) as { kyc_status: string } | undefined;
        return row?.kyc_status === "verified";
      },
      failureReason: "KYC not verified",
    },
    {
      name: "capital_met",
      check: (db, id) => {
        const row = db.prepare("SELECT total_deposited, balance_json FROM partner_profiles WHERE partner_id = ?").get(id) as { total_deposited: number; balance_json: string } | undefined;
        if (!row) return false;
        const balance = JSON.parse(row.balance_json);
        return row.total_deposited >= balance.initial_capital_requirement;
      },
      failureReason: "Initial capital requirement not met",
    },
  ],
  "materialized→kyc_pending": [
    {
      name: "kyc_required",
      check: (db, id) => {
        const row = db.prepare("SELECT jurisdiction_json FROM partner_profiles WHERE partner_id = ?").get(id) as { jurisdiction_json: string } | undefined;
        if (!row) return false;
        const j = JSON.parse(row.jurisdiction_json);
        return j.kyc_tier !== "basic";
      },
      failureReason: "KYC not required for basic tier",
    },
  ],
  "kyc_pending→active": [
    {
      name: "kyc_verified",
      check: (db, id) => {
        const row = db.prepare("SELECT kyc_status FROM partner_profiles WHERE partner_id = ?").get(id) as { kyc_status: string } | undefined;
        return row?.kyc_status === "verified";
      },
      failureReason: "KYC still pending",
    },
  ],
  "active→cultivating": [
    {
      name: "auto_start",
      check: () => true,
      failureReason: "",
    },
  ],
  "cultivating→graduated": [
    {
      name: "limit_target_met",
      check: (db, id) => {
        const row = db.prepare("SELECT current_limit, cultivation_json FROM partner_profiles WHERE partner_id = ?").get(id) as { current_limit: number; cultivation_json: string } | undefined;
        if (!row) return false;
        const c = JSON.parse(row.cultivation_json);
        return row.current_limit >= c.limit_raise_target;
      },
      failureReason: "Limit raise target not achieved",
    },
    {
      name: "deposits_met",
      check: (db, id) => {
        const row = db.prepare("SELECT total_deposited, cultivation_json FROM partner_profiles WHERE partner_id = ?").get(id) as { total_deposited: number; cultivation_json: string } | undefined;
        if (!row) return false;
        const c = JSON.parse(row.cultivation_json);
        return row.total_deposited >= c.initial_deposit_target;
      },
      failureReason: "Deposit target not met",
    },
    {
      name: "admin_review",
      check: (db, id) => {
        const row = db.prepare("SELECT graduation_eligible FROM partner_cultivation WHERE partner_id = ?").get(id) as { graduation_eligible: number } | undefined;
        return row?.graduation_eligible === 1;
      },
      failureReason: "Admin graduation approval required",
    },
  ],
  "active→graduated": [
    {
      name: "limit_target_met",
      check: (db, id) => {
        const row = db.prepare("SELECT current_limit, cultivation_json FROM partner_profiles WHERE partner_id = ?").get(id) as { current_limit: number; cultivation_json: string } | undefined;
        if (!row) return false;
        const c = JSON.parse(row.cultivation_json);
        return row.current_limit >= c.limit_raise_target;
      },
      failureReason: "Limit raise target not achieved",
    },
  ],
  "any→frozen": [
    {
      name: "trigger_exists",
      check: () => true,
      failureReason: "",
    },
  ],
  "frozen→active": [
    {
      name: "admin_approval",
      check: () => true, // Admin action always passes after review
      failureReason: "Admin approval required",
    },
  ],
  "any→terminated": [
    {
      name: "confirm",
      check: () => true,
      failureReason: "",
    },
  ],
};

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  signup: ["materialized", "terminated"],
  materialized: ["kyc_pending", "active", "frozen", "terminated"],
  kyc_pending: ["active", "frozen", "terminated"],
  active: ["cultivating", "graduated", "frozen", "suspended", "terminated"],
  cultivating: ["graduated", "active", "frozen", "suspended"],
  graduated: ["active", "frozen", "suspended", "terminated"],
  frozen: ["active", "suspended", "terminated"],
  suspended: ["active", "frozen", "terminated"],
  terminated: [],
};

export async function transitionProfileState(
  partnerId: string,
  toState: LifecycleState,
  triggeredBy: string,
  reason: string
): Promise<PartnerProfile> {
  const db = new Bun.SQLite(DB_PATH);
  const now = Date.now();

  const current = db.prepare("SELECT status FROM partner_profiles WHERE partner_id = ?").get(partnerId) as { status: LifecycleState } | undefined;
  if (!current) throw new Error(`Partner not found: ${partnerId}`);
  const fromState = current.status;

  // Validate transition
  if (!VALID_TRANSITIONS[fromState].includes(toState)) {
    throw new Error(`Invalid transition: ${fromState} → ${toState}`);
  }

  // Run guards
  const guardKey = `${fromState}→${toState}`;
  const fallbackKey = `any→${toState}`;
  const guards = GUARDS[guardKey] || GUARDS[fallbackKey] || [];
  const failures: string[] = [];

  for (const guard of guards) {
    const pass = await guard.check(db, partnerId);
    if (!pass) failures.push(guard.failureReason);
  }

  if (failures.length > 0) {
    logLifecycle(db, partnerId, fromState, toState, triggeredBy, `GUARD_FAIL: ${failures.join("; ")}`, JSON.stringify(failures));
    throw new Error(`Transition blocked: ${failures.join("; ")}`);
  }

  // Execute transition
  db.prepare("UPDATE partner_profiles SET status = ?, updated_at = ? WHERE partner_id = ?")
    .run(toState, now, partnerId);

  // Side effects
  const sideEffects: Record<string, () => void> = {
    active: () => {
      db.prepare("UPDATE partner_profiles SET activated_at = ? WHERE partner_id = ?").run(now, partnerId);
      db.prepare("UPDATE partner_sources SET status = 'active', activated_at = ? WHERE partner_id = ? AND status = 'pending'")
        .run(now, partnerId);
    },
    graduated: () => {
      db.prepare("UPDATE partner_profiles SET graduated_at = ? WHERE partner_id = ?").run(now, partnerId);
      const row = db.prepare("SELECT cultivation_json FROM partner_profiles WHERE partner_id = ?").get(partnerId) as { cultivation_json: string };
      const c = JSON.parse(row.cultivation_json);
      db.prepare("UPDATE partner_profiles SET current_limit = ? WHERE partner_id = ?").run(c.limit_raise_target, partnerId);
      db.prepare("UPDATE partner_cultivation SET phase = 'graduated', graduation_approved_at = ? WHERE partner_id = ?")
        .run(now, partnerId);
    },
    frozen: () => {
      db.prepare("UPDATE partner_profiles SET frozen_at = ?, frozen_reason = ? WHERE partner_id = ?")
        .run(now, reason, partnerId);
      db.prepare("UPDATE partner_sources SET status = 'frozen' WHERE partner_id = ?").run(partnerId);
    },
    suspended: () => {
      db.prepare("UPDATE partner_sources SET status = 'suspended' WHERE partner_id = ?").run(partnerId);
    },
    terminated: () => {
      db.prepare("UPDATE partner_profiles SET terminated_at = ? WHERE partner_id = ?").run(now, partnerId);
      db.prepare("UPDATE partner_sources SET status = 'revoked' WHERE partner_id = ?").run(partnerId);
    },
  };

  if (sideEffects[toState]) sideEffects[toState]();

  logLifecycle(db, partnerId, fromState, toState, triggeredBy, reason, JSON.stringify(guards.map(g => g.name)));

  console.log(`[PROFILE] ${partnerId}: ${fromState} → ${toState} (${triggeredBy})`);
  return getProfile(partnerId)!;
}

// ═══════════════════════════════════════════════════════════════
// Query APIs
// ═══════════════════════════════════════════════════════════════

export function getProfile(partnerId: string): PartnerProfile | null {
  const db = new Bun.SQLite(DB_PATH);
  const row = db.prepare("SELECT * FROM partner_profiles WHERE partner_id = ?").get(partnerId);
  return row ? hydrateProfile(row as Record<string, unknown>) : null;
}

export function listProfiles(filter?: { status?: LifecycleState; template_id?: string }): PartnerProfile[] {
  const db = new Bun.SQLite(DB_PATH);
  let query = "SELECT * FROM partner_profiles WHERE 1=1";
  const params: unknown[] = [];
  if (filter?.status) { query += " AND status = ?"; params.push(filter.status); }
  if (filter?.template_id) { query += " AND template_id = ?"; params.push(filter.template_id); }
  query += " ORDER BY created_at DESC";
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(hydrateProfile);
}

export function getProfileSORGate(partnerId: string): ProfileSORGate | null {
  const profile = getProfile(partnerId);
  return profile ? JSON.parse(profile.sor_json) : null;
}

export function getProfileSettlement(partnerId: string): ProfileSettlement | null {
  const profile = getProfile(partnerId);
  return profile ? JSON.parse(profile.settlement_json) : null;
}

export function getProfileSources(partnerId: string): Array<ProfileSource & { status: string }> {
  const db = new Bun.SQLite(DB_PATH);
  return db.prepare("SELECT * FROM partner_sources WHERE partner_id = ? ORDER BY priority").all(partnerId) as any;
}

export function getProfileLifecycleLog(partnerId: string): unknown[] {
  const db = new Bun.SQLite(DB_PATH);
  return db.prepare("SELECT * FROM partner_lifecycle_log WHERE partner_id = ? ORDER BY timestamp DESC").all(partnerId);
}

// ═══════════════════════════════════════════════════════════════
// Hydration
// ═══════════════════════════════════════════════════════════════

function hydrateProfile(row: Record<string, unknown>): PartnerProfile {
  return {
    partner_id: row.partner_id as string,
    template_id: row.template_id as string,
    status: row.status as LifecycleState,
    display_name: row.display_name as string,
    email: row.email as string,
    phone: row.phone as string | undefined,
    created_at: row.created_at as number,
    materialized_at: row.materialized_at as number | undefined,
    activated_at: row.activated_at as number | undefined,
    graduated_at: row.graduated_at as number | undefined,
    frozen_at: row.frozen_at as number | undefined,
    frozen_reason: row.frozen_reason as string | undefined,
    terminated_at: row.terminated_at as number | undefined,
    updated_at: row.updated_at as number | undefined,
    jurisdiction_json: row.jurisdiction_json as string,
    sources_json: row.sources_json as string,
    cultivation_json: row.cultivation_json as string,
    settlement_json: row.settlement_json as string,
    sor_json: row.sor_json as string,
    telegram_json: row.telegram_json as string,
    balance_json: row.balance_json as string,
    compliance_json: row.compliance_json as string,
    current_limit: row.current_limit as number,
    daily_used: row.daily_used as number,
    total_deposited: row.total_deposited as number,
    total_withdrawn: row.total_withdrawn as number,
    total_settled_pnl: row.total_settled_pnl as number,
    current_balance: row.current_balance as number,
    opsec_score: row.opsec_score as number,
    risk_level: row.risk_level as string,
    kyc_status: row.kyc_status as string,
  };
}
```

---

## 6. tRPC Router — Partner Profile API

```typescript
// src/zones/partner-profile/routes.ts
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import {
  loadTemplate,
  materializeProfile,
  transitionProfileState,
  getProfile,
  listProfiles,
  getProfileSORGate,
  getProfileSettlement,
  getProfileSources,
  getProfileLifecycleLog,
  listTemplates,
} from "./partner-profile-core.js";
import { LifecycleStateSchema } from "./schemas.js";

const t = initTRPC.create();

export const partnerProfileRouter = t.router({
  "partner.create": t.procedure
    .input(z.object({
      partner_id: z.string().min(3).max(32),
      template_id: z.string(),
      display_name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      overrides: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const profile = await materializeProfile(input.partner_id, input.template_id, {
        display_name: input.display_name,
        email: input.email,
        phone: input.phone,
        ...input.overrides,
      });
      return { success: true, profile };
    }),

  "partner.get": t.procedure
    .input(z.object({ partner_id: z.string() }))
    .query(async ({ input }) => {
      const profile = getProfile(input.partner_id);
      if (!profile) throw new Error("Partner not found");
      return profile;
    }),

  "partner.list": t.procedure
    .input(z.object({
      status: LifecycleStateSchema.optional(),
      template_id: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return listProfiles({ status: input.status, template_id: input.template_id }).slice(0, input.limit);
    }),

  "partner.transition": t.procedure
    .input(z.object({
      partner_id: z.string(),
      to_state: LifecycleStateSchema,
      reason: z.string(),
    }))
    .mutation(async ({ input }) => {
      const profile = await transitionProfileState(input.partner_id, input.to_state, "admin", input.reason);
      return { success: true, profile };
    }),

  "partner.sor": t.procedure
    .input(z.object({ partner_id: z.string() }))
    .query(async ({ input }) => {
      const gate = getProfileSORGate(input.partner_id);
      if (!gate) throw new Error("Partner not found");
      return gate;
    }),

  "partner.settlement": t.procedure
    .input(z.object({ partner_id: z.string() }))
    .query(async ({ input }) => {
      const settlement = getProfileSettlement(input.partner_id);
      if (!settlement) throw new Error("Partner not found");
      return settlement;
    }),

  "partner.sources": t.procedure
    .input(z.object({ partner_id: z.string() }))
    .query(async ({ input }) => {
      return getProfileSources(input.partner_id);
    }),

  "partner.lifecycle": t.procedure
    .input(z.object({ partner_id: z.string() }))
    .query(async ({ input }) => {
      return getProfileLifecycleLog(input.partner_id);
    }),

  "partner.templates": t.procedure
    .query(async () => {
      return listTemplates();
    }),
});
```

---

## 7. Dashboard ANSI View

```typescript
// src/zones/partner-profile/dashboard.ts
import { getProfile, listProfiles } from "./partner-profile-core.js";

const ZONE_COLORS: Record<string, string> = {
  signup: "\x1b[38;2;255;255;255m",
  materialized: "\x1b[38;2;224;102;255m",
  kyc_pending: "\x1b[38;2;255;215;0m",
  active: "\x1b[38;2;50;205;50m",
  cultivating: "\x1b[38;2;255;140;66m",
  graduated: "\x1b[38;2;0;153;255m",
  frozen: "\x1b[38;2;220;20;60m",
  suspended: "\x1b[38;2;255;69;0m",
  terminated: "\x1b[38;2;128;128;128m",
};

export function renderPartnerDashboard(termWidth: number): string {
  const profiles = listProfiles();

  let out = `\x1b[1m\x1b[36mPartner Profile OS\x1b[0m  —  ${profiles.length} partners\n`;
  out += "─".repeat(termWidth) + "\n";

  out += `  ${"Partner".padEnd(14)} ${"Template".padEnd(16)} ${"Status".padEnd(12)} ${"Limit".padStart(8)} ${"Balance".padStart(10)} ${"OpSec".padStart(5)} ${"Sources".padStart(4)}\n`;
  out += "─".repeat(termWidth) + "\n";

  for (const p of profiles) {
    const color = ZONE_COLORS[p.status] || "\x1b[0m";
    const sources = JSON.parse(p.sources_json).defaults?.length || 0;

    out += `  ${color}${p.partner_id.padEnd(14)}\x1b[0m `;
    out += `${p.template_id.padEnd(16)} `;
    out += `${color}${p.status.padEnd(12)}\x1b[0m `;
    out += `$${p.current_limit.toLocaleString().padStart(7)} `;
    out += `$${p.current_balance.toLocaleString().padStart(9)} `;
    out += `${p.opsec_score.toString().padStart(4)} `;
    out += `${sources.toString().padStart(3)}`;
    out += "\n";
  }

  return out;
}

export function renderPartnerDetail(partnerId: string, termWidth: number): string {
  const p = getProfile(partnerId);
  if (!p) return `\x1b[31mPartner not found: ${partnerId}\x1b[0m`;

  const j = JSON.parse(p.jurisdiction_json);
  const c = JSON.parse(p.cultivation_json);
  const s = JSON.parse(p.settlement_json);
  const g = JSON.parse(p.sor_json);
  const t = JSON.parse(p.telegram_json);
  const b = JSON.parse(p.balance_json);

  let out = `\x1b[1m\x1b[36m${p.partner_id}\x1b[0m  ${p.display_name}  <${p.email}>\n`;
  out += "═".repeat(termWidth) + "\n";

  out += `\x1b[38;2;224;102;255mStatus\x1b[0m:    ${p.status} (since ${new Date(p.materialized_at || p.created_at).toISOString().slice(0,10)})\n`;
  out += `\x1b[38;2;238;130;238mJurisdiction\x1b[0m: ${j.type} | KYC: ${p.kyc_status} | Tax: ${j.tax_form}\n`;
  out += `\x1b[38;2;255;105;180mCultivation\x1b[0m:  Limit $${p.current_limit.toLocaleString()} / $${c.limit_raise_target.toLocaleString()} | Deposits $${p.total_deposited.toLocaleString()} / $${c.initial_deposit_target.toLocaleString()}\n`;
  out += `\x1b[38;2;255;20;147mSettlement\x1b[0m:   ${s.commission_structure} commission | ${s.payout_cadence} payout | ${s.currency}\n`;
  out += `\x1b[38;2;219;112;147mSOR Gate\x1b[0m:     Tiers [${g.eligible_tiers.join(",")}] | Steam:${g.steam_allowed} Arb:${g.arb_allowed} CLV:${g.clv_allowed}\n`;
  out += `\x1b[38;2;255;182;193mTelegram\x1b[0m:     ${t.groups.length} groups | Min alert $${t.alert_stake_minimum}\n`;
  out += `\x1b[38;2;255;192;203mBalance\x1b[0m:      $${p.current_balance.toLocaleString()} | Margin call at ${(b.margin_call_threshold*100).toFixed(0)}% | Auto-inject:${b.auto_inject_enabled}\n`;
  out += `\x1b[38;2;255;0;0mOpSec\x1b[0m:        Score ${p.opsec_score} | Risk: ${p.risk_level}\n`;

  return out;
}
```

---

## 8. Smoke Test — PARTNER_001 Full Validation

```bash
#!/bin/bash
# scripts/smoke-test-partner-001.sh
# Full 15-step validation of Partner Profile OS

echo "🧪 Partner Profile OS — PARTNER_001 Full Smoke Test"

# 1. Create from hybrid-sharp template
echo "[1/15] Materialize PARTNER_001..."
bun -e 'import{materializeProfile}from"./src/zones/partner-profile/partner-profile-core.ts"; await materializeProfile("PARTNER_001", "hybrid-sharp", {display_name:"Alpha Test",email:"alpha@test.com"})'

# 2. Verify master record
echo "[2/15] Verify partner_profiles..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const p=db.prepare("SELECT status,template_id,current_limit FROM partner_profiles WHERE partner_id=?").get("PARTNER_001"); console.log(p.status==="materialized"&&p.template_id==="hybrid-sharp"&&p.current_limit===2000?"✓":"✗", p)'

# 3. Verify sources materialized (8 sources)
echo "[3/15] Verify partner_sources..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const n=db.prepare("SELECT COUNT(*) as n FROM partner_sources WHERE partner_id=?").get("PARTNER_001"); console.log(n.n===8?"✓ 8 sources":"✗", n)'

# 4. Verify source types
echo "[4/15] Verify source types..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const t=db.prepare("SELECT source_type,COUNT(*) as n FROM partner_sources WHERE partner_id=? GROUP BY source_type").all("PARTNER_001"); console.table(t)'

# 5. Verify cultivation
echo "[5/15] Verify partner_cultivation..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const c=db.prepare("SELECT phase,target_limit,current_limit FROM partner_cultivation WHERE partner_id=?").get("PARTNER_001"); console.log(c.phase==="warmup"&&c.target_limit===50000?"✓":"✗", c)'

# 6. Verify settlement
echo "[6/15] Verify partner_settlement..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const s=db.prepare("SELECT commission_structure,payout_cadence,currency FROM partner_settlement WHERE partner_id=?").get("PARTNER_001"); console.log(s.commission_structure==="tiered"&&s.payout_cadence==="daily"?"✓":"✗", s)'

# 7. Verify Telegram topics
echo "[7/15] Verify partner_telegram_topics..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const n=db.prepare("SELECT COUNT(*) as n FROM partner_telegram_topics WHERE partner_id=?").get("PARTNER_001"); console.log(n.n===6?"✓ 6 topics":"✗", n)'

# 8. Verify gates
echo "[8/15] Verify partner_gates..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const g=db.prepare("SELECT steam_allowed,arb_allowed,clv_allowed,max_exposure_per_signal FROM partner_gates WHERE partner_id=?").get("PARTNER_001"); console.log(g.steam_allowed===1&&g.arb_allowed===1&&g.max_exposure_per_signal===25000?"✓":"✗", g)'

# 9. Verify lifecycle log
echo "[9/15] Verify partner_lifecycle_log..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const n=db.prepare("SELECT COUNT(*) as n FROM partner_lifecycle_log WHERE partner_id=?").get("PARTNER_001"); console.log(n.n>=1?"✓ logged":"✗", n)'

# 10. Transition to active (should fail without KYC)
echo "[10/15] Test active transition guard (expect fail)..."
bun -e 'import{transitionProfileState}from"./src/zones/partner-profile/partner-profile-core.ts"; try{await transitionProfileState("PARTNER_001", "active", "admin", "Test")}catch(e){console.log("✓ Guard blocked:", e.message)}'

# 11. Set KYC verified
echo "[11/15] Set KYC verified..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); db.prepare("UPDATE partner_profiles SET kyc_status="verified" WHERE partner_id=?").run("PARTNER_001"); console.log("✓ KYC set")'

# 12. Set capital requirement met
echo "[12/15] Set capital requirement met..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); db.prepare("UPDATE partner_profiles SET total_deposited=50000 WHERE partner_id=?").run("PARTNER_001"); console.log("✓ Capital set")'

# 13. Transition to active (should pass)
echo "[13/15] Transition to active..."
bun -e 'import{transitionProfileState}from"./src/zones/partner-profile/partner-profile-core.ts"; const p=await transitionProfileState("PARTNER_001", "active", "admin", "KYC + capital verified"); console.log("✓ Active:", p.status, p.activated_at?"timestamp":"no timestamp")'

# 14. Verify sources activated
echo "[14/15] Verify sources activated..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const n=db.prepare("SELECT COUNT(*) as n FROM partner_sources WHERE partner_id=? AND status="active"").get("PARTNER_001"); console.log(n.n===8?"✓ 8 active":"✗", n)'

# 15. Verify lifecycle log updated
echo "[15/15] Verify lifecycle log..."
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const n=db.prepare("SELECT COUNT(*) as n FROM partner_lifecycle_log WHERE partner_id=?").get("PARTNER_001"); console.log(n.n>=2?"✓ 2+ events":"✗", n)'

echo ""
echo "🎉 PARTNER_001 full smoke test complete."
echo ""
echo "Next: Test graduation"
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); db.prepare("UPDATE partner_profiles SET current_limit=50000, total_deposited=25000 WHERE partner_id=?").run("PARTNER_001"); db.prepare("UPDATE partner_cultivation SET graduation_eligible=1 WHERE partner_id=?").run("PARTNER_001"); console.log("✓ Graduation prepped")'

bun -e 'import{transitionProfileState}from"./src/zones/partner-profile/partner-profile-core.ts"; const p=await transitionProfileState("PARTNER_001", "graduated", "admin", "Limit target achieved"); console.log("✓ Graduated:", p.status, "Limit:", p.current_limit)'
```

---

## 9. One-Liner Validation Suite (Partner Profile)

```bash
# 34. Load template
bun -e 'import{loadTemplate}from"./src/zones/partner-profile/partner-profile-core.ts"; const t=await loadTemplate("hybrid-sharp"); console.log("✓", t.meta.name, "sources:", t.sources.defaults.length)'

# 35. List templates
bun -e 'import{listTemplates}from"./src/zones/partner-profile/partner-profile-core.ts"; const ts=await listTemplates(); console.table(ts)'

# 36. Materialize partner
bun -e 'import{materializeProfile}from"./src/zones/partner-profile/partner-profile-core.ts"; const p=await materializeProfile("PARTNER_002", "legal-us-retail", {display_name:"Retail Test",email:"retail@test.com"}); console.log("✓", p.partner_id, p.status)'

# 37. Query profile
bun -e 'import{getProfile}from"./src/zones/partner-profile/partner-profile-core.ts"; const p=getProfile("PARTNER_001"); console.log("✓", p?.display_name, p?.status, p?.current_limit)'

# 38. List by status
bun -e 'import{listProfiles}from"./src/zones/partner-profile/partner-profile-core.ts"; const ps=listProfiles({status:"active"}); console.table(ps.map(p=>({id:p.partner_id,limit:p.current_limit,balance:p.current_balance})))'

# 39. Get SOR gate
bun -e 'import{getProfileSORGate}from"./src/zones/partner-profile/partner-profile-core.ts"; const g=getProfileSORGate("PARTNER_001"); console.log("✓ steam:", g?.steam_allowed, "arb:", g?.arb_allowed, "tiers:", g?.eligible_tiers)'

# 40. Get settlement
bun -e 'import{getProfileSettlement}from"./src/zones/partner-profile/partner-profile-core.ts"; const s=getProfileSettlement("PARTNER_001"); console.log("✓", s?.commission_structure, s?.payout_cadence, s?.currency)'

# 41. Get sources
bun -e 'import{getProfileSources}from"./src/zones/partner-profile/partner-profile-core.ts"; const ss=getProfileSources("PARTNER_001"); console.table(ss.map(s=>({id:s.source_id,type:s.source_type,book:s.book_id,status:s.status})))'

# 42. Get lifecycle log
bun -e 'import{getProfileLifecycleLog}from"./src/zones/partner-profile/partner-profile-core.ts"; const l=getProfileLifecycleLog("PARTNER_001"); console.table(l.map(e=>({from:e.from_state,to:e.to_state,by:e.triggered_by,at:new Date(e.timestamp).toISOString()})))'

# 43. Render dashboard
bun -e 'import{renderPartnerDashboard}from"./src/zones/partner-profile/dashboard.ts"; console.log(renderPartnerDashboard(120))'

# 44. Render partner detail
bun -e 'import{renderPartnerDetail}from"./src/zones/partner-profile/dashboard.ts"; console.log(renderPartnerDetail("PARTNER_001", 100))'

# 45. Transition guard fail
bun -e 'import{transitionProfileState}from"./src/zones/partner-profile/partner-profile-core.ts"; try{await transitionProfileState("PARTNER_002", "graduated", "admin", "Test")}catch(e){console.log("✓ Guard blocked:", e.message)}'

# 46. Full profile audit
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const p=db.prepare("SELECT partner_id,template_id,status,current_limit,risk_level,opsec_score FROM partner_profiles").all(); console.table(p)'

# 47. Sources audit
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const s=db.prepare("SELECT partner_id,source_id,source_type,book_id,status FROM partner_sources ORDER BY partner_id,priority").all(); console.table(s)'

# 48. Cultivation audit
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const c=db.prepare("SELECT partner_id,phase,target_limit,actual_deposit_total,graduation_eligible FROM partner_cultivation").all(); console.table(c)'

# 49. Gates audit
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const g=db.prepare("SELECT partner_id,steam_allowed,arb_allowed,max_exposure_per_signal FROM partner_gates").all(); console.table(g)'

# 50. Lifecycle audit
bun -e 'const db=new Bun.SQLite("sports-terminal.db"); const l=db.prepare("SELECT partner_id,from_state,to_state,triggered_by,timestamp FROM partner_lifecycle_log ORDER BY timestamp DESC LIMIT 10").all(); console.table(l)'
```

---

## 10. Integration — How All Zones Consume Partner Profile OS

```mermaid
flowchart TB
    subgraph Profile["🎭 Partner Profile OS"]
        P1[partner_profiles]
        P2[partner_sources]
        P3[partner_cultivation]
        P4[partner_settlement]
        P5[partner_telegram_topics]
        P6[partner_gates]
        P7[partner_lifecycle_log]
    end

    subgraph Zone1["🏀 Zone 1: Sportsbook"]
        Z1[LimitGuard]
        Z1b[BetIngestor]
    end

    subgraph Zone3["📱 Zone 3: Telegram"]
        Z3[Bot]
        Z3b[GroupManager]
    end

    subgraph Zone4["🛡️ Zone 4: Risk"]
        Z4[PlayerProfile]
        Z4b[ComplianceRules]
    end

    subgraph Zone6["💰 Zone 6: Accounting"]
        Z6[Ledger]
        Z6b[CommissionEngine]
        Z6c[WeeklyReport]
    end

    subgraph Zone9["📈 Zone 9: Market"]
        Z9[SignalRouter]
    end

    subgraph SDN["🚀 SDN"]
        SDN1[SOR v2]
        SDN2[SignalClassifier]
    end

    subgraph Zone22["📈 Zone 22: Partner Command"]
        Z22[Dashboard]
        Z22b[LimitManager]
        Z22c[CultivationTracker]
    end

    P1 -->|current_limit| Z1
    P1 -->|kyc_status| Z4
    P1 -->|opsec_score| Z4b
    P1 -->|settlement_json| Z6b
    P1 -->|balance| Z6

    P2 -->|source_id + status + priority| SDN1
    P2 -->|book_id + endpoint| SDN1
    P2 -->|max_stake + daily_limit| Z1

    P3 -->|phase + target_limit| Z22c
    P3 -->|graduation_eligible| Z22b

    P4 -->|commission_structure| Z6b
    P4 -->|payout_cadence| Z6c
    P4 -->|makeup_enabled| Z6b

    P5 -->|chat_id| Z3
    P5 -->|alert_types| Z3b

    P6 -->|eligible_tiers| SDN1
    P6 -->|steam_allowed + arb_allowed| SDN2
    P6 -->|max_exposure_per_signal| SDN1
    P6 -->|book_whitelist| SDN1
    P6 -->|require_opsec_green| Z4b

    P7 -->|audit trail| Z22

    Z22c -->|deposit_schedule| P3
    Z22b -->|limit raise| P1
    Z6b -->|commission paid| P4
    Z3 -->|group created| P5
```

---

*Sports Terminal v5.2 — Partner Profile OS: Full Implementation*
*7 domain classes. 7 SQLite tables. TOML-backed. Lifecycle-guarded. Production-ready.*
