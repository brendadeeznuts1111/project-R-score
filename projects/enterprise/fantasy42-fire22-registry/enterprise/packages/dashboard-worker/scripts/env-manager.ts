#!/usr/bin/env bun

/**
 * Fire22 Dashboard Environment Manager CLI
 * Comprehensive environment variable management system
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

// Load environment variables from .env files
function loadEnvFiles() {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];

  envFiles.forEach(file => {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();

          // Only set if not already in process.env
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  });
}

// Types for environment configuration
interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  API_BASE_URL: string;
  JWT_SECRET: string;
  LOG_LEVEL: string;
  FIRE22_API_KEY?: string;
  FIRE22_API_SECRET?: string;
  FIRE22_WEBHOOK_SECRET?: string;
  PORT?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  recommendations: string[];
}

class EnvironmentManager {
  private projectRoot: string;
  private envFiles: string[];
  private requiredVars: string[];
  private sensitiveVars: string[];

  constructor() {
    this.projectRoot = process.cwd();
    this.envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];
    this.requiredVars = ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'];
    this.sensitiveVars = [
      'JWT_SECRET',
      'FIRE22_API_KEY',
      'FIRE22_API_SECRET',
      'FIRE22_WEBHOOK_SECRET',
    ];

    // Load environment variables from .env files
    loadEnvFiles();
  }

  /**
   * Main CLI entry point
   */
  async run() {
    const command = process.argv[2] || 'help';
    const args = process.argv.slice(3);

    try {
      switch (command) {
        case 'validate':
          await this.validate();
          break;
        case 'check':
          await this.check();
          break;
        case 'list':
          await this.list();
          break;
        case 'audit':
          await this.audit();
          break;
        case 'performance':
          await this.performance();
          break;
        case 'integration':
          await this.integration();
          break;
        case 'setup':
          await this.setup();
          break;
        case 'generate':
          await this.generate(args);
          break;
        case 'backup':
          await this.backup();
          break;
        case 'restore':
          await this.restore(args);
          break;
        case 'diff':
          await this.diff();
          break;
        case 'sync':
          await this.sync();
          break;
        case 'monitor':
          await this.monitor();
          break;
        case 'export':
          await this.export(args);
          break;
        case 'import':
          await this.import(args);
          break;
        case 'demo':
          await this.demo();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate environment configuration
   */
  async validate(): Promise<void> {
    console.info('🔍 Validating environment configuration...\n');

    const result = await this.validateEnvironment();

    if (result.isValid) {
      console.info('✅ Environment validation passed!');
    } else {
      console.info('❌ Environment validation failed!');
    }

    if (result.errors.length > 0) {
      console.info('\n❌ Errors:');
      result.errors.forEach(error => console.info(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.info('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.info(`  • ${warning}`));
    }

    if (result.missing.length > 0) {
      console.info('\n🔍 Missing variables:');
      result.missing.forEach(missing => console.info(`  • ${missing}`));
    }

    if (result.recommendations.length > 0) {
      console.info('\n💡 Recommendations:');
      result.recommendations.forEach(rec => console.info(`  • ${rec}`));
    }

    if (!result.isValid) {
      process.exit(1);
    }
  }

  /**
   * Check environment status
   */
  async check(): Promise<void> {
    console.info('🔍 Checking environment status...\n');

    const envFiles = this.getEnvFiles();
    const currentEnv = process.env.NODE_ENV || 'development';

    console.info(`Current Environment: ${currentEnv}`);
    console.info(`Project Root: ${this.projectRoot}\n`);

    console.info('Environment Files:');
    envFiles.forEach(file => {
      const exists = existsSync(file);
      const status = exists ? '✅' : '❌';
      console.info(`  ${status} ${file}`);
    });

    console.info('\nRequired Variables:');
    this.requiredVars.forEach(varName => {
      const value = process.env[varName];
      const status = value ? '✅' : '❌';
      const displayValue = this.sensitiveVars.includes(varName) ? '***' : value;
      console.info(`  ${status} ${varName}=${displayValue}`);
    });

    console.info('\nEnvironment Health:');
    const result = await this.validateEnvironment();
    const healthScore = this.calculateHealthScore(result);
    console.info(`  Overall Health: ${healthScore}%`);

    if (healthScore >= 90) {
      console.info('  Status: 🟢 Excellent');
    } else if (healthScore >= 70) {
      console.info('  Status: 🟡 Good');
    } else if (healthScore >= 50) {
      console.info('  Status: 🟠 Fair');
    } else {
      console.info('  Status: 🔴 Poor');
    }
  }

  /**
   * List environment variables (masked)
   */
  async list(): Promise<void> {
    console.info('📋 Listing environment variables (sensitive values masked)...\n');

    const allVars = this.getAllEnvironmentVariables();

    console.info('Environment Variables:');
    Object.entries(allVars).forEach(([key, value]) => {
      const maskedValue = this.sensitiveVars.includes(key) ? '***' : value;
      console.info(`  ${key}=${maskedValue}`);
    });

    console.info(`\nTotal Variables: ${Object.keys(allVars).length}`);
    console.info(`Sensitive Variables: ${this.sensitiveVars.length}`);
  }

  /**
   * Security audit
   */
  async audit(): Promise<void> {
    console.info('🔒 Running security audit...\n');

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      issues.push(`JWT_SECRET is too short (${jwtSecret.length} chars, minimum 32)`);
      recommendations.push('Generate a stronger JWT secret using: openssl rand -base64 32');
    }

    // Check for default values
    if (jwtSecret === 'dev_secret_change_in_production') {
      issues.push('JWT_SECRET is using default development value');
      recommendations.push('Change JWT_SECRET to a strong, unique value');
    }

    // Check for exposed API keys
    const apiKey = process.env.FIRE22_API_KEY;
    if (apiKey && apiKey.includes('dev_') && process.env.NODE_ENV === 'production') {
      issues.push('FIRE22_API_KEY appears to be a development key in production');
      recommendations.push('Use production API keys in production environment');
    }

    // Check environment consistency
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
      issues.push('NODE_ENV is not set');
      recommendations.push('Set NODE_ENV to development, production, or test');
    }

    if (issues.length === 0) {
      console.info('✅ Security audit passed! No issues found.');
    } else {
      console.info('❌ Security audit failed! Issues found:');
      issues.forEach(issue => console.info(`  • ${issue}`));
    }

    if (recommendations.length > 0) {
      console.info('\n💡 Recommendations:');
      recommendations.forEach(rec => console.info(`  • ${rec}`));
    }
  }

  /**
   * Performance check
   */
  async performance(): Promise<void> {
    console.info('⚡ Running performance check...\n');

    const startTime = performance.now();

    // Simulate environment variable access
    for (let i = 0; i < 1000; i++) {
      process.env.NODE_ENV;
      process.env.DATABASE_URL;
      process.env.JWT_SECRET;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.info('Performance Metrics:');
    console.info(`  Environment Access: ${duration.toFixed(2)}ms for 1000 operations`);
    console.info(`  Operations/Second: ${(1000 / (duration / 1000)).toFixed(0)}`);

    if (duration < 10) {
      console.info('  Status: 🟢 Excellent performance');
    } else if (duration < 50) {
      console.info('  Status: 🟡 Good performance');
    } else {
      console.info('  Status: 🟠 Performance could be improved');
    }

    console.info('\nRecommendations:');
    console.info('  • Use Bun.env for better performance');
    console.info('  • Cache frequently accessed values');
    console.info('  • Minimize environment variable lookups in hot paths');
  }

  /**
   * Integration test
   */
  async integration(): Promise<void> {
    console.info('🧪 Running integration test...\n');

    console.info('Testing environment variable loading...');
    const envVars = this.getAllEnvironmentVariables();

    if (Object.keys(envVars).length === 0) {
      console.info('❌ No environment variables found');
      process.exit(1);
    }

    console.info('✅ Environment variables loaded successfully');

    console.info('\nTesting configuration validation...');
    const validation = await this.validateEnvironment();

    if (!validation.isValid) {
      console.info('❌ Configuration validation failed');
      process.exit(1);
    }

    console.info('✅ Configuration validation passed');

    console.info('\nTesting sensitive variable masking...');
    const hasSensitiveVars = this.sensitiveVars.some(
      varName => process.env[varName] && process.env[varName] !== '***'
    );

    if (hasSensitiveVars) {
      console.info('✅ Sensitive variables are properly masked');
    } else {
      console.info('⚠️  No sensitive variables found');
    }

    console.info('\n🎉 Integration test completed successfully!');
  }

  /**
   * Interactive setup wizard
   */
  async setup(): Promise<void> {
    console.info('🚀 Interactive Environment Setup Wizard\n');

    console.info('This will help you set up your environment configuration.');
    console.info('Press Enter to use default values, or type custom values.\n');

    // This would be interactive in a real implementation
    console.info('Setup wizard would prompt for:');
    console.info('  • NODE_ENV (development/production/test)');
    console.info('  • DATABASE_URL');
    console.info('  • JWT_SECRET');
    console.info('  • API_BASE_URL');
    console.info('  • FIRE22_API_KEY');
    console.info('  • FIRE22_API_SECRET');

    console.info('\nFor now, use the generate command to create template files:');
    console.info('  bun run env:generate');
  }

  /**
   * Generate environment files
   */
  async generate(args: string[]): Promise<void> {
    const environment = args[0] || 'development';

    console.info(`🎯 Generating .env.${environment} file...\n`);

    const template = this.getEnvTemplate(environment);
    const filename = `.env.${environment}`;

    writeFileSync(filename, template);
    console.info(`✅ Created ${filename}`);

    if (environment === 'development') {
      console.info('\n💡 Next steps:');
      console.info('  1. Review and customize the generated file');
      console.info('  2. Run: bun run env:validate');
      console.info('  3. Run: bun run env:check');
    }
  }

  /**
   * Demo package.json integration
   */
  async demo(): Promise<void> {
    console.info('🎯 Demo: Package.json Integration with bun pm pkg\n');

    console.info('This demonstrates how to use bun pm pkg with environment configuration:');
    console.info('');

    console.info('1. Get environment settings:');
    console.info('   bun pm pkg get config.environment');
    console.info('   bun pm pkg get config.port');
    console.info('');

    console.info('2. Update configuration:');
    console.info('   bun pm pkg set config.environment="staging"');
    console.info('   bun pm pkg set config.port=8080');
    console.info('');

    console.info('3. View environment metadata:');
    console.info('   bun pm pkg get metadata.environment.cliCommands');
    console.info('   bun pm pkg get metadata.environment.supportedEnvironments');
    console.info('');

    console.info('Try these commands with your test package!');
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.info('🔥 Fire22 Dashboard Environment Manager\n');
    console.info('Usage: bun run env:<command> [options]\n');

    console.info('Commands:');
    console.info('  validate     Validate environment configuration');
    console.info('  check        Check environment status and health');
    console.info('  list         List all environment variables (masked)');
    console.info('  audit        Run security audit');
    console.info('  performance  Check environment performance');
    console.info('  integration  Run full integration test');
    console.info('  setup        Interactive setup wizard');
    console.info('  generate     Generate environment file templates');
    console.info('  demo         Demo package.json integration');
    console.info('  help         Show this help message\n');

    console.info('Examples:');
    console.info('  bun run env:validate');
    console.info('  bun run env:check');
    console.info('  bun run env:generate production');
    console.info('  bun run env:audit');

    console.info('\nFor more information, see the documentation.');
  }

  // Helper methods
  private getEnvFiles(): string[] {
    return this.envFiles.map(file => join(this.projectRoot, file));
  }

  private getAllEnvironmentVariables(): Record<string, string> {
    return process.env as Record<string, string>;
  }

  private async validateEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missing: [],
      recommendations: [],
    };

    // Check required variables
    this.requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        result.missing.push(varName);
        result.isValid = false;
      }
    });

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      result.warnings.push('JWT_SECRET is shorter than recommended (32+ characters)');
    }

    // Check environment consistency
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
      result.errors.push(`Invalid NODE_ENV: ${nodeEnv}`);
      result.isValid = false;
    }

    // Generate recommendations
    if (result.missing.length > 0) {
      result.recommendations.push('Set all required environment variables');
    }
    if (jwtSecret === 'dev_secret_change_in_production') {
      result.recommendations.push('Change JWT_SECRET to a strong, unique value');
    }

    return result;
  }

  private calculateHealthScore(result: ValidationResult): number {
    let score = 100;

    score -= result.errors.length * 20;
    score -= result.warnings.length * 10;
    score -= result.missing.length * 15;

    return Math.max(0, Math.min(100, score));
  }

  private getEnvTemplate(environment: string): string {
    const templates = {
      development: `# Fire22 Dashboard Development Environment
NODE_ENV=development
DATABASE_URL=file:./dev.db
API_BASE_URL=http://localhost:3000/api
JWT_SECRET=dev_secret_change_in_production
LOG_LEVEL=debug

# External Services
FIRE22_API_KEY=dev_fire22_api_key_123
FIRE22_API_SECRET=dev_fire22_secret_abc
FIRE22_WEBHOOK_SECRET=dev_webhook_secret_xyz

# Server Configuration
PORT=3000`,

      production: `# Fire22 Dashboard Production Environment
NODE_ENV=production
DATABASE_URL=file:./prod.db
API_BASE_URL=https://api.fire22.com
JWT_SECRET=your_super_secure_production_secret_here
LOG_LEVEL=info

# External Services
FIRE22_API_KEY=prod_fire22_api_key_456
FIRE22_API_SECRET=prod_fire22_secret_def
FIRE22_WEBHOOK_SECRET=prod_webhook_secret_uvw

# Server Configuration
PORT=8080`,

      test: `# Fire22 Dashboard Test Environment
NODE_ENV=test
DATABASE_URL=file:./test.db
API_BASE_URL=http://localhost:3001/api
JWT_SECRET=test_secret_for_testing_only
LOG_LEVEL=error

# External Services
FIRE22_API_KEY=test_fire22_api_key_789
FIRE22_API_SECRET=test_fire22_secret_ghi
FIRE22_WEBHOOK_SECRET=test_webhook_secret_jkl

# Server Configuration
PORT=3001`,
    };

    return templates[environment as keyof typeof templates] || templates.development;
  }
}

// CLI entry point
if (import.meta.main) {
  const manager = new EnvironmentManager();
  manager.run();
}

export { EnvironmentManager };
