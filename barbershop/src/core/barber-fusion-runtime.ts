import type { AccountAgeTier, FusionTier, RiskLevel } from './barber-fusion-types';

// barber-fusion-runtime.ts - Runtime Validation, Utilities & Sample Data
// Integrated with OpenClaw Context v3.16

import { Database } from 'bun:sqlite';
import { redis } from 'bun';

// ==================== OPENCLAW CONTEXT INTEGRATION ====================
// Import Bun Context for global config resolution and context-aware execution
import {
  loadGlobalConfig,
  executeWithContext,
  generateContextHash,
  type BunGlobalConfig,
  type ContextSession,
  c,
} from '../../lib/bun-context.ts';

// OpenClaw Profile integration
import gateway from '../../openclaw/gateway.ts';

// Fusion Context Types
interface FusionContext {
  environment: 'development' | 'staging' | 'production';
  region?: string;
  tenantId?: string;
  featureFlags: Record<string, boolean>;
  contextHash: string;
  globalConfig?: BunGlobalConfig;
}

interface ContextualExecutionResult<T> {
  data: T;
  session: ContextSession | null;
  context: FusionContext;
  durationMs: number;
  cached: boolean;
}

interface BarberAction {
  id: string;
  name: string;
  category: string;
  priority: string;
  timing: string;
  durationSeconds: number;
  script: string;
  purpose: string;
  expectedOutcome: string;
  successMetric: string;
  successRate: number;
  canAutomate: boolean;
  appliesTo: string[];
  fusionTiers: string[];
  commissionBonus: number;
  requiresTraining: boolean;
  trainingVideo: string;
  createdAt: string;
}

interface AccountAgeRecord {
  tier: string;
  label: string;
  label_es: string;
  day_min: number;
  day_max: number;
  trust_multiplier: number;
  risk_level: string;
  cashapp_daily_limit: number;
  cashapp_weekly_limit: number;
  instant_deposit_available: number;
  hold_period_days: number;
  badge: string;
  color: string;
}

// ==================== CONTEXT RESOLUTION ====================

export class FusionContextResolver {
  private static fusionContext: FusionContext | null = null;
  private static contextCache = new Map<string, FusionContext>();

