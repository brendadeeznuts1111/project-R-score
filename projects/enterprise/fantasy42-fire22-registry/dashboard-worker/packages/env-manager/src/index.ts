// Fire22 Environment Manager - Main Entry Point
export interface EnvironmentConfig {
  environment: string;
  envFiles: Record<string, string>;
  envValidation: {
    required: string[];
    optional: string[];
    secrets: string[];
  };
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
  timestamp: string;
}

export interface SecurityAuditResult {
  success: boolean;
  score: number;
  issues: Array<{
    type: 'weak_secret' | 'default_value' | 'exposed_pattern' | 'missing_required';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    variable?: string;
    recommendation: string;
  }>;
  timestamp: string;
}

export interface PerformanceMetrics {
  accessTime: number;
  operationsPerSecond: number;
  memoryUsage: number;
  timestamp: string;
}

export class EnvironmentManager {
  private config: EnvironmentConfig;
  private validationCache = new Map<string, ValidationResult>();
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  // Validate environment configuration
  async validateEnvironment(): Promise<ValidationResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const currentEnv = this.config.environment;

    try {
      // Check if current environment is supported
      if (!this.config.envFiles[currentEnv]) {
        errors.push(
          `Environment '${currentEnv}' is not supported. Supported: ${Object.keys(this.config.envFiles).join(', ')}`
        );
      }

      // Validate required environment variables
      for (const requiredVar of this.config.envValidation.required) {
        const value = Bun.env[requiredVar];
        if (!value) {
          errors.push(`Required environment variable '${requiredVar}' is not set`);
        } else if (value.length < 32 && this.config.envValidation.secrets.includes(requiredVar)) {
          warnings.push(`Secret '${requiredVar}' is shorter than recommended 32 characters`);
        }
      }

      // Check optional variables
      for (const optionalVar of this.config.envValidation.optional) {
        const value = Bun.env[optionalVar];
        if ((value && value.includes('dev_')) || value?.includes('test_')) {
          warnings.push(
            `Optional variable '${optionalVar}' contains development/test pattern: ${value}`
          );
        }
      }

      // Validate secret variables
      for (const secretVar of this.config.envValidation.secrets) {
        const value = Bun.env[secretVar];
        if (value) {
          if (value.length < 32) {
            errors.push(`Secret '${secretVar}' must be at least 32 characters long`);
          }
          if (value === 'your-secret-key' || value === 'dev_secret') {
            errors.push(`Secret '${secretVar}' contains default/placeholder value`);
          }
        }
      }

      const accessTime = performance.now() - startTime;
      this.recordPerformanceMetric(accessTime);

      const result: ValidationResult = {
        success: errors.length === 0,
        errors,
        warnings,
        environment: currentEnv,
        timestamp: new Date().toISOString(),
      };

      // Cache result
      this.validationCache.set(currentEnv, result);

      return result;
    } catch (error) {
      const accessTime = performance.now() - startTime;
      this.recordPerformanceMetric(accessTime);

      return {
        success: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        environment: currentEnv,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Perform security audit
  async performSecurityAudit(): Promise<SecurityAuditResult> {
    const startTime = performance.now();
    const issues: SecurityAuditResult['issues'] = [];
    let score = 100;

    try {
      // Check for weak secrets
      for (const secretVar of this.config.envValidation.secrets) {
        const value = Bun.env[secretVar];
        if (value) {
          if (value.length < 32) {
            issues.push({
              type: 'weak_secret',
              severity: 'high',
              message: `Secret '${secretVar}' is too short (${value.length} chars)`,
              variable: secretVar,
              recommendation: 'Generate a secret with at least 32 characters',
            });
            score -= 20;
          }

          if (value === 'your-secret-key' || value === 'dev_secret') {
            issues.push({
              type: 'default_value',
              severity: 'critical',
              message: `Secret '${secretVar}' contains default value`,
              variable: secretVar,
              recommendation: 'Replace with a strong, unique secret',
            });
            score -= 30;
          }
        } else {
          issues.push({
            type: 'missing_required',
            severity: 'critical',
            message: `Required secret '${secretVar}' is not set`,
            variable: secretVar,
            recommendation: 'Set this environment variable with a strong secret',
          });
          score -= 25;
        }
      }

      // Check for exposed patterns
      for (const [key, value] of Object.entries(Bun.env)) {
        if (value && (value.includes('sk_live_') || value.includes('pk_live_'))) {
          issues.push({
            type: 'exposed_pattern',
            severity: 'critical',
            message: `Live API key detected in '${key}'`,
            variable: key,
            recommendation: 'Use test keys in development environments',
          });
          score -= 25;
        }
      }

      const accessTime = performance.now() - startTime;
      this.recordPerformanceMetric(accessTime);

      return {
        success: score >= 70,
        score: Math.max(0, score),
        issues,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const accessTime = performance.now() - startTime;
      this.recordPerformanceMetric(accessTime);

      return {
        success: false,
        score: 0,
        issues: [
          {
            type: 'exposed_pattern',
            severity: 'critical',
            message: `Security audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recommendation: 'Check system configuration and try again',
          },
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics | null {
    if (this.performanceMetrics.length === 0) {
      return null;
    }

    const latest = this.performanceMetrics[this.performanceMetrics.length - 1];
    const avgAccessTime =
      this.performanceMetrics.reduce((sum, m) => sum + m.accessTime, 0) /
      this.performanceMetrics.length;
    const opsPerSecond = 1000 / avgAccessTime; // Rough calculation

    return {
      accessTime: avgAccessTime,
      operationsPerSecond: opsPerSecond,
      memoryUsage: performance.memory?.usedJSHeapSize || 0,
      timestamp: latest.timestamp,
    };
  }

  // Record performance metric
  private recordPerformanceMetric(accessTime: number): void {
    this.performanceMetrics.push({
      accessTime,
      operationsPerSecond: 0, // Will be calculated when retrieved
      memoryUsage: performance.memory?.usedJSHeapSize || 0,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - 1000);
    }
  }

  // Get cached validation result
  getCachedValidation(environment: string): ValidationResult | undefined {
    return this.validationCache.get(environment);
  }

  // Clear validation cache
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  // Get current configuration
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<EnvironmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear cache when config changes
    this.clearValidationCache();
  }
}

// Default configuration
const defaultConfig: EnvironmentConfig = {
  environment: Bun.env.NODE_ENV || 'development',
  envFiles: {
    development: '.env.development',
    staging: '.env.staging',
    production: '.env.production',
    test: '.env.test',
  },
  envValidation: {
    required: ['JWT_SECRET', 'ADMIN_PASSWORD'],
    optional: ['BOT_TOKEN', 'DEMO_MODE'],
    secrets: ['JWT_SECRET', 'ADMIN_PASSWORD'],
  },
};

// Export default instance
export const environmentManager = new EnvironmentManager(defaultConfig);
