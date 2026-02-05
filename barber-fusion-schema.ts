// barber-fusion-schema.ts - Enhanced Schema with SQL DDL, Validation & Examples

// ==================== ENUM DEFINITIONS ====================

export type AccountAgeTier = 'new' | 'recent' | 'growing' | 'established' | 'veteran';
export type RiskLevel = 'high' | 'medium' | 'low' | 'minimal';
export type FusionTier = 'casual' | 'active' | 'high_volume' | 'whale';
export type ImpactLevel = 'none' | 'minimal' | 'moderate' | 'significant' | 'critical';
export type ActionCategory = 'verification' | 'engagement' | 'retention' | 'upsell' | 'referral' | 'documentation' | 'risk';
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low' | 'optional';
export type ActionTiming = 'pre_service' | 'during_service' | 'post_service' | 'at_checkout' | 'follow_up' | 'ongoing';

// ==================== ACCOUNT AGE SCHEMA ====================

export interface AccountAgeSchema {
  /** Primary key - unique tier identifier */
  tier: {
    type: 'enum';
    values: AccountAgeTier[];
    required: true;
    description: 'Account maturity classification';
    example: 'new';
  };
  
  /** Human-readable display name */
  label: {
    type: 'string';
    maxLength: 50;
    required: true;
    description: 'UI display label';
    example: 'New Account';
    i18n: true; // Translatable
  };
  
  /** Day range [minimum, maximum] */
  dayRange: {
    type: 'tuple';
    items: ['number', 'number | null'];
    required: true;
    description: 'Age range in days [min, max]';
    example: [0, 7];
    validation: 'min >= 0, max > min or null for unlimited';
  };
  
  /** Trust multiplier for risk calculations */
  trustMultiplier: {
    type: 'number';
    min: 0;
    max: 1;
    decimals: 2;
    required: true;
    description: 'Multiplier for trust-based limits';
    example: 0.3;
    formula: 'affects payment limits and verification requirements';
  };
  
  /** Risk assessment level */
  riskLevel: {
    type: 'enum';
    values: RiskLevel[];
    required: true;
    description: 'Risk classification';
    example: 'high';
    mapping: {
      high: { score: 0.8, color: '#ff4444', alert: true },
      medium: { score: 0.5, color: '#ffaa00', alert: true },
      low: { score: 0.2, color: '#ffff00', alert: false },
      minimal: { score: 0.0, color: '#00ff00', alert: false }
    };
  };
  
  /** CashApp daily send limit in USD */
  cashappDailyLimit: {
    type: 'integer';
    min: 0;
    max: 10000;
    unit: 'USD';
    required: true;
    description: 'Maximum daily transfer amount';
    example: 250;
    source: 'CashApp API documentation v2024';
  };
  
  /** CashApp weekly send limit in USD */
  cashappWeeklyLimit: {
    type: 'integer';
    min: 0;
    max: 50000;
    unit: 'USD';
    required: true;
    description: 'Maximum weekly transfer amount';
    example: 1000;
    source: 'CashApp API documentation v2024';
  };
  
  /** Instant deposit availability */
  instantDepositAvailable: {
    type: 'boolean';
    required: true;
    description: 'Can use instant deposit feature';
    example: false;
    conditions: {
      if: 'accountAge < 30 days',
      then: false,
      else: true
    };
  };
  
  /** Hold period for new transactions */
  holdPeriodDays: {
    type: 'integer';
    min: 0;
    max: 7;
    unit: 'days';
    required: true;
    description: 'Days to hold first transactions';
    example: 3;
    businessRule: 'First 3 transactions held for verification';
  };
  
  /** Visual badge emoji */
  badge: {
    type: 'string';
    pattern: 'emoji';
    maxLength: 2;
    required: true;
    description: 'Visual indicator emoji';
    example: '🆕';
    alternatives: {
      new: ['🆕', '🔴', '⚠️'],
      recent: ['🌱', '🟡', '🔸'],
      growing: ['📈', '🟢', '🔹'],
      established: ['✅', '🔵', '💎'],
      veteran: ['👑', '🟣', '⭐']
    };
  };
  
  /** UI color code */
  color: {
    type: 'string';
    pattern: '^#[0-9A-Fa-f]{6}$';
    required: true;
    description: 'CSS hex color code';
    example: '#ff6b6b';
    contrast: {
      light: '#ffffff',
      dark: '#000000'
    };
  };
  