  /**
   * Resolve Fusion context with Bun Context integration
   * Uses global config resolution from lib/bun-context.ts
   */
  static async resolveContext(useCache = true): Promise<FusionContext> {
    const cacheKey = await generateContextHash({
      cwd: process.cwd(),
      env: process.env.NODE_ENV,
      timestamp: Math.floor(Date.now() / 60000), // Cache for 1 minute
    });

    if (useCache && this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    // Load global config via bun-context
    const globalConfig = await loadGlobalConfig();

    // Get OpenClaw profile if available
    const profileStatus = await gateway.getProfileStatus();
    const profileContext = profileStatus.profile?.context || {};

    // Determine environment
    const environment = this.determineEnvironment(globalConfig);

    // Build Fusion context
    const context: FusionContext = {
      environment,
      region: process.env.FUSION_REGION || profileContext.region as string,
      tenantId: process.env.FUSION_TENANT_ID || profileContext.tenantId as string,
      featureFlags: await this.loadFeatureFlags(globalConfig),
      contextHash: cacheKey,
      globalConfig: {
        ...globalConfig,
        // Mask sensitive values
        env: Object.fromEntries(
          Object.entries(globalConfig.env).map(([k, v]) => [
            k,
            k.includes('SECRET') || k.includes('KEY') || k.includes('PASS') || k.includes('TOKEN')
              ? '***'
              : v,
          ])
        ),
      },
    };

    if (useCache) {
      this.contextCache.set(cacheKey, context);
    }

    this.fusionContext = context;
    return context;
  }

  private static determineEnvironment(config: BunGlobalConfig): FusionContext['environment'] {
    const env = config.env.NODE_ENV || process.env.NODE_ENV;
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  private static async loadFeatureFlags(config: BunGlobalConfig): Promise<Record<string, boolean>> {
    // Load from environment or config
    const flags: Record<string, boolean> = {
      enableRedisCache: config.env.FUSION_ENABLE_REDIS === 'true',
      enableValidation: config.env.FUSION_ENABLE_VALIDATION !== 'false',
      enableMetrics: config.env.FUSION_ENABLE_METRICS === 'true',
      enableMultiTenant: config.env.FUSION_MULTI_TENANT === 'true',
    };

    // Try to load from bunfig.toml if available
    try {
      const bunfig = await import('../../bunfig.toml?type=toml');
      if (bunfig.default?.fusion?.features) {
        Object.assign(flags, bunfig.default.fusion.features);
      }
    } catch (err) {
      // bunfig.toml doesn't have fusion section
    }

    return flags;
  }

  static getCurrentContext(): FusionContext | null {
    return this.fusionContext;
  }

  static clearCache(): void {
    this.contextCache.clear();
    this.fusionContext = null;
  }
}

// ==================== CONTEXT-AWARE EXECUTION ====================

export class FusionContextExecutor {
  /**
   * Execute a function with full context resolution
   * Integrates with lib/bun-context.ts executeWithContext for subprocesses
   */
  static async executeWithContext<T>(
    operation: () => Promise<T> | T,
    options: {
      useCache?: boolean;
      timeoutMs?: number;
      retries?: number;
    } = {}
  ): Promise<ContextualExecutionResult<T>> {
    const startTime = performance.now();
    const context = await FusionContextResolver.resolveContext(options.useCache);

    let session: ContextSession | null = null;
    let data: T;
    let cached = false;

    try {
      // Execute operation
      if (options.timeoutMs) {
        data = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), options.timeoutMs)
          ),
        ]);
      } else {
        data = await operation();
      }

      // If we're executing a bun command, use the full context system
      if (typeof data === 'string' && data.startsWith('bun ')) {
        const args = data.split(' ').slice(1);
        session = await executeWithContext(args, { useCache: options.useCache });
        cached = true; // Potentially cached
      }
    } catch (error) {
      // Retry logic
      if (options.retries && options.retries > 0) {
        console.warn(c.yellow(`Operation failed, retrying... (${options.retries} attempts left)`));
        return this.executeWithContext(operation, {
          ...options,
          retries: options.retries - 1,
        });
      }
      throw error;
    }

    const durationMs = performance.now() - startTime;

    return {
      data,
      session,
      context,
      durationMs,
      cached,
    };
  }

  /**
   * Execute a database operation with context
   */
  static async executeDbWithContext<T>(
    db: FusionDatabase,
    operation: (db: FusionDatabase) => Promise<T> | T
  ): Promise<ContextualExecutionResult<T>> {
    return this.executeWithContext(async () => {
      const context = await FusionContextResolver.resolveContext();

      // Add context metadata to operation
      if (context.tenantId) {
        db.setTenantContext(context.tenantId);
      }

      return operation(db);
    });
  }
}

// ==================== TYPE IMPORTS ====================

// ==================== VALIDATION ENGINE ====================

interface ValidationError {
  field: string;
  value: unknown;
  expected: string;
  message: string;
}

interface AccountAgeData {
  tier?: string;
  label?: string;
  dayRange?: string;
  trustMultiplier?: number;
  riskLevel?: string;
  [key: string]: unknown;
}

