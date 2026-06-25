#!/usr/bin/env bun

/**
 * L-Key to Telegram ID/Username Validation System
 *
 * Ensures data consistency between:
 * - Fire22 API L-keys and customer data
 * - Telegram user IDs and usernames
 * - EntityMapper customer mappings
 *
 * This validator checks for mismatches and provides fixing mechanisms
 * with comprehensive error handling and graceful failure recovery.
 */

import { LKeyMapper, EntityMapper, lKeyMapper, entityMapper } from '../utils/l-key-mapper';
import { Fire22Integration, Fire22Customer } from '../fire22-integration';
import { MultilingualTelegramBot } from '../telegram/multilingual-telegram-bot';
import {
  ValidationErrorCode,
  ValidationError,
  ValidationErrorFactory,
  ValidationErrorRecovery,
  createValidationError,
  isRecoverableError,
} from './error-codes';

export interface TelegramUserValidation {
  telegramId: string;
  username?: string;
  first_name: string;
  last_name?: string;
  // For validation purposes
  associatedLKey?: string;
  associatedCustomerId?: string;
  validationStatus: 'valid' | 'mismatch' | 'missing' | 'invalid';
  issues: string[];
}

export interface CustomerValidation {
  customerID: string;
  name: string;
  username?: string;
  telegramId?: string;
  lKey?: string;
  validationStatus: 'valid' | 'mismatch' | 'missing' | 'invalid';
  issues: string[];
}

export interface ValidationReport {
  timestamp: Date;
  totalCustomers: number;
  totalTelegramUsers: number;
  validMappings: number;
  mismatches: number;
  missing: number;
  invalid: number;

  customerValidations: CustomerValidation[];
  telegramValidations: TelegramUserValidation[];

  recommendations: string[];
  fixableIssues: number;
  criticalIssues: number;

  // Error tracking
  errors: ValidationError[];
  warnings: string[];
  recoveredErrors: number;
  fatalErrors: number;
}

export class LKeyTelegramValidator {
  private fire22Integration: Fire22Integration;
  private telegramBot: MultilingualTelegramBot;
  private lKeyMapper: LKeyMapper;
  private entityMapper: EntityMapper;
  private errorRecovery: ValidationErrorRecovery;
  private errors: ValidationError[] = [];
  private warnings: string[] = [];

  constructor(env: any) {
    try {
      this.fire22Integration = new Fire22Integration(env);
      this.telegramBot = new MultilingualTelegramBot();
      this.lKeyMapper = LKeyMapper.getInstance();
      this.entityMapper = new EntityMapper();
      this.errorRecovery = new ValidationErrorRecovery();
    } catch (error) {
      const validationError = createValidationError(
        ValidationErrorCode.SYSTEM_INITIALIZATION_FAILED,
        { originalError: error.message, env: env?.NODE_ENV || 'unknown' },
        `Failed to initialize L-Key Telegram Validator: ${error.message}`
      );
      this.errors.push(validationError);
      throw error;
    }
  }

