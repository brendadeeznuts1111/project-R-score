// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// lib/validation/cli-self-validation.ts — CLI tool self-validation with automatic error handling

// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
import {
  CLIToolValidator,
  URLValidator,
  ConstantValidator,
  AutoHealer,
} from './cli-constants-validation';

// ============================================================================
// SELF-VALIDATION INTERFACE
// ============================================================================

export interface SelfValidationConfig {
  toolName: string;
  args?: string[];
  env?: Record<string, string>;
  autoHeal?: boolean;
  requiredURLs?: string[];
  requiredConstants?: string[];
  onValidationError?: (errors: string[], fixes: string[]) => void;
  onValidationSuccess?: () => void;
}

// ============================================================================
// SELF-VALIDATION CLASS
// ============================================================================

export class CLISelfValidator {
  /**
   * Validate a CLI tool before execution
   */
  static async validateBeforeExecution(config: SelfValidationConfig): Promise<{
    canProceed: boolean;
    errors: string[];
    fixes: string[];
    healedIssues: string[];
  }> {
    const errors: string[] = [];
    const fixes: string[] = [];
    const healedIssues: string[] = [];

    // Validate the CLI tool itself
    const toolValidation = await CLIToolValidator.validateTool(
      config.toolName,
      config.args || [],
      config.env || Bun.env
    );

    if (!toolValidation.isValid) {
      errors.push(...toolValidation.errors);
      fixes.push(...toolValidation.fixes);

      // Attempt auto-healing if enabled
      if (config.autoHeal) {
        const healResult = await CLIToolValidator.autoFix(
          config.toolName,
          config.args || [],
          config.env || Bun.env
        );

        if (healResult.success) {
          healedIssues.push(...healResult.appliedFixes);

          // Re-validate after healing
          const revalidation = await CLIToolValidator.validateTool(
            config.toolName,
            healResult.fixedArgs,
            healResult.fixedEnv
          );

          if (revalidation.isValid) {
            // Clear previous errors if healing was successful
            errors.length = 0;
            fixes.length = 0;
          }
        }
      }
    }

    // Validate required URLs
    if (config.requiredURLs) {
      for (const urlName of config.requiredURLs) {
        const urlValidation = await URLValidator.validateURL(urlName);

        if (!urlValidation.isValid) {
          errors.push(`URL validation failed: ${urlName}`);
          fixes.push(...urlValidation.fixes);

          // Attempt auto-healing for URLs
          if (config.autoHeal) {
            const urlFixResult = await URLValidator.autoFix(urlName);
            if (urlFixResult.success) {
              healedIssues.push(...urlFixResult.appliedFixes);
            }
          }
        }
      }
    }

    // Validate required constants
    if (config.requiredConstants) {
      for (const constantName of config.requiredConstants) {
        const constantValidation = ConstantValidator.validateConstant(constantName);

        if (!constantValidation.isValid) {
          errors.push(`Constant validation failed: ${constantName}`);
          fixes.push(...constantValidation.fixes);

          // Constants are auto-fixed during validation
          if (constantValidation.fixedValue !== undefined) {
            healedIssues.push(...constantValidation.fixes);
          }
        }
      }
    }

    const canProceed = errors.length === 0;

    // Call callbacks
    if (!canProceed && config.onValidationError) {
      config.onValidationError(errors, fixes);
    } else if (canProceed && config.onValidationSuccess) {
      config.onValidationSuccess();
    }

    return {
      canProceed,
      errors,
      fixes,
      healedIssues,
    };
  }

  /**
   * Wrapper function for CLI tools to validate before execution
   */
  static async executeWithValidation<T>(
    config: SelfValidationConfig,
    executionFunction: () => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    errors: string[];
    fixes: string[];
    healedIssues: string[];
  }> {
    // Validate before execution
    const validation = await this.validateBeforeExecution(config);

    if (!validation.canProceed) {
      return {
        success: false,
        errors: validation.errors,
        fixes: validation.fixes,
        healedIssues: validation.healedIssues,
      };
    }

    // Execute the function
    try {
      const result = await executionFunction();
      return {
        success: true,
        result,
        errors: [],
        fixes: [],
        healedIssues: validation.healedIssues,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Execution failed: ${error}`],
        fixes: validation.fixes,
        healedIssues: validation.healedIssues,
      };
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick validation for simple CLI tools
 */
export async function quickValidate(
  toolName: string,
  args: string[] = [],
  autoHeal: boolean = true
): Promise<boolean> {
  const result = await CLISelfValidator.validateBeforeExecution({
    toolName,
    args,
    autoHeal,
  });

  return result.canProceed;
}

/**
 * Validate and report with console output
 */
export async function validateAndReport(
  toolName: string,
  args: string[] = [],
  autoHeal: boolean = true
): Promise<void> {
  console.info(`🔍 Validating ${toolName}...`);

  const result = await CLISelfValidator.validateBeforeExecution({
    toolName,
    args,
    autoHeal,
    onValidationError: (errors, fixes) => {
      console.info('❌ Validation failed:');
      errors.forEach(error => console.info(`   Error: ${error}`));
      if (autoHeal) {
        console.info('🔧 Auto-fixes applied:');
        fixes.forEach(fix => console.info(`   Fix: ${fix}`));
      }
    },
    onValidationSuccess: () => {
      console.info('✅ Validation passed!');
    },
  });

  if (result.healedIssues.length > 0) {
    console.info('🔧 Issues healed:');
    result.healedIssues.forEach(issue => console.info(`   ${issue}`));
  }

  if (!result.canProceed) {
    console.info('\n💡 To fix manually:');
    result.fixes.forEach(fix => console.info(`   ${fix}`));
    process.exit(1);
  }
}

// ============================================================================
// EXAMPLE USAGE DECORATOR
// ============================================================================

/**
 * Decorator for automatic validation of CLI functions
 */
export function validateCLI(config: Partial<SelfValidationConfig> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const toolName = config.toolName || propertyName;

      const validation = await CLISelfValidator.validateBeforeExecution({
        toolName,
        args,
        autoHeal: config.autoHeal ?? true,
        ...config,
      });

      if (!validation.canProceed) {
        console.error(`❌ Validation failed for ${toolName}:`);
        validation.errors.forEach(error => console.error(`  ${error}`));
        process.exit(1);
      }

      if (validation.healedIssues.length > 0) {
        console.info(`🔧 Auto-fixed issues for ${toolName}:`);
        validation.healedIssues.forEach(issue => console.info(`  ${issue}`));
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CLISelfValidator,
  quickValidate,
  validateAndReport,
  validateCLI,
};
