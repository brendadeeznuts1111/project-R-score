/**
 * 🏈 Fire22 Services Export
 * Centralized exports for all Fire22 business services
 */

// Core services
export { Fire22BusinessLogic } from './business-logic';
export { Fire22ValidationService } from './validation-service';

// Service types and interfaces
export type {
  ValidationResult,
  BusinessRuleResult,
  TierUpgradeResult,
  RiskAssessmentResult,
} from './business-logic';

export type { ValidationError, FieldValidationRule } from './validation-service';

// Service instances (if needed as singletons)
export const businessLogic = Fire22BusinessLogic;
export const validationService = Fire22ValidationService;