  /**
   * Main validation function - validates entire system with graceful error handling
   */
  async validateLKeyTelegramConsistency(agentID?: string): Promise<ValidationReport> {
    // Reset error tracking
    this.errors = [];
    this.warnings = [];
    let recoveredErrors = 0;

    try {
      // Get Fire22 customer data with retry logic
      const customerData = await this.errorRecovery.executeWithRetry(
        () =>
          this.fire22Integration.getCustomersWithPermissions(
            agentID || 'BLAKEPPH',
            1,
            5000 // Get all customers
          ),
        ValidationErrorCode.FIRE22_API_UNAVAILABLE,
        `fetch_customers_${agentID || 'all'}`
      );

      const customers = customerData.customers;

      // Perform validations with error handling
      let customerValidations: CustomerValidation[] = [];
      let telegramValidations: TelegramUserValidation[] = [];

      try {
        customerValidations = await this.validateCustomers(customers);
      } catch (error) {
        const validationError = createValidationError(ValidationErrorCode.CUSTOMER_DATA_INVALID, {
          error: error.message,
          customerCount: customers.length,
        });
        this.errors.push(validationError);

        if (isRecoverableError(ValidationErrorCode.CUSTOMER_DATA_INVALID)) {
          console.warn('⚠️ Customer validation failed, attempting partial validation...');
          customerValidations = await this.validateCustomersPartial(customers);
          recoveredErrors++;
        }
      }

      try {
        telegramValidations = await this.validateTelegramUsers(customers);
      } catch (error) {
        const validationError = createValidationError(
          ValidationErrorCode.TELEGRAM_ID_INVALID_FORMAT,
          { error: error.message }
        );
        this.errors.push(validationError);

        if (isRecoverableError(ValidationErrorCode.TELEGRAM_ID_INVALID_FORMAT)) {
          console.warn('⚠️ Telegram validation failed, using fallback validation...');
          telegramValidations = await this.validateTelegramUsersPartial(customers);
          recoveredErrors++;
        }
      }

      // Generate report
      const report = this.generateValidationReport(
        customers,
        customerValidations,
        telegramValidations,
        recoveredErrors
      );

      return report;
    } catch (error) {
      console.error('❌ Validation failed with unrecoverable error:', error);

      const fatalError = createValidationError(ValidationErrorCode.UNKNOWN_ERROR, {
        originalError: error.message,
        stack: error.stack,
        agentID: agentID || 'all',
      });
      this.errors.push(fatalError);

      // Return partial report even on failure
      return this.generateEmptyReport(recoveredErrors, 1);
    }
  }