  /** SQL index hint */
  _sql: {
    table: 'account_age_tiers';
    primaryKey: 'tier';
    indexes: ['riskLevel', 'cashappDailyLimit'];
    comment: 'Configuration table for account age classifications';
  };
}

// Account Age Data
export const AccountAgeData: Record<AccountAgeTier, AccountAgeSchema> = {
  new: {
    tier: { type: 'enum', values: ['new'], required: true, description: 'Account maturity classification', example: 'new' },
    label: { type: 'string', maxLength: 50, required: true, description: 'UI display label', example: 'New Account', i18n: true },
    dayRange: { type: 'tuple', items: ['number', 'number | null'], required: true, description: 'Age range in days [min, max]', example: [0, 7], validation: 'min >= 0, max > min or null for unlimited' },
    trustMultiplier: { type: 'number', min: 0, max: 1, decimals: 2, required: true, description: 'Multiplier for trust-based limits', example: 0.3, formula: 'affects payment limits and verification requirements' },
    riskLevel: { type: 'enum', values: ['high', 'medium', 'low', 'minimal'], required: true, description: 'Risk classification', example: 'high', mapping: { high: { score: 0.8, color: '#ff4444', alert: true }, medium: { score: 0.5, color: '#ffaa00', alert: true }, low: { score: 0.2, color: '#ffff00', alert: false }, minimal: { score: 0.0, color: '#00ff00', alert: false } } },
    cashappDailyLimit: { type: 'integer', min: 0, max: 10000, unit: 'USD', required: true, description: 'Maximum daily transfer amount', example: 250, source: 'CashApp API documentation v2024' },
    cashappWeeklyLimit: { type: 'integer', min: 0, max: 50000, unit: 'USD', required: true, description: 'Maximum weekly transfer amount', example: 1000, source: 'CashApp API documentation v2024' },
    instantDepositAvailable: { type: 'boolean', required: true, description: 'Can use instant deposit feature', example: false, conditions: { if: 'accountAge < 30 days', then: false, else: true } },
    holdPeriodDays: { type: 'integer', min: 0, max: 7, unit: 'days', required: true, description: 'Days to hold first transactions', example: 3, businessRule: 'First 3 transactions held for verification' },
    badge: { type: 'string', pattern: 'emoji', maxLength: 2, required: true, description: 'Visual indicator emoji', example: '🆕', alternatives: { new: ['🆕', '🔴', '⚠️'], recent: ['🌱', '🟡', '🔸'], growing: ['📈', '🟢', '🔹'], established: ['✅', '🔵', '💎'], veteran: ['👑', '🟣', '⭐'] } },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', required: true, description: 'CSS hex color code', example: '#ff6b6b', contrast: { light: '#ffffff', dark: '#000000' } },
    _sql: { table: 'account_age_tiers', primaryKey: 'tier', indexes: ['riskLevel', 'cashappDailyLimit'], comment: 'Configuration table for account age classifications' }
  },
  recent: {
    tier: { type: 'enum', values: ['recent'], required: true, description: 'Account maturity classification', example: 'recent' },
    label: { type: 'string', maxLength: 50, required: true, description: 'UI display label', example: 'Recent Account', i18n: true },
    dayRange: { type: 'tuple', items: ['number', 'number | null'], required: true, description: 'Age range in days [min, max]', example: [8, 30], validation: 'min >= 0, max > min or null for unlimited' },
    trustMultiplier: { type: 'number', min: 0, max: 1, decimals: 2, required: true, description: 'Multiplier for trust-based limits', example: 0.5, formula: 'affects payment limits and verification requirements' },
    riskLevel: { type: 'enum', values: ['high', 'medium', 'low', 'minimal'], required: true, description: 'Risk classification', example: 'medium', mapping: { high: { score: 0.8, color: '#ff4444', alert: true }, medium: { score: 0.5, color: '#ffaa00', alert: true }, low: { score: 0.2, color: '#ffff00', alert: false }, minimal: { score: 0.0, color: '#00ff00', alert: false } } },
    cashappDailyLimit: { type: 'integer', min: 0, max: 10000, unit: 'USD', required: true, description: 'Maximum daily transfer amount', example: 500, source: 'CashApp API documentation v2024' },
    cashappWeeklyLimit: { type: 'integer', min: 0, max: 50000, unit: 'USD', required: true, description: 'Maximum weekly transfer amount', example: 2500, source: 'CashApp API documentation v2024' },
    instantDepositAvailable: { type: 'boolean', required: true, description: 'Can use instant deposit feature', example: true, conditions: { if: 'accountAge < 30 days', then: false, else: true } },
    holdPeriodDays: { type: 'integer', min: 0, max: 7, unit: 'days', required: true, description: 'Days to hold first transactions', example: 1, businessRule: 'First 3 transactions held for verification' },
    badge: { type: 'string', pattern: 'emoji', maxLength: 2, required: true, description: 'Visual indicator emoji', example: '🌱', alternatives: { new: ['🆕', '🔴', '⚠️'], recent: ['🌱', '🟡', '🔸'], growing: ['📈', '🟢', '🔹'], established: ['✅', '🔵', '💎'], veteran: ['👑', '🟣', '⭐'] } },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', required: true, description: 'CSS hex color code', example: '#ffd93d', contrast: { light: '#ffffff', dark: '#000000' } },
    _sql: { table: 'account_age_tiers', primaryKey: 'tier', indexes: ['riskLevel', 'cashappDailyLimit'], comment: 'Configuration table for account age classifications' }
  },
  growing: {
    tier: { type: 'enum', values: ['growing'], required: true, description: 'Account maturity classification', example: 'growing' },
    label: { type: 'string', maxLength: 50, required: true, description: 'UI display label', example: 'Growing Account', i18n: true },
    dayRange: { type: 'tuple', items: ['number', 'number | null'], required: true, description: 'Age range in days [min, max]', example: [31, 90], validation: 'min >= 0, max > min or null for unlimited' },
    trustMultiplier: { type: 'number', min: 0, max: 1, decimals: 2, required: true, description: 'Multiplier for trust-based limits', example: 0.7, formula: 'affects payment limits and verification requirements' },
    riskLevel: { type: 'enum', values: ['high', 'medium', 'low', 'minimal'], required: true, description: 'Risk classification', example: 'low', mapping: { high: { score: 0.8, color: '#ff4444', alert: true }, medium: { score: 0.5, color: '#ffaa00', alert: true }, low: { score: 0.2, color: '#ffff00', alert: false }, minimal: { score: 0.0, color: '#00ff00', alert: false } } },
    cashappDailyLimit: { type: 'integer', min: 0, max: 10000, unit: 'USD', required: true, description: 'Maximum daily transfer amount', example: 1000, source: 'CashApp API documentation v2024' },
    cashappWeeklyLimit: { type: 'integer', min: 0, max: 50000, unit: 'USD', required: true, description: 'Maximum weekly transfer amount', example: 5000, source: 'CashApp API documentation v2024' },
    instantDepositAvailable: { type: 'boolean', required: true, description: 'Can use instant deposit feature', example: true, conditions: { if: 'accountAge < 30 days', then: false, else: true } },
    holdPeriodDays: { type: 'integer', min: 0, max: 7, unit: 'days', required: true, description: 'Days to hold first transactions', example: 0, businessRule: 'First 3 transactions held for verification' },
    badge: { type: 'string', pattern: 'emoji', maxLength: 2, required: true, description: 'Visual indicator emoji', example: '📈', alternatives: { new: ['🆕', '🔴', '⚠️'], recent: ['🌱', '🟡', '🔸'], growing: ['📈', '🟢', '🔹'], established: ['✅', '🔵', '💎'], veteran: ['👑', '🟣', '⭐'] } },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', required: true, description: 'CSS hex color code', example: '#6bcf7f', contrast: { light: '#ffffff', dark: '#000000' } },
    _sql: { table: 'account_age_tiers', primaryKey: 'tier', indexes: ['riskLevel', 'cashappDailyLimit'], comment: 'Configuration table for account age classifications' }
  },
  established: {
    tier: { type: 'enum', values: ['established'], required: true, description: 'Account maturity classification', example: 'established' },
    label: { type: 'string', maxLength: 50, required: true, description: 'UI display label', example: 'Established Account', i18n: true },
    dayRange: { type: 'tuple', items: ['number', 'number | null'], required: true, description: 'Age range in days [min, max]', example: [91, 365], validation: 'min >= 0, max > min or null for unlimited' },
    trustMultiplier: { type: 'number', min: 0, max: 1, decimals: 2, required: true, description: 'Multiplier for trust-based limits', example: 0.9, formula: 'affects payment limits and verification requirements' },
    riskLevel: { type: 'enum', values: ['high', 'medium', 'low', 'minimal'], required: true, description: 'Risk classification', example: 'minimal', mapping: { high: { score: 0.8, color: '#ff4444', alert: true }, medium: { score: 0.5, color: '#ffaa00', alert: true }, low: { score: 0.2, color: '#ffff00', alert: false }, minimal: { score: 0.0, color: '#00ff00', alert: false } } },
    cashappDailyLimit: { type: 'integer', min: 0, max: 10000, unit: 'USD', required: true, description: 'Maximum daily transfer amount', example: 2500, source: 'CashApp API documentation v2024' },
    cashappWeeklyLimit: { type: 'integer', min: 0, max: 50000, unit: 'USD', required: true, description: 'Maximum weekly transfer amount', example: 10000, source: 'CashApp API documentation v2024' },
    instantDepositAvailable: { type: 'boolean', required: true, description: 'Can use instant deposit feature', example: true, conditions: { if: 'accountAge < 30 days', then: false, else: true } },
    holdPeriodDays: { type: 'integer', min: 0, max: 7, unit: 'days', required: true, description: 'Days to hold first transactions', example: 0, businessRule: 'First 3 transactions held for verification' },
    badge: { type: 'string', pattern: 'emoji', maxLength: 2, required: true, description: 'Visual indicator emoji', example: '✅', alternatives: { new: ['🆕', '🔴', '⚠️'], recent: ['🌱', '🟡', '🔸'], growing: ['📈', '🟢', '🔹'], established: ['✅', '🔵', '💎'], veteran: ['👑', '🟣', '⭐'] } },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', required: true, description: 'CSS hex color code', example: '#4ecdc4', contrast: { light: '#ffffff', dark: '#000000' } },
    _sql: { table: 'account_age_tiers', primaryKey: 'tier', indexes: ['riskLevel', 'cashappDailyLimit'], comment: 'Configuration table for account age classifications' }
  },
  veteran: {
    tier: { type: 'enum', values: ['veteran'], required: true, description: 'Account maturity classification', example: 'veteran' },
    label: { type: 'string', maxLength: 50, required: true, description: 'UI display label', example: 'Veteran Account', i18n: true },
    dayRange: { type: 'tuple', items: ['number', 'number | null'], required: true, description: 'Age range in days [min, max]', example: [366, null], validation: 'min >= 0, max > min or null for unlimited' },
    trustMultiplier: { type: 'number', min: 0, max: 1, decimals: 2, required: true, description: 'Multiplier for trust-based limits', example: 1.0, formula: 'affects payment limits and verification requirements' },
    riskLevel: { type: 'enum', values: ['high', 'medium', 'low', 'minimal'], required: true, description: 'Risk classification', example: 'minimal', mapping: { high: { score: 0.8, color: '#ff4444', alert: true }, medium: { score: 0.5, color: '#ffaa00', alert: true }, low: { score: 0.2, color: '#ffff00', alert: false }, minimal: { score: 0.0, color: '#00ff00', alert: false } } },
    cashappDailyLimit: { type: 'integer', min: 0, max: 10000, unit: 'USD', required: true, description: 'Maximum daily transfer amount', example: 7500, source: 'CashApp API documentation v2024' },
    cashappWeeklyLimit: { type: 'integer', min: 0, max: 50000, unit: 'USD', required: true, description: 'Maximum weekly transfer amount', example: 25000, source: 'CashApp API documentation v2024' },
    instantDepositAvailable: { type: 'boolean', required: true, description: 'Can use instant deposit feature', example: true, conditions: { if: 'accountAge < 30 days', then: false, else: true } },
    holdPeriodDays: { type: 'integer', min: 0, max: 7, unit: 'days', required: true, description: 'Days to hold first transactions', example: 0, businessRule: 'First 3 transactions held for verification' },
    badge: { type: 'string', pattern: 'emoji', maxLength: 2, required: true, description: 'Visual indicator emoji', example: '👑', alternatives: { new: ['🆕', '🔴', '⚠️'], recent: ['🌱', '🟡', '🔸'], growing: ['📈', '🟢', '🔹'], established: ['✅', '🔵', '💎'], veteran: ['👑', '🟣', '⭐'] } },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', required: true, description: 'CSS hex color code', example: '#a78bfa', contrast: { light: '#ffffff', dark: '#000000' } },
    _sql: { table: 'account_age_tiers', primaryKey: 'tier', indexes: ['riskLevel', 'cashappDailyLimit'], comment: 'Configuration table for account age classifications' }
  }
};

