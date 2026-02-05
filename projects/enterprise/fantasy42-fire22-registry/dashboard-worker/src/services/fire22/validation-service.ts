/**
 * 🏈 Fire22 Validation Service
 * Comprehensive validation for Fire22 entities and operations
 */

import type {
  Fire22Customer,
  Fire22Agent,
  Fire22Transaction,
  Fire22Bet,
  CustomerTier,
  CustomerStatus,
  AgentType,
  AgentStatus,
  TransactionType,
  BetType,
  SportType,
} from '../../types/fire22/entities';
import { FIRE22_CONSTRAINTS, FIRE22_BUSINESS_RULES } from '../../types/fire22/entities';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number; // 0-100 validation score
}

export interface FieldValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean;
  dependencies?: string[]; // Fields that must be present for this validation
}

/**
 * Fire22 Validation Service
 * Provides comprehensive validation for all Fire22 entities and operations
 */
export class Fire22ValidationService {
  // !== CUSTOMER VALIDATION !==

  /**
   * Validate Fire22 customer entity
   */
  public static validateCustomer(customer: Partial<Fire22Customer>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Define validation rules
    const rules: Record<string, FieldValidationRule> = {
      fire22_customer_id: {
        required: true,
        minLength: FIRE22_CONSTRAINTS.CUSTOMER_ID_LENGTH.min,
        maxLength: FIRE22_CONSTRAINTS.CUSTOMER_ID_LENGTH.max,
        pattern: /^[A-Z0-9_]+$/,
      },
      agent_id: {
        required: true,
        minLength: FIRE22_CONSTRAINTS.AGENT_ID_LENGTH.min,
        maxLength: FIRE22_CONSTRAINTS.AGENT_ID_LENGTH.max,
      },
      login: {
        required: true,
        minLength: FIRE22_CONSTRAINTS.LOGIN_LENGTH.min,
        maxLength: FIRE22_CONSTRAINTS.LOGIN_LENGTH.max,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
      tier: {
        required: true,
        allowedValues: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'vip'],
      },
      status: {
        required: true,
        allowedValues: ['active', 'inactive', 'suspended', 'pending', 'banned', 'closed'],
      },
      balance: {
        required: true,
        min: 0,
      },
      risk_score: {
        required: true,
        min: FIRE22_CONSTRAINTS.RISK_SCORE.min,
        max: FIRE22_CONSTRAINTS.RISK_SCORE.max,
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      phone: {
        pattern: /^\+?[\d\s\-\(\)]{10,20}$/,
      },
    };

    // Apply validation rules
    for (const [field, rule] of Object.entries(rules)) {
      const value = customer[field as keyof Fire22Customer];
      const fieldErrors = this.validateField(field, value, rule);
      errors.push(...fieldErrors);
    }

    // Business logic validations
    this.validateCustomerBusinessRules(customer, errors, warnings);

    // Calculate validation score
    const score = this.calculateValidationScore(errors, warnings, Object.keys(rules).length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Apply customer-specific business rule validations
   */
  private static validateCustomerBusinessRules(
    customer: Partial<Fire22Customer>,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // VIP status consistency
    if (customer.vip_status && customer.tier && !['vip', 'diamond'].includes(customer.tier)) {
      warnings.push({
        field: 'vip_status',
        code: 'VIP_TIER_MISMATCH',
        message: 'VIP status should match tier (VIP/Diamond)',
        severity: 'warning',
      });
    }

    // Balance consistency
    if (customer.balance !== undefined && customer.balance < 0) {
      errors.push({
        field: 'balance',
        code: 'NEGATIVE_BALANCE',
        message: 'Balance cannot be negative',
        severity: 'error',
      });
    }

    // Lifetime volume consistency
    if (customer.total_deposits !== undefined && customer.total_withdrawals !== undefined) {
      if (customer.total_withdrawals > customer.total_deposits + (customer.balance || 0)) {
        warnings.push({
          field: 'total_withdrawals',
          code: 'WITHDRAWAL_EXCEEDS_DEPOSITS',
          message: 'Total withdrawals exceed deposits plus balance',
          severity: 'warning',
        });
      }
    }

    // Risk level vs score consistency
    if (customer.risk_score !== undefined && customer.risk_level) {
      const expectedLevel = this.calculateRiskLevelFromScore(customer.risk_score);
      if (expectedLevel !== customer.risk_level) {
        warnings.push({
          field: 'risk_level',
          code: 'RISK_LEVEL_MISMATCH',
          message: `Risk level should be ${expectedLevel} based on score ${customer.risk_score}`,
          severity: 'warning',
        });
      }
    }

    // KYC requirements
    if (customer.total_deposits !== undefined && customer.total_deposits > 2000) {
      if (customer.kyc_status !== 'approved') {
        warnings.push({
          field: 'kyc_status',
          code: 'KYC_REQUIRED',
          message: 'KYC approval required for customers with deposits over $2,000',
          severity: 'warning',
        });
      }
    }
  }

  // !== AGENT VALIDATION !==

  /**
   * Validate Fire22 agent entity
   */
  public static validateAgent(agent: Partial<Fire22Agent>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const rules: Record<string, FieldValidationRule> = {
      agent_id: {
        required: true,
        minLength: FIRE22_CONSTRAINTS.AGENT_ID_LENGTH.min,
        maxLength: FIRE22_CONSTRAINTS.AGENT_ID_LENGTH.max,
        pattern: /^[A-Z0-9_]+$/,
      },
      agent_login: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
      agent_name: {
        required: true,
        minLength: 2,
        maxLength: 100,
      },
      agent_type: {
        required: true,
        allowedValues: ['agent', 'sub_agent', 'master_agent', 'super_agent'],
      },
      status: {
        required: true,
        allowedValues: ['active', 'inactive', 'suspended', 'terminated'],
      },
      commission_rate: {
        required: true,
        min: FIRE22_CONSTRAINTS.COMMISSION_RATE.min,
        max: FIRE22_CONSTRAINTS.COMMISSION_RATE.max,
      },
      performance_score: {
        required: true,
        min: FIRE22_CONSTRAINTS.PERFORMANCE_SCORE.min,
        max: FIRE22_CONSTRAINTS.PERFORMANCE_SCORE.max,
      },
      level: {
        required: true,
        min: 1,
        max: 8,
      },
      max_bet_limit: {
        required: true,
        min: 0,
      },
      max_payout_limit: {
        required: true,
        min: 0,
      },
      contact_email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
    };

    // Apply validation rules
    for (const [field, rule] of Object.entries(rules)) {
      const value = agent[field as keyof Fire22Agent];
      const fieldErrors = this.validateField(field, value, rule);
      errors.push(...fieldErrors);
    }

    // Business logic validations
    this.validateAgentBusinessRules(agent, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings, Object.keys(rules).length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Apply agent-specific business rule validations
   */
  private static validateAgentBusinessRules(
    agent: Partial<Fire22Agent>,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Agent type vs level consistency
    if (agent.agent_type && agent.level !== undefined) {
      if (agent.agent_type === 'master_agent' && agent.level < 5) {
        errors.push({
          field: 'level',
          code: 'MASTER_AGENT_LEVEL',
          message: 'Master agents must be level 5 or higher',
          severity: 'error',
        });
      }

      if (agent.agent_type === 'super_agent' && agent.level < 7) {
        errors.push({
          field: 'level',
          code: 'SUPER_AGENT_LEVEL',
          message: 'Super agents must be level 7 or higher',
          severity: 'error',
        });
      }
    }

    // Commission rate reasonableness
    if (agent.commission_rate !== undefined) {
      if (agent.commission_rate > 0.2) {
        warnings.push({
          field: 'commission_rate',
          code: 'HIGH_COMMISSION',
          message: 'Commission rate above 20% is unusually high',
          severity: 'warning',
        });
      }
    }

    // Payout vs bet limit consistency
    if (agent.max_bet_limit !== undefined && agent.max_payout_limit !== undefined) {
      if (agent.max_payout_limit < agent.max_bet_limit * 2) {
        warnings.push({
          field: 'max_payout_limit',
          code: 'LOW_PAYOUT_LIMIT',
          message: 'Payout limit should typically be at least 2x bet limit',
          severity: 'warning',
        });
      }
    }

    // Performance score reasonableness
    if (agent.performance_score !== undefined && agent.status === 'active') {
      if (agent.performance_score < 30) {
        warnings.push({
          field: 'performance_score',
          code: 'LOW_PERFORMANCE',
          message: 'Active agent has very low performance score',
          severity: 'warning',
        });
      }
    }

    // Customer count vs volume consistency
    if (agent.total_customers !== undefined && agent.total_volume !== undefined) {
      if (agent.total_customers > 0 && agent.total_volume === 0) {
        warnings.push({
          field: 'total_volume',
          code: 'NO_VOLUME_WITH_CUSTOMERS',
          message: 'Agent has customers but no betting volume',
          severity: 'warning',
        });
      }
    }
  }

  // !== TRANSACTION VALIDATION !==

  /**
   * Validate Fire22 transaction
   */
  public static validateTransaction(transaction: Partial<Fire22Transaction>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const rules: Record<string, FieldValidationRule> = {
      transaction_id: {
        required: true,
        minLength: 5,
        maxLength: 50,
      },
      fire22_customer_id: {
        required: true,
      },
      agent_id: {
        required: true,
      },
      type: {
        required: true,
        allowedValues: [
          'deposit',
          'withdrawal',
          'bet_placement',
          'bet_settlement',
          'adjustment',
          'bonus',
          'freeplay',
          'commission',
          'transfer',
          'refund',
          'void',
        ],
      },
      status: {
        required: true,
        allowedValues: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'voided'],
      },
      amount: {
        required: true,
        min: 0.01,
      },
      currency: {
        required: true,
        allowedValues: ['USD', 'EUR', 'GBP', 'CAD'],
      },
    };

    // Apply validation rules
    for (const [field, rule] of Object.entries(rules)) {
      const value = transaction[field as keyof Fire22Transaction];
      const fieldErrors = this.validateField(field, value, rule);
      errors.push(...fieldErrors);
    }

    // Business logic validations
    this.validateTransactionBusinessRules(transaction, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings, Object.keys(rules).length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Apply transaction-specific business rule validations
   */
  private static validateTransactionBusinessRules(
    transaction: Partial<Fire22Transaction>,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Amount reasonableness checks
    if (transaction.amount !== undefined) {
      if (transaction.type === 'deposit' && transaction.amount > 100000) {
        warnings.push({
          field: 'amount',
          code: 'LARGE_DEPOSIT',
          message: 'Large deposit amount may require additional verification',
          severity: 'warning',
        });
      }

      if (transaction.type === 'withdrawal' && transaction.amount > 50000) {
        warnings.push({
          field: 'amount',
          code: 'LARGE_WITHDRAWAL',
          message: 'Large withdrawal amount may require additional approval',
          severity: 'warning',
        });
      }
    }

    // Status consistency
    if (transaction.status && transaction.processed_datetime) {
      if (transaction.status === 'pending' && transaction.processed_datetime) {
        errors.push({
          field: 'status',
          code: 'STATUS_DATETIME_MISMATCH',
          message: 'Pending transactions should not have processed datetime',
          severity: 'error',
        });
      }
    }

    // Balance after validation
    if (transaction.balance_after !== undefined && transaction.balance_after < 0) {
      if (transaction.type !== 'withdrawal') {
        errors.push({
          field: 'balance_after',
          code: 'NEGATIVE_BALANCE',
          message: 'Balance after transaction cannot be negative (except withdrawals)',
          severity: 'error',
        });
      }
    }
  }

  // !== BET VALIDATION !==

  /**
   * Validate Fire22 bet
   */
  public static validateBet(bet: Partial<Fire22Bet>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const rules: Record<string, FieldValidationRule> = {
      bet_id: {
        required: true,
        minLength: 5,
        maxLength: 50,
      },
      fire22_customer_id: {
        required: true,
      },
      agent_id: {
        required: true,
      },
      type: {
        required: true,
        allowedValues: ['straight', 'parlay', 'teaser', 'round_robin', 'prop', 'live', 'future'],
      },
      status: {
        required: true,
        allowedValues: ['pending', 'won', 'lost', 'push', 'voided', 'cancelled', 'graded'],
      },
      sport: {
        required: true,
        allowedValues: [
          'football',
          'basketball',
          'baseball',
          'hockey',
          'soccer',
          'tennis',
          'golf',
          'boxing',
          'mma',
          'horse_racing',
          'auto_racing',
          'esports',
          'other',
        ],
      },
      amount: {
        required: true,
        min: FIRE22_CONSTRAINTS.BET_AMOUNT.min,
        max: FIRE22_CONSTRAINTS.BET_AMOUNT.max,
      },
      odds: {
        required: true,
        min: -1000,
        max: 1000,
      },
    };

    // Apply validation rules
    for (const [field, rule] of Object.entries(rules)) {
      const value = bet[field as keyof Fire22Bet];
      const fieldErrors = this.validateField(field, value, rule);
      errors.push(...fieldErrors);
    }

    // Business logic validations
    this.validateBetBusinessRules(bet, errors, warnings);

    const score = this.calculateValidationScore(errors, warnings, Object.keys(rules).length);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Apply bet-specific business rule validations
   */
  private static validateBetBusinessRules(
    bet: Partial<Fire22Bet>,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Odds reasonableness
    if (bet.odds !== undefined) {
      if (Math.abs(bet.odds) > 500) {
        warnings.push({
          field: 'odds',
          code: 'EXTREME_ODDS',
          message: 'Odds values above ±500 are unusual',
          severity: 'warning',
        });
      }
    }

    // Payout calculation consistency
    if (bet.amount !== undefined && bet.potential_payout !== undefined && bet.odds !== undefined) {
      const expectedPayout = this.calculateExpectedPayout(bet.amount, bet.odds);
      const tolerance = 0.01; // $0.01 tolerance

      if (Math.abs(bet.potential_payout - expectedPayout) > tolerance) {
        errors.push({
          field: 'potential_payout',
          code: 'PAYOUT_CALCULATION_ERROR',
          message: `Potential payout should be approximately $${expectedPayout.toFixed(2)}`,
          severity: 'error',
        });
      }
    }

    // Status vs outcome consistency
    if (bet.status === 'won' && !bet.outcome) {
      warnings.push({
        field: 'outcome',
        code: 'MISSING_OUTCOME',
        message: 'Won bets should have outcome specified',
        severity: 'warning',
      });
    }

    // Live bet validation
    if (bet.is_live_bet && bet.type === 'future') {
      errors.push({
        field: 'type',
        code: 'LIVE_FUTURE_CONFLICT',
        message: 'Bets cannot be both live and future',
        severity: 'error',
      });
    }

    // Game date validation for futures
    if (bet.type === 'future' && bet.game_date) {
      const gameDate = new Date(bet.game_date);
      const now = new Date();
      const daysAhead = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysAhead < 1) {
        warnings.push({
          field: 'game_date',
          code: 'FUTURE_BET_DATE',
          message: 'Future bets should be for games at least 1 day ahead',
          severity: 'warning',
        });
      }
    }
  }

  // !== FIELD VALIDATION HELPERS !==

  /**
   * Validate individual field against rules
   */
  private static validateField(
    fieldName: string,
    value: any,
    rule: FieldValidationRule
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required field validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        code: 'REQUIRED',
        message: `${fieldName} is required`,
        severity: 'error',
      });
      return errors; // No point in further validation if required field is missing
    }

    // Skip validation if field is empty and not required
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // String length validation
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field: fieldName,
          code: 'MIN_LENGTH',
          message: `${fieldName} must be at least ${rule.minLength} characters`,
          severity: 'error',
        });
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          code: 'MAX_LENGTH',
          message: `${fieldName} must be no more than ${rule.maxLength} characters`,
          severity: 'error',
        });
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field: fieldName,
          code: 'INVALID_FORMAT',
          message: `${fieldName} format is invalid`,
          severity: 'error',
        });
      }
    }

    // Numeric value validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: fieldName,
          code: 'MIN_VALUE',
          message: `${fieldName} must be at least ${rule.min}`,
          severity: 'error',
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: fieldName,
          code: 'MAX_VALUE',
          message: `${fieldName} must be no more than ${rule.max}`,
          severity: 'error',
        });
      }
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push({
        field: fieldName,
        code: 'INVALID_VALUE',
        message: `${fieldName} must be one of: ${rule.allowedValues.join(', ')}`,
        severity: 'error',
      });
    }

    // Custom validator
    if (rule.customValidator && !rule.customValidator(value)) {
      errors.push({
        field: fieldName,
        code: 'CUSTOM_VALIDATION',
        message: `${fieldName} failed custom validation`,
        severity: 'error',
      });
    }

    return errors;
  }

  // !== UTILITY METHODS !==

  /**
   * Calculate risk level from score
   */
  private static calculateRiskLevelFromScore(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = FIRE22_BUSINESS_RULES.RISK_LEVEL_THRESHOLDS;

    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate expected payout from amount and odds
   */
  private static calculateExpectedPayout(amount: number, odds: number): number {
    if (odds > 0) {
      return amount + (amount * odds) / 100;
    } else {
      return amount + (amount * 100) / Math.abs(odds);
    }
  }

  /**
   * Calculate validation score (0-100)
   */
  private static calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationError[],
    totalFields: number
  ): number {
    const errorWeight = 10;
    const warningWeight = 3;

    const totalPenalty = errors.length * errorWeight + warnings.length * warningWeight;
    const maxPossiblePenalty = totalFields * errorWeight;

    const score = Math.max(0, 100 - (totalPenalty / maxPossiblePenalty) * 100);
    return Math.round(score);
  }

  /**
   * Batch validate multiple entities
   */
  public static validateBatch<T>(
    entities: T[],
    validatorFn: (entity: T) => ValidationResult
  ): {
    results: ValidationResult[];
    summary: { valid: number; invalid: number; avgScore: number };
  } {
    const results = entities.map(validatorFn);

    const valid = results.filter(r => r.isValid).length;
    const invalid = results.length - valid;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      results,
      summary: {
        valid,
        invalid,
        avgScore: Math.round(avgScore),
      },
    };
  }

  /**
   * Get validation summary
   */
  public static getValidationSummary(result: ValidationResult): string {
    const status = result.isValid ? '✅ Valid' : '❌ Invalid';
    const score = `Score: ${result.score}/100`;
    const issues = result.errors.length + result.warnings.length;
    const issueText = issues > 0 ? `(${issues} issues)` : '';

    return `${status} | ${score} ${issueText}`;
  }
}

export default Fire22ValidationService;