interface BarberActionData {
  action?: string;
  barberId?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class SchemaValidator {
  static validateAccountAge(data: AccountAgeData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields
    const required = ['tier', 'label', 'dayRange', 'trustMultiplier', 'riskLevel'];
    for (const field of required) {
      if (data[field] === undefined) {
        errors.push({
          field,
          value: undefined,
          expected: 'required',
          message: `${field} is required`,
        });
      }
    }

    // Validate tier enum
    const validTiers: AccountAgeTier[] = ['new', 'recent', 'growing', 'established', 'veteran'];
    if (data.tier && !validTiers.includes(data.tier)) {
      errors.push({
        field: 'tier',
        value: data.tier,
        expected: validTiers.join('|'),
        message: 'Invalid tier',
      });
    }

    // Validate trustMultiplier range
    if (data.trustMultiplier !== undefined) {
      if (data.trustMultiplier < 0 || data.trustMultiplier > 1) {
        errors.push({
          field: 'trustMultiplier',
          value: data.trustMultiplier,
          expected: '0-1',
          message: 'trustMultiplier must be between 0 and 1',
        });
      }
    }

    // Validate dayRange tuple
    if (data.dayRange) {
      if (!Array.isArray(data.dayRange) || data.dayRange.length !== 2) {
        errors.push({
          field: 'dayRange',
          value: data.dayRange,
          expected: '[min, max]',
          message: 'dayRange must be a tuple [min, max]',
        });
      } else if (data.dayRange[0] < 0) {
        errors.push({
          field: 'dayRange[0]',
          value: data.dayRange[0],
          expected: '>= 0',
          message: 'min days must be >= 0',
        });
      } else if (data.dayRange[1] !== null && data.dayRange[1] <= data.dayRange[0]) {
        errors.push({
          field: 'dayRange',
          value: data.dayRange,
          expected: 'max > min',
          message: 'max days must be greater than min',
        });
      }
    }

    // Validate hex color pattern
    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      errors.push({
        field: 'color',
        value: data.color,
        expected: '#RRGGBB',
        message: 'Invalid hex color',
      });
    }

    // Warnings
    if (data.holdPeriodDays > 7) {
      warnings.push('holdPeriodDays > 7 may frustrate new customers');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateBarberAction(data: BarberActionData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const required = ['id', 'name', 'category', 'priority', 'timing', 'script'];
    for (const field of required) {
      if (!data[field]) {
        errors.push({
          field,
          value: data[field],
          expected: 'required',
          message: `${field} is required`,
        });
      }
    }

    // Validate priority enum
    const priorities = ['critical', 'high', 'medium', 'low', 'optional'];
    if (data.priority && !priorities.includes(data.priority)) {
      errors.push({
        field: 'priority',
        value: data.priority,
        expected: priorities.join('|'),
        message: 'Invalid priority',
      });
    }

    // Validate timing enum
    const timings = [
      'pre_service',
      'during_service',
      'post_service',
      'at_checkout',
      'follow_up',
      'ongoing',
    ];
    if (data.timing && !timings.includes(data.timing)) {
      errors.push({
        field: 'timing',
        value: data.timing,
        expected: timings.join('|'),
        message: 'Invalid timing',
      });
    }

    // Script should not be empty and reasonable length
    if (data.script) {
      if (data.script.length < 10) {
        warnings.push('Script seems very short - is it complete?');
      }
      if (data.script.length > 500) {
        warnings.push('Script is long - barbers may not memorize it');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ==================== SAMPLE DATA RECORDS ====================

export const SampleAccountAges: Record<AccountAgeTier, any> = {
  new: {
    tier: 'new',
    label: 'New Account',
    label_es: 'Cuenta Nueva',
    dayRange: [0, 7],
    trustMultiplier: 0.3,
    riskLevel: 'high',
    cashappDailyLimit: 250,
    cashappWeeklyLimit: 1000,
    instantDepositAvailable: false,
    holdPeriodDays: 3,
    badge: '🆕',
    altBadges: ['🔴', '⚠️'],
    color: '#ff6b6b',
    contrastText: '#ffffff',
  },
  recent: {
    tier: 'recent',
    label: 'Recent Account',
    label_es: 'Cuenta Reciente',
    dayRange: [8, 30],
    trustMultiplier: 0.5,
    riskLevel: 'medium',
    cashappDailyLimit: 500,
    cashappWeeklyLimit: 2500,
    instantDepositAvailable: true,
    instantDepositFee: 0.015,
    holdPeriodDays: 1,
    badge: '🌱',
    altBadges: ['🟡', '🔸'],
    color: '#ffd93d',
    contrastText: '#000000',
  },
  growing: {
    tier: 'growing',
    label: 'Growing Account',
    label_es: 'Cuenta en Crecimiento',
    dayRange: [31, 90],
    trustMultiplier: 0.7,
    riskLevel: 'low',
    cashappDailyLimit: 1000,
    cashappWeeklyLimit: 5000,
    instantDepositAvailable: true,
    instantDepositFee: 0.015,
    holdPeriodDays: 0,
    badge: '📈',
    altBadges: ['🟢', '🔹'],
    color: '#6bcf7f',
    contrastText: '#000000',
  },
  established: {
    tier: 'established',
    label: 'Established Account',
    label_es: 'Cuenta Establecida',
    dayRange: [91, 365],
    trustMultiplier: 0.9,
    riskLevel: 'minimal',
    cashappDailyLimit: 2500,
    cashappWeeklyLimit: 10000,
    instantDepositAvailable: true,
    instantDepositFee: 0,
    holdPeriodDays: 0,
    badge: '✅',
    altBadges: ['🔵', '💎'],
    color: '#4ecdc4',
    contrastText: '#000000',
  },
  veteran: {
    tier: 'veteran',
    label: 'Veteran Account',
    label_es: 'Cuenta Veterana',
    dayRange: [366, null],
    trustMultiplier: 1.0,
    riskLevel: 'minimal',
    cashappDailyLimit: 7500,
    cashappWeeklyLimit: 25000,
    instantDepositAvailable: true,
    instantDepositFee: 0,
    holdPeriodDays: 0,
    badge: '👑',
    altBadges: ['🟣', '⭐'],
    color: '#a78bfa',
    contrastText: '#ffffff',
    perks: ['Priority Support', 'Fee Waivers', 'Early Access'],
  },
};

export const SampleBarberActions = [
  {
    id: 'verify_new_account',
    name: 'Verify New Account Payment',
    category: 'verification',
    priority: 'critical',
    timing: 'at_checkout',
    durationSeconds: 30,
    script:
      'I see this is your first CashApp payment with us. Just making sure everything came through okay on your end?',
    purpose: 'Prevent fraud and ensure payment cleared',
    expectedOutcome: 'Payment confirmed or alternative offered',
    successMetric: 'Zero chargebacks on new accounts',
    successRate: 0.95,
    canAutomate: false,
    appliesTo: ['new', 'recent'],
    fusionTiers: ['casual', 'active', 'high_volume', 'whale'],
    commissionBonus: 0,
    requiresTraining: true,
    trainingVideo: 'https://training.barbershop.com/verify-payment',
    createdAt: '2024-01-15',
  },
  {
    id: 'book_next_appointment',
    name: 'Book Next Appointment',
    category: 'retention',
    priority: 'high',
    timing: 'post_service',
    durationSeconds: 60,
    script:
      "You're all set! Want to book your next appointment while you're here? I can text you the reminder.",
    purpose: 'Lock in return visit before customer leaves',
    expectedOutcome: 'Next appointment scheduled',
    successMetric: 'Rebooking rate > 70%',
    successRate: 0.68,
    canAutomate: true,
    appliesTo: ['new', 'recent', 'growing', 'established', 'veteran'],
    fusionTiers: ['casual', 'active'],
    commissionBonus: 5,
    requiresTraining: false,
    createdAt: '2024-01-10',
  },
  {
    id: 'suggest_products',
    name: 'Suggest Hair Products',
    category: 'upsell',
    priority: 'medium',
    timing: 'during_service',
    durationSeconds: 45,
    script:
      'I noticed your hair is a bit dry. This pomade I use would help - want me to show you how to apply it?',
    purpose: 'Increase average transaction value',
    expectedOutcome: 'Product purchased',
    successMetric: 'Product attachment rate > 30%',
    successRate: 0.42,
    canAutomate: false,
    appliesTo: ['growing', 'established', 'veteran'],
    fusionTiers: ['active', 'high_volume', 'whale'],
    commissionBonus: 15,
    requiresTraining: true,
    trainingVideo: 'https://training.barbershop.com/product-sales',
    productExamples: ['Pomade', 'Beard Oil', 'Shampoo'],
    createdAt: '2024-01-20',
  },
];

// ==================== UTILITY FUNCTIONS ====================

export class FusionUtils {
  static getAccountAgeFromDays(days: number): AccountAgeTier {
    if (days <= 7) return 'new';
    if (days <= 30) return 'recent';
    if (days <= 90) return 'growing';
    if (days <= 365) return 'established';
    return 'veteran';
  }

  static getDaysSince(date: Date | string): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  static getActionsFor(accountAge: AccountAgeTier, fusionTier: FusionTier): BarberAction[] {
    return SampleBarberActions.filter(
      action => action.appliesTo.includes(accountAge) && action.fusionTiers.includes(fusionTier)
    );
  }

  static calculateEffectiveRate(baseRate: number, accountAge: AccountAgeTier): number {
    const multipliers: Record<AccountAgeTier, number> = {
      new: 0.8,
      recent: 0.9,
      growing: 0.95,
      established: 1.0,
      veteran: 1.05,
    };
    return baseRate * multipliers[accountAge];
  }

  static formatMoney(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  static generateBadgeHTML(tier: AccountAgeTier): string {
    const data = SampleAccountAges[tier];
    return `<span class="badge" style="background: ${data.color}; color: ${data.contrastText}">${data.badge} ${data.label}</span>`;
  }

  /**
   * Get context-aware configuration value
   */
  static async getContextConfig<T>(key: string, defaultValue: T): Promise<T> {
    const context = await FusionContextResolver.resolveContext();
    const value = context.globalConfig?.env[key];
    return value !== undefined ? (value as unknown as T) : defaultValue;
  }
}

// ==================== DATABASE HELPERS ====================

export class FusionDatabase {
  private db: Database;
  private tenantId: string | null = null;

  constructor(path: string = ':memory:') {
    this.db = new Database(path);
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS account_ages (
        tier TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        label_es TEXT,
        day_min INTEGER NOT NULL,
        day_max INTEGER,
        trust_multiplier REAL NOT NULL,
        risk_level TEXT NOT NULL,
        cashapp_daily_limit INTEGER NOT NULL,
        cashapp_weekly_limit INTEGER NOT NULL,
        instant_deposit INTEGER NOT NULL,
        hold_period_days INTEGER NOT NULL,
        badge TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS barber_actions_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id TEXT NOT NULL,
        barber_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success INTEGER,
        notes TEXT
      )
    `);

    // Context-aware schema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS fusion_context_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        context_hash TEXT NOT NULL,
        environment TEXT NOT NULL,
        tenant_id TEXT,
        operation TEXT NOT NULL,
        duration_ms REAL,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.seed();
  }

  private seed() {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO account_ages 
      (tier, label, label_es, day_min, day_max, trust_multiplier, risk_level, 
       cashapp_daily_limit, cashapp_weekly_limit, instant_deposit, hold_period_days, badge, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [tier, data] of Object.entries(SampleAccountAges)) {
      stmt.run(
        tier,
        data.label,
        data.label_es,
        data.dayRange[0],
        data.dayRange[1],
        data.trustMultiplier,
        data.riskLevel,
        data.cashappDailyLimit,
        data.cashappWeeklyLimit,
        data.instantDepositAvailable ? 1 : 0,
        data.holdPeriodDays,
        data.badge,
        data.color
      );
    }
  }

  setTenantContext(tenantId: string): void {
    this.tenantId = tenantId;
  }

  getAccountAge(tier: AccountAgeTier) {
    return this.db.query('SELECT * FROM account_ages WHERE tier = ?').get(tier);
  }

  getAllAccountAges(): AccountAgeRecord[] {
    return this.db.query('SELECT * FROM account_ages ORDER BY day_min').all() as AccountAgeRecord[];
  }

  logAction(
    actionId: string,
    barberId: string,
    customerId: string,
    success: boolean,
    notes?: string
  ) {
    return this.db.run(
      'INSERT INTO barber_actions_log (action_id, barber_id, customer_id, success, notes) VALUES (?, ?, ?, ?, ?)',
      [actionId, barberId, customerId, success ? 1 : 0, notes || '']
    );
  }

  getActionStats(actionId: string, barberId?: string) {
    const sql = barberId
      ? 'SELECT COUNT(*) as total, SUM(success) as successes FROM barber_actions_log WHERE action_id = ? AND barber_id = ?'
      : 'SELECT COUNT(*) as total, SUM(success) as successes FROM barber_actions_log WHERE action_id = ?';
    const params = barberId ? [actionId, barberId] : [actionId];
    return this.db.query(sql).get(...params);
  }

  /**
   * Log context-aware operation
   */
  logContextOperation(contextHash: string, environment: string, operation: string, durationMs: number) {
    return this.db.run(
      'INSERT INTO fusion_context_logs (context_hash, environment, tenant_id, operation, duration_ms) VALUES (?, ?, ?, ?, ?)',
      [contextHash, environment, this.tenantId, operation, durationMs]
    );
  }

  getContextStats(contextHash?: string) {
    if (contextHash) {
      return this.db
        .query('SELECT * FROM fusion_context_logs WHERE context_hash = ? ORDER BY performed_at DESC')
        .all(contextHash);
    }
    return this.db.query('SELECT * FROM fusion_context_logs ORDER BY performed_at DESC LIMIT 100').all();
  }
}

// ==================== REDIS CACHE HELPERS ====================

export class FusionCache {
  static async cacheAccountAge(tier: AccountAgeTier, data: AccountAgeData, ttl: number = 3600) {
    await redis.setex(`fusion:account_age:${tier}`, ttl, JSON.stringify(data));
  }

  static async getAccountAge(tier: AccountAgeTier) {
    const data = await redis.get(`fusion:account_age:${tier}`);
    return data ? JSON.parse(data) : null;
  }

  static async cacheActionsFor(accountAge: AccountAgeTier, fusionTier: FusionTier, actions: BarberAction[]) {
    const key = `fusion:actions:${accountAge}:${fusionTier}`;
    await redis.setex(key, 1800, JSON.stringify(actions));
  }

  static async getCachedActions(accountAge: AccountAgeTier, fusionTier: FusionTier) {
    const key = `fusion:actions:${accountAge}:${fusionTier}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async invalidateActionCache(accountAge?: AccountAgeTier, fusionTier?: FusionTier) {
    if (accountAge && fusionTier) {
      await redis.del(`fusion:actions:${accountAge}:${fusionTier}`);
    } else if (accountAge) {
      const keys = await redis.keys(`fusion:actions:${accountAge}:*`);
      for (const key of keys) await redis.del(key);
    } else {
      const keys = await redis.keys('fusion:actions:*');
      for (const key of keys) await redis.del(key);
    }
  }

  /**
   * Cache with context awareness
   */
  static async cacheWithContext<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
    const context = await FusionContextResolver.resolveContext();
    const contextKey = `${key}:${context.contextHash}`;
    await redis.setex(contextKey, ttl, JSON.stringify({ data, context: context.contextHash }));
  }

  static async getWithContext<T>(key: string): Promise<T | null> {
    const context = await FusionContextResolver.resolveContext();
    const contextKey = `${key}:${context.contextHash}`;
    const cached = await redis.get(contextKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.data as T;
  }
}

// ==================== DEMO / TEST ====================

export async function runDemo() {
  console.log('🎯 OpenClaw Context Integration Demo\n');

  // Resolve Fusion context
  console.log('📍 Resolving Fusion Context...');
  const contextResult = await FusionContextExecutor.executeWithContext(async () => {
    return await FusionContextResolver.resolveContext();
  });

  console.log(`  Environment: ${contextResult.data.environment}`);
  console.log(`  Context Hash: ${contextResult.data.contextHash}`);
  console.log(`  Duration: ${contextResult.durationMs.toFixed(2)}ms`);
  console.log(`  Feature Flags:`, contextResult.data.featureFlags);
  console.log();

  // Validate account ages
  console.log('🔍 Validating Sample Data...\n');
  for (const [tier, data] of Object.entries(SampleAccountAges)) {
    const result = SchemaValidator.validateAccountAge(data);
    console.log(
      `${tier}: ${result.valid ? '✅' : '❌'} ${result.errors.length} errors, ${result.warnings.length} warnings`
    );
    if (result.errors.length > 0) {
      console.log('  Errors:', result.errors.map(e => e.message).join(', '));
    }
  }

  console.log('\n📊 Testing Utilities...\n');

  // Test utilities
  console.log('Account age for 5 days:', FusionUtils.getAccountAgeFromDays(5));
  console.log('Account age for 45 days:', FusionUtils.getAccountAgeFromDays(45));
  console.log('Account age for 400 days:', FusionUtils.getAccountAgeFromDays(400));

  console.log(
    '\nEffective rate for new account (60% base):',
    FusionUtils.calculateEffectiveRate(0.6, 'new')
  );
  console.log(
    'Effective rate for veteran (60% base):',
    FusionUtils.calculateEffectiveRate(0.6, 'veteran')
  );

  console.log(
    '\nActions for new + casual:',
    FusionUtils.getActionsFor('new', 'casual').map(a => a.id)
  );
  console.log(
    'Actions for veteran + whale:',
    FusionUtils.getActionsFor('veteran', 'whale').map(a => a.id)
  );

  // Test database with context
  console.log('\n💾 Testing Database with Context...\n');
  const db = new FusionDatabase();

  await FusionContextExecutor.executeDbWithContext(db, async (database) => {
    const allAges = database.getAllAccountAges();
    console.log('Account ages in DB:', allAges.map((a: AccountAgeRecord) => a.tier).join(', '));

    // Log context operation
    database.logContextOperation(
      contextResult.data.contextHash,
      contextResult.data.environment,
      'demo_query',
      1.5
    );

    const contextLogs = database.getContextStats();
    console.log('Context operations logged:', contextLogs.length);

    return allAges;
  });

  // Test caching (if Redis available)
  console.log('\n⚡ Testing Cache with Context...\n');
  await FusionCache.cacheWithContext('demo:test', { message: 'Hello from Fusion Context' });
  const cached = await FusionCache.getWithContext<{ message: string }>('demo:test');
  console.log('Cached data:', cached?.message || 'Not found');

  console.log('\n✅ Demo Complete!');
  console.log('\n📝 OpenClaw Integration:');
  console.log('  - Global config resolution via lib/bun-context.ts');
  console.log('  - Context-aware execution with caching');
  console.log('  - Profile integration from OpenClaw gateway');
  console.log('  - Context hash for cache invalidation');
}

// Run if executed directly
if (import.meta.main) {
  runDemo();
}

// Export types
export type { ValidationResult, ValidationError, FusionContext, ContextualExecutionResult };