  /**
   * Validate customers with partial failure handling
   */
  private async validateCustomersPartial(
    customers: Fire22Customer[]
  ): Promise<CustomerValidation[]> {
    const validations: CustomerValidation[] = [];
    let processedCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        const validation = await this.validateSingleCustomer(customer);
        validations.push(validation);
        processedCount++;
      } catch (error) {
        errorCount++;
        this.warnings.push(`Failed to validate customer ${customer.customerID}: ${error.message}`);

        // Create a failed validation entry
        validations.push({
          customerID: customer.customerID,
          name: customer.name,
          username: customer.username,
          validationStatus: 'invalid',
          issues: [`Validation failed: ${error.message}`],
        });
      }
    }

    return validations;
  }

  /**
   * Validate Telegram users with partial failure handling
   */
  private async validateTelegramUsersPartial(
    customers: Fire22Customer[]
  ): Promise<TelegramUserValidation[]> {
    const validations: TelegramUserValidation[] = [];
    let processedCount = 0;
    let errorCount = 0;

    const telegramUsers = customers
      .filter(c => c.metadata?.telegramId || c.telegramId)
      .map(c => ({
        telegramId: (c.metadata?.telegramId || c.telegramId) as string,
        username: c.username,
        first_name: c.first_name || c.name.split(' ')[0] || 'Unknown',
        last_name: c.last_name || c.name.split(' ')[1],
        associatedCustomerId: c.customerID,
        associatedLKey: c.metadata?.lKey,
      }));

    for (const telegramUser of telegramUsers) {
      try {
        const validation = await this.validateSingleTelegramUser(telegramUser);
        validations.push(validation);
        processedCount++;
      } catch (error) {
        errorCount++;
        this.warnings.push(
          `Failed to validate Telegram user ${telegramUser.telegramId}: ${error.message}`
        );

        // Create a failed validation entry
        validations.push({
          telegramId: telegramUser.telegramId,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          validationStatus: 'invalid',
          issues: [`Validation failed: ${error.message}`],
        });
      }
    }

    return validations;
  }

  /**
   * Generate empty report for fatal failures
   */
  private generateEmptyReport(recoveredErrors: number, fatalErrors: number): ValidationReport {
    return {
      timestamp: new Date(),
      totalCustomers: 0,
      totalTelegramUsers: 0,
      validMappings: 0,
      mismatches: 0,
      missing: 0,
      invalid: 0,
      customerValidations: [],
      telegramValidations: [],
      recommendations: [
        'System validation failed - check logs for details',
        'Verify system configuration and dependencies',
        'Contact support if issues persist',
      ],
      fixableIssues: 0,
      criticalIssues: fatalErrors,
      errors: this.errors,
      warnings: this.warnings,
      recoveredErrors,
      fatalErrors,
    };
  }

  /**
   * Validate single customer with error handling
   */
  private async validateSingleCustomer(customer: Fire22Customer): Promise<CustomerValidation> {
    try {
      const validation: CustomerValidation = {
        customerID: customer.customerID,
        name: customer.name,
        username: customer.username,
        telegramId: customer.metadata?.telegramId || customer.telegramId,
        validationStatus: 'valid',
        issues: [],
      };

      // Validate customer ID format
      if (!this.validateCustomerIdFormat(customer.customerID)) {
        validation.validationStatus = 'invalid';
        validation.issues.push('Invalid customer ID format');
      }

      // Check if customer has L-key mapping
      const customerType = customer.metadata?.type || 'STANDARD_CUSTOMER';
      const expectedLKey = this.lKeyMapper.getLKey(customerType);

      if (!expectedLKey) {
        validation.validationStatus = 'missing';
        validation.issues.push(`No L-key found for customer type: ${customerType}`);
      } else {
        validation.lKey = expectedLKey;
      }

      // Validate username format
      if (customer.username && !this.validateUsernameFormat(customer.username)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid username format: ${customer.username}`);
      }

      // Check Telegram ID format
      if (validation.telegramId && !this.validateTelegramIdFormat(validation.telegramId)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid Telegram ID format: ${validation.telegramId}`);
      }

      // Check for missing critical data
      if (!customer.username && !validation.telegramId) {
        validation.validationStatus = 'missing';
        validation.issues.push('Missing both username and Telegram ID');
      }

      return validation;
    } catch (error) {
      throw new Error(`Customer validation failed: ${error.message}`);
    }
  }

  /**
   * Validate single Telegram user with error handling
   */
  private async validateSingleTelegramUser(telegramUser: any): Promise<TelegramUserValidation> {
    try {
      const validation: TelegramUserValidation = {
        telegramId: telegramUser.telegramId,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        associatedCustomerId: telegramUser.associatedCustomerId,
        associatedLKey: telegramUser.associatedLKey,
        validationStatus: 'valid',
        issues: [],
      };

      // Validate Telegram ID format
      if (!this.validateTelegramIdFormat(telegramUser.telegramId)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid Telegram ID format: ${telegramUser.telegramId}`);
      }

      // Check if L-key exists for associated customer
      if (!telegramUser.associatedLKey) {
        validation.validationStatus = 'missing';
        validation.issues.push('No L-key associated with this Telegram user');
      }

      // Validate username against Telegram ID consistency
      if (
        telegramUser.username &&
        !this.validateUsernameToIdConsistency(telegramUser.username, telegramUser.telegramId)
      ) {
        validation.validationStatus = 'mismatch';
        validation.issues.push('Username does not match expected format for Telegram ID');
      }

      // Check for name consistency
      if (!telegramUser.first_name || telegramUser.first_name === 'Unknown') {
        validation.validationStatus = 'missing';
        validation.issues.push('Missing or invalid first name');
      }

      return validation;
    } catch (error) {
      throw new Error(`Telegram user validation failed: ${error.message}`);
    }
  }

  /**
   * Validate customer data consistency
   */
  private async validateCustomers(customers: Fire22Customer[]): Promise<CustomerValidation[]> {
    const validations: CustomerValidation[] = [];

    for (const customer of customers) {
      const validation: CustomerValidation = {
        customerID: customer.customerID,
        name: customer.name,
        username: customer.username,
        telegramId: customer.metadata?.telegramId || customer.telegramId,
        validationStatus: 'valid',
        issues: [],
      };

      // Check if customer has L-key mapping
      const customerType = customer.metadata?.type || 'STANDARD_CUSTOMER';
      const expectedLKey = this.lKeyMapper.getLKey(customerType);

      if (!expectedLKey) {
        validation.validationStatus = 'missing';
        validation.issues.push(`No L-key found for customer type: ${customerType}`);
      } else {
        validation.lKey = expectedLKey;
      }

      // Validate username format
      if (customer.username && !this.validateUsernameFormat(customer.username)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid username format: ${customer.username}`);
      }

      // Check Telegram ID format
      if (validation.telegramId && !this.validateTelegramIdFormat(validation.telegramId)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid Telegram ID format: ${validation.telegramId}`);
      }

      // Check for missing critical data
      if (!customer.username && !validation.telegramId) {
        validation.validationStatus = 'missing';
        validation.issues.push('Missing both username and Telegram ID');
      }

      validations.push(validation);
    }

    return validations;
  }

  /**
   * Validate Telegram user data
   */
  private async validateTelegramUsers(
    customers: Fire22Customer[]
  ): Promise<TelegramUserValidation[]> {
    const validations: TelegramUserValidation[] = [];

    // Extract Telegram users from customer data
    const telegramUsers = customers
      .filter(c => c.metadata?.telegramId || c.telegramId)
      .map(c => ({
        telegramId: (c.metadata?.telegramId || c.telegramId) as string,
        username: c.username,
        first_name: c.first_name || c.name.split(' ')[0] || 'Unknown',
        last_name: c.last_name || c.name.split(' ')[1],
        associatedCustomerId: c.customerID,
        associatedLKey: c.metadata?.lKey,
      }));

    for (const telegramUser of telegramUsers) {
      const validation: TelegramUserValidation = {
        telegramId: telegramUser.telegramId,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        associatedCustomerId: telegramUser.associatedCustomerId,
        associatedLKey: telegramUser.associatedLKey,
        validationStatus: 'valid',
        issues: [],
      };

      // Validate Telegram ID format
      if (!this.validateTelegramIdFormat(telegramUser.telegramId)) {
        validation.validationStatus = 'invalid';
        validation.issues.push(`Invalid Telegram ID format: ${telegramUser.telegramId}`);
      }

      // Check if L-key exists for associated customer
      if (!telegramUser.associatedLKey) {
        validation.validationStatus = 'missing';
        validation.issues.push('No L-key associated with this Telegram user');
      }

      // Validate username against Telegram ID consistency
      if (
        telegramUser.username &&
        !this.validateUsernameToIdConsistency(telegramUser.username, telegramUser.telegramId)
      ) {
        validation.validationStatus = 'mismatch';
        validation.issues.push('Username does not match expected format for Telegram ID');
      }

      // Check for name consistency
      if (!telegramUser.first_name || telegramUser.first_name === 'Unknown') {
        validation.validationStatus = 'missing';
        validation.issues.push('Missing or invalid first name');
      }

      validations.push(validation);
    }

    return validations;
  }

  /**
   * Generate comprehensive validation report with error tracking
   */
  private generateValidationReport(
    customers: Fire22Customer[],
    customerValidations: CustomerValidation[],
    telegramValidations: TelegramUserValidation[],
    recoveredErrors: number = 0
  ): ValidationReport {
    const timestamp = new Date();

    // Count statistics
    const validCustomers = customerValidations.filter(c => c.validationStatus === 'valid').length;
    const validTelegram = telegramValidations.filter(t => t.validationStatus === 'valid').length;

    const mismatches = [
      ...customerValidations.filter(c => c.validationStatus === 'mismatch'),
      ...telegramValidations.filter(t => t.validationStatus === 'mismatch'),
    ].length;

    const missing = [
      ...customerValidations.filter(c => c.validationStatus === 'missing'),
      ...telegramValidations.filter(t => t.validationStatus === 'missing'),
    ].length;

    const invalid = [
      ...customerValidations.filter(c => c.validationStatus === 'invalid'),
      ...telegramValidations.filter(t => t.validationStatus === 'invalid'),
    ].length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(customerValidations, telegramValidations);

    const fatalErrors = this.errors.filter(e => !isRecoverableError(e.code)).length;

    const report: ValidationReport = {
      timestamp,
      totalCustomers: customers.length,
      totalTelegramUsers: telegramValidations.length,
      validMappings: validCustomers + validTelegram,
      mismatches,
      missing,
      invalid,
      customerValidations,
      telegramValidations,
      recommendations,
      fixableIssues: this.countFixableIssues(customerValidations, telegramValidations),
      criticalIssues: this.countCriticalIssues(customerValidations, telegramValidations),
      errors: this.errors,
      warnings: this.warnings,
      recoveredErrors,
      fatalErrors,
    };

    return report;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    customerValidations: CustomerValidation[],
    telegramValidations: TelegramUserValidation[]
  ): string[] {
    const recommendations: string[] = [];

    const missingLKeys = customerValidations.filter(c =>
      c.issues.some(issue => issue.includes('No L-key found'))
    ).length;

    const invalidTelegramIds = telegramValidations.filter(t =>
      t.issues.some(issue => issue.includes('Invalid Telegram ID format'))
    ).length;

    const missingUsernames = customerValidations.filter(c =>
      c.issues.some(issue => issue.includes('Missing both username'))
    ).length;

    if (missingLKeys > 0) {
      recommendations.push(
        `🔧 Generate L-keys for ${missingLKeys} customers without proper mappings`
      );
    }

    if (invalidTelegramIds > 0) {
      recommendations.push(`🔧 Fix ${invalidTelegramIds} invalid Telegram ID formats`);
    }

    if (missingUsernames > 0) {
      recommendations.push(`🔧 Add username or Telegram ID for ${missingUsernames} customers`);
    }

    recommendations.push('📊 Run this validation periodically to maintain data consistency');

    recommendations.push('🔄 Consider implementing real-time validation on customer creation');

    return recommendations;
  }

  /**
   * Auto-fix identified issues where possible
   */
  async autoFixIssues(report: ValidationReport): Promise<{
    fixed: number;
    failed: number;
    results: Array<{ type: string; success: boolean; details: string }>;
  }> {
    const results: Array<{ type: string; success: boolean; details: string }> = [];
    let fixed = 0;
    let failed = 0;

    // Fix missing L-keys
    for (const customer of report.customerValidations) {
      if (customer.issues.some(issue => issue.includes('No L-key found'))) {
        try {
          // Generate new L-key for customer
          const customerType = 'STANDARD_CUSTOMER'; // Default type
          const newLKey = this.lKeyMapper.generateNextLKey('CUSTOMERS');

          // Map the customer with new L-key
          const mappedCustomer = this.entityMapper.mapCustomer({
            id: customer.customerID,
            type: customerType as any,
            username: customer.username || `user_${customer.customerID.toLowerCase()}`,
            telegramId: customer.telegramId || `tg_${customer.customerID}`,
            serviceTier: 1,
          });

          results.push({
            type: 'missing_lkey',
            success: true,
            details: `Generated L-key ${mappedCustomer.lKey} for customer ${customer.customerID}`,
          });

          fixed++;
        } catch (error) {
          results.push({
            type: 'missing_lkey',
            success: false,
            details: `Failed to generate L-key for customer ${customer.customerID}: ${error.message}`,
          });
          failed++;
        }
      }
    }

    // Fix invalid username formats
    for (const customer of report.customerValidations) {
      if (customer.issues.some(issue => issue.includes('Invalid username format'))) {
        try {
          const sanitizedUsername = this.sanitizeUsername(customer.username || customer.customerID);

          results.push({
            type: 'invalid_username',
            success: true,
            details: `Sanitized username from '${customer.username}' to '${sanitizedUsername}' for customer ${customer.customerID}`,
          });

          fixed++;
        } catch (error) {
          results.push({
            type: 'invalid_username',
            success: false,
            details: `Failed to sanitize username for customer ${customer.customerID}: ${error.message}`,
          });
          failed++;
        }
      }
    }

    return { fixed, failed, results };
  }

  /**
   * Validation helper methods
   */
  private validateCustomerIdFormat(customerId: string): boolean {
    // Customer ID should follow AL### format
    return /^AL\d{3,6}$/.test(customerId);
  }

  private validateUsernameFormat(username: string): boolean {
    // Username should be alphanumeric with underscores, 3-32 characters
    return /^[a-zA-Z0-9_]{3,32}$/.test(username);
  }

  private validateTelegramIdFormat(telegramId: string): boolean {
    // Telegram ID should be numeric string, typically 9-10 digits
    return /^\d{9,10}$/.test(telegramId);
  }

  private validateUsernameToIdConsistency(username: string, telegramId: string): boolean {
    // For now, just check if both exist and are valid formats
    return this.validateUsernameFormat(username) && this.validateTelegramIdFormat(telegramId);
  }

  private sanitizeUsername(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .substring(0, 32);
  }

  private countFixableIssues(
    customerValidations: CustomerValidation[],
    telegramValidations: TelegramUserValidation[]
  ): number {
    const fixableCustomerIssues = customerValidations.filter(c =>
      c.issues.some(
        issue => issue.includes('No L-key found') || issue.includes('Invalid username format')
      )
    ).length;

    const fixableTelegramIssues = telegramValidations.filter(t =>
      t.issues.some(issue => issue.includes('Missing or invalid first name'))
    ).length;

    return fixableCustomerIssues + fixableTelegramIssues;
  }

  private countCriticalIssues(
    customerValidations: CustomerValidation[],
    telegramValidations: TelegramUserValidation[]
  ): number {
    const criticalCustomerIssues = customerValidations.filter(c =>
      c.issues.some(
        issue =>
          issue.includes('Missing both username') || issue.includes('Invalid Telegram ID format')
      )
    ).length;

    const criticalTelegramIssues = telegramValidations.filter(t =>
      t.issues.some(
        issue =>
          issue.includes('Invalid Telegram ID format') || issue.includes('Username does not match')
      )
    ).length;

    return criticalCustomerIssues + criticalTelegramIssues;
  }

  /**
   * Export validation report to JSON
   */
  exportReport(report: ValidationReport, filePath?: string): string {
    const jsonReport = JSON.stringify(report, null, 2);

    if (filePath) {
      // In a real implementation, this would write to file
    }

    return jsonReport;
  }

  /**
   * Generate summary of validation results
   */
  generateSummary(report: ValidationReport): string {
    const successRate = (
      (report.validMappings / (report.totalCustomers + report.totalTelegramUsers)) *
      100
    ).toFixed(1);

    return `
🔍 L-Key to Telegram Validation Summary
!==!==!==!==!==!==!==!==

📊 Overview:
- Total Customers: ${report.totalCustomers}
- Total Telegram Users: ${report.totalTelegramUsers}
- Valid Mappings: ${report.validMappings}
- Success Rate: ${successRate}%

❌ Issues Found:
- Mismatches: ${report.mismatches}
- Missing Data: ${report.missing}  
- Invalid Formats: ${report.invalid}

🔧 Fixable Issues: ${report.fixableIssues}
🚨 Critical Issues: ${report.criticalIssues}

💡 Recommendations:
${report.recommendations.map(r => `- ${r}`).join('\n')}

⏰ Generated: ${report.timestamp.toISOString()}
!==!==!==!==!==!==!==!==`;
  }
}

// Export validation functions for use in other modules
export const validateLKeyTelegramConsistency = async (env: any, agentID?: string) => {
  const validator = new LKeyTelegramValidator(env);
  return await validator.validateLKeyTelegramConsistency(agentID);
};

export const autoFixValidationIssues = async (env: any, report: ValidationReport) => {
  const validator = new LKeyTelegramValidator(env);
  return await validator.autoFixIssues(report);
};

export default LKeyTelegramValidator;
