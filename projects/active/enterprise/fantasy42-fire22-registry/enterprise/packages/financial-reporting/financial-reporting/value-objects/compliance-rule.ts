/**
 * Compliance Rule Value Object
 * Domain-Driven Design Implementation
 *
 * Represents compliance rules and validation criteria
 */

import { DomainError } from '../../shared/domain-entity';

export enum ComplianceRuleType {
  THRESHOLD = 'threshold',
  PATTERN = 'pattern',
  REQUIREMENT = 'requirement',
  VALIDATION = 'validation',
  AUDIT = 'audit',
}

export enum ComplianceSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ComplianceCategory {
  FINANCIAL = 'financial',
  REGULATORY = 'regulatory',
  SECURITY = 'security',
  OPERATIONAL = 'operational',
  LEGAL = 'legal',
}

export class ComplianceRule {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _description: string;
  private readonly _ruleType: ComplianceRuleType;
  private readonly _category: ComplianceCategory;
  private readonly _severity: ComplianceSeverity;
  private readonly _isActive: boolean;
  private readonly _effectiveDate: Date;
  private readonly _expiryDate?: Date;
  private readonly _jurisdiction: string;
  private readonly _parameters: Record<string, any>;
  private readonly _validationLogic: string;
  private readonly _remediationSteps: string[];
  private readonly _metadata: Record<string, any>;

  constructor(params: ComplianceRuleParams) {
    this.validateParams(params);

    this._id = params.id;
    this._name = params.name;
    this._description = params.description;
    this._ruleType = params.ruleType;
    this._category = params.category;
    this._severity = params.severity;
    this._isActive = params.isActive ?? true;
    this._effectiveDate = new Date(params.effectiveDate);
    this._expiryDate = params.expiryDate ? new Date(params.expiryDate) : undefined;
    this._jurisdiction = params.jurisdiction;
    this._parameters = { ...params.parameters };
    this._validationLogic = params.validationLogic;
    this._remediationSteps = [...params.remediationSteps];
    this._metadata = { ...params.metadata };
  }

  // Getters
  getId(): string {
    return this._id;
  }
  getName(): string {
    return this._name;
  }
  getDescription(): string {
    return this._description;
  }
  getRuleType(): ComplianceRuleType {
    return this._ruleType;
  }
  getCategory(): ComplianceCategory {
    return this._category;
  }
  getSeverity(): ComplianceSeverity {
    return this._severity;
  }
  getIsActive(): boolean {
    return this._isActive;
  }
  getEffectiveDate(): Date {
    return new Date(this._effectiveDate);
  }
  getExpiryDate(): Date | undefined {
    return this._expiryDate ? new Date(this._expiryDate) : undefined;
  }
  getJurisdiction(): string {
    return this._jurisdiction;
  }
  getParameters(): Record<string, any> {
    return { ...this._parameters };
  }
  getValidationLogic(): string {
    return this._validationLogic;
  }
  getRemediationSteps(): string[] {
    return [...this._remediationSteps];
  }
  getMetadata(): Record<string, any> {
    return { ...this._metadata };
  }

  // Business Logic Methods
  isEffective(date?: Date): boolean {
    const checkDate = date || new Date();
    const isAfterEffective = checkDate >= this._effectiveDate;
    const isBeforeExpiry = !this._expiryDate || checkDate <= this._expiryDate;
    return isAfterEffective && isBeforeExpiry && this._isActive;
  }

  isExpired(): boolean {
    if (!this._expiryDate) return false;
    return new Date() > this._expiryDate;
  }

  validateData(data: Record<string, any>): ComplianceValidationResult {
    try {
      // This would contain the actual validation logic
      // For now, we'll simulate validation based on rule type
      const result = this.performValidation(data);

      return {
        ruleId: this._id,
        isValid: result.isValid,
        violations: result.violations,
        recommendations: result.recommendations,
        validatedAt: new Date(),
        severity: this._severity,
      };
    } catch (error) {
      return {
        ruleId: this._id,
        isValid: false,
        violations: [
          {
            field: 'validation_error',
            message: `Validation failed: ${error.message}`,
            severity: this._severity,
          },
        ],
        recommendations: ['Review validation logic and data format'],
        validatedAt: new Date(),
        severity: this._severity,
      };
    }
  }