// ==================== SQL DDL ====================

export const SQL_DDL = `
-- Account Age Tiers Table
CREATE TABLE account_age_tiers (
  tier VARCHAR(20) PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  day_min INTEGER NOT NULL,
  day_max INTEGER,
  trust_multiplier DECIMAL(3,2) NOT NULL CHECK (trust_multiplier BETWEEN 0 AND 1),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('high', 'medium', 'low', 'minimal')),
  cashapp_daily_limit INTEGER NOT NULL,
  cashapp_weekly_limit INTEGER NOT NULL,
  instant_deposit_available BOOLEAN NOT NULL DEFAULT FALSE,
  hold_period_days INTEGER NOT NULL DEFAULT 0,
  badge VARCHAR(2) NOT NULL,
  color CHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barber Actions Table
CREATE TABLE barber_actions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('verification', 'engagement', 'retention', 'upsell', 'referral', 'documentation', 'risk')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low', 'optional')),
  timing VARCHAR(20) NOT NULL CHECK (timing IN ('pre_service', 'during_service', 'post_service', 'at_checkout', 'follow_up', 'ongoing')),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  script TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  can_automate BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to JSONB NOT NULL, -- Array of account age tiers
  fusion_tiers JSONB NOT NULL, -- Array of fusion tiers
  commission_bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fusion Impact Configurations
CREATE TABLE fusion_configs (
  tier VARCHAR(20) PRIMARY KEY,
  label VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  new_account_impact_level VARCHAR(20) NOT NULL,
  new_account_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  min_days_required INTEGER NOT NULL DEFAULT 0,
  adjusted_tier VARCHAR(20),
  avg_transaction DECIMAL(10,2) NOT NULL,
  avg_tip DECIMAL(10,2) NOT NULL,
  visit_frequency_days INTEGER NOT NULL,
  annual_spend DECIMAL(10,2) NOT NULL,
  strategy_goal TEXT NOT NULL,
  strategy_actions JSONB NOT NULL,
  strategy_time_investment VARCHAR(50) NOT NULL,
  strategy_perks JSONB NOT NULL,
  retention_tactic TEXT NOT NULL,
  retention_follow_up_days JSONB NOT NULL,
  retention_rebooking_target DECIMAL(3,2) NOT NULL,
  ltv_6_month DECIMAL(10,2) NOT NULL,
  ltv_1_year DECIMAL(10,2) NOT NULL,
  ltv_2_year DECIMAL(10,2) NOT NULL,
  ltv_max_cac DECIMAL(10,2) NOT NULL,
  commission_base_rate DECIMAL(3,2) NOT NULL,
  commission_upsell_bonus DECIMAL(3,2) NOT NULL,
  commission_referral_bonus DECIMAL(10,2) NOT NULL,
  commission_product_rate DECIMAL(3,2) NOT NULL,
  qual_min_visits INTEGER NOT NULL,
  qual_min_spend DECIMAL(10,2) NOT NULL,
  qual_max_days_between INTEGER NOT NULL,
  qual_required_behaviors JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action Matrix (Cross-reference)
CREATE TABLE action_matrix (
  account_age_tier VARCHAR(20) REFERENCES account_age_tiers(tier),
  fusion_tier VARCHAR(20) REFERENCES fusion_configs(tier),
  action_ids JSONB NOT NULL,
  PRIMARY KEY (account_age_tier, fusion_tier)
);

-- Indexes
CREATE INDEX idx_account_age_risk ON account_age_tiers(risk_level);
CREATE INDEX idx_barber_actions_category ON barber_actions(category);
CREATE INDEX idx_barber_actions_priority ON barber_actions(priority);
CREATE INDEX idx_fusion_configs_eligible ON fusion_configs(new_account_eligible);
`;

// Export all types
export type { AccountAgeSchema, AccountAgeTier, RiskLevel, FusionTier, ImpactLevel, ActionCategory, ActionPriority, ActionTiming };