  getApplicableDataFields(): string[] {
    // Extract field names from validation logic or parameters
    const fields: string[] = [];

    // Simple extraction from parameters
    Object.keys(this._parameters).forEach(key => {
      if (key.includes('field') || key.includes('Field')) {
        const fieldValue = this._parameters[key];
        if (typeof fieldValue === 'string') {
          fields.push(fieldValue);
        }
      }
    });

    return fields;
  }

  // Utility Methods
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      ruleType: this._ruleType,
      category: this._category,
      severity: this._severity,
      isActive: this._isActive,
      effectiveDate: this._effectiveDate.toISOString(),
      expiryDate: this._expiryDate?.toISOString(),
      jurisdiction: this._jurisdiction,
      parameters: this._parameters,
      validationLogic: this._validationLogic,
      remediationSteps: this._remediationSteps,
      metadata: this._metadata,
      isEffective: this.isEffective(),
      isExpired: this.isExpired(),
    };
  }

  equals(other: ComplianceRule): boolean {
    return this._id === other._id;
  }

  private validateParams(params: ComplianceRuleParams): void {
    if (!params.id || typeof params.id !== 'string') {
      throw new DomainError('Rule ID is required and must be a string', 'INVALID_RULE_ID');
    }

    if (!params.name || typeof params.name !== 'string') {
      throw new DomainError('Rule name is required', 'INVALID_RULE_NAME');
    }

    if (!params.ruleType || !Object.values(ComplianceRuleType).includes(params.ruleType)) {
      throw new DomainError('Valid rule type is required', 'INVALID_RULE_TYPE');
    }

    if (!params.category || !Object.values(ComplianceCategory).includes(params.category)) {
      throw new DomainError('Valid category is required', 'INVALID_CATEGORY');
    }

    if (!params.severity || !Object.values(ComplianceSeverity).includes(params.severity)) {
      throw new DomainError('Valid severity is required', 'INVALID_SEVERITY');
    }

    if (!params.effectiveDate) {
      throw new DomainError('Effective date is required', 'INVALID_EFFECTIVE_DATE');
    }

    if (!params.jurisdiction || typeof params.jurisdiction !== 'string') {
      throw new DomainError('Jurisdiction is required', 'INVALID_JURISDICTION');
    }

    if (!params.validationLogic || typeof params.validationLogic !== 'string') {
      throw new DomainError('Validation logic is required', 'INVALID_VALIDATION_LOGIC');
    }

    if (!params.remediationSteps || !Array.isArray(params.remediationSteps)) {
      throw new DomainError('Remediation steps must be an array', 'INVALID_REMEDIATION_STEPS');
    }
  }

  private performValidation(data: Record<string, any>): {
    isValid: boolean;
    violations: Array<{
      field: string;
      message: string;
      severity: ComplianceSeverity;
    }>;
    recommendations: string[];
  } {
    const violations: Array<{
      field: string;
      message: string;
      severity: ComplianceSeverity;
    }> = [];
    const recommendations: string[] = [];

    // Threshold validation
    if (this._ruleType === ComplianceRuleType.THRESHOLD) {
      const threshold = this._parameters.threshold;
      const field = this._parameters.field;
      const operator = this._parameters.operator || 'greater_than';

      if (data[field] !== undefined) {
        const value = data[field];
        let isValid = false;

        switch (operator) {
          case 'greater_than':
            isValid = value > threshold;
            break;
          case 'less_than':
            isValid = value < threshold;
            break;
          case 'equal':
            isValid = value === threshold;
            break;
          case 'not_equal':
            isValid = value !== threshold;
            break;
        }

        if (!isValid) {
          violations.push({
            field,
            message: `${field} ${operator.replace('_', ' ')} ${threshold} (current: ${value})`,
            severity: this._severity,
          });
          recommendations.push(...this._remediationSteps);
        }
      }
    }

    // Pattern validation
    else if (this._ruleType === ComplianceRuleType.PATTERN) {
      const pattern = this._parameters.pattern;
      const field = this._parameters.field;

      if (data[field] !== undefined) {
        const regex = new RegExp(pattern);
        if (!regex.test(String(data[field]))) {
          violations.push({
            field,
            message: `${field} does not match required pattern`,
            severity: this._severity,
          });
          recommendations.push(...this._remediationSteps);
        }
      }
    }

    // Requirement validation
    else if (this._ruleType === ComplianceRuleType.REQUIREMENT) {
      const requiredFields = this._parameters.requiredFields || [];

      for (const field of requiredFields) {
        if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
          violations.push({
            field,
            message: `${field} is required but missing or empty`,
            severity: this._severity,
          });
        }
      }

      if (violations.length > 0) {
        recommendations.push(...this._remediationSteps);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations,
    };
  }
}

// Factory for creating compliance rules
export class ComplianceRuleFactory {
  static create(params: ComplianceRuleParams): ComplianceRule {
    return new ComplianceRule(params);
  }

  static createThresholdRule(params: {
    id: string;
    name: string;
    description: string;
    field: string;
    threshold: number;
    operator?: 'greater_than' | 'less_than' | 'equal' | 'not_equal';
    severity?: ComplianceSeverity;
    category?: ComplianceCategory;
    jurisdiction?: string;
    effectiveDate?: Date;
    remediationSteps?: string[];
  }): ComplianceRule {
    return new ComplianceRule({
      id: params.id,
      name: params.name,
      description: params.description,
      ruleType: ComplianceRuleType.THRESHOLD,
      category: params.category || ComplianceCategory.FINANCIAL,
      severity: params.severity || ComplianceSeverity.MEDIUM,
      effectiveDate: params.effectiveDate || new Date(),
      jurisdiction: params.jurisdiction || 'global',
      parameters: {
        field: params.field,
        threshold: params.threshold,
        operator: params.operator || 'greater_than',
      },
      validationLogic: `Validate ${params.field} ${params.operator || 'greater_than'} ${params.threshold}`,
      remediationSteps: params.remediationSteps || [
        `Adjust ${params.field} to meet threshold requirement`,
        'Review business processes to prevent threshold violations',
      ],
      metadata: {},
    });
  }

  static createPatternRule(params: {
    id: string;
    name: string;
    description: string;
    field: string;
    pattern: string;
    severity?: ComplianceSeverity;
    category?: ComplianceCategory;
    jurisdiction?: string;
    effectiveDate?: Date;
    remediationSteps?: string[];
  }): ComplianceRule {
    return new ComplianceRule({
      id: params.id,
      name: params.name,
      description: params.description,
      ruleType: ComplianceRuleType.PATTERN,
      category: params.category || ComplianceCategory.OPERATIONAL,
      severity: params.severity || ComplianceSeverity.MEDIUM,
      effectiveDate: params.effectiveDate || new Date(),
      jurisdiction: params.jurisdiction || 'global',
      parameters: {
        field: params.field,
        pattern: params.pattern,
      },
      validationLogic: `Validate ${params.field} matches pattern ${params.pattern}`,
      remediationSteps: params.remediationSteps || [
        `Ensure ${params.field} follows the required format`,
        'Update data entry processes to enforce pattern compliance',
      ],
      metadata: {},
    });
  }

  static createRequirementRule(params: {
    id: string;
    name: string;
    description: string;
    requiredFields: string[];
    severity?: ComplianceSeverity;
    category?: ComplianceCategory;
    jurisdiction?: string;
    effectiveDate?: Date;
    remediationSteps?: string[];
  }): ComplianceRule {
    return new ComplianceRule({
      id: params.id,
      name: params.name,
      description: params.description,
      ruleType: ComplianceRuleType.REQUIREMENT,
      category: params.category || ComplianceCategory.OPERATIONAL,
      severity: params.severity || ComplianceSeverity.HIGH,
      effectiveDate: params.effectiveDate || new Date(),
      jurisdiction: params.jurisdiction || 'global',
      parameters: {
        requiredFields: params.requiredFields,
      },
      validationLogic: `Validate all required fields are present: ${params.requiredFields.join(', ')}`,
      remediationSteps: params.remediationSteps || [
        'Complete all required fields',
        'Update data collection processes to ensure completeness',
      ],
      metadata: {},
    });
  }
}

export interface ComplianceRuleParams {
  id: string;
  name: string;
  description: string;
  ruleType: ComplianceRuleType;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  isActive?: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  jurisdiction: string;
  parameters: Record<string, any>;
  validationLogic: string;
  remediationSteps: string[];
  metadata?: Record<string, any>;
}

export interface ComplianceValidationResult {
  ruleId: string;
  isValid: boolean;
  violations: Array<{
    field: string;
    message: string;
    severity: ComplianceSeverity;
  }>;
  recommendations: string[];
  validatedAt: Date;
  severity: ComplianceSeverity;
}
