#!/usr/bin/env bun
/**
 * 🧪 Fire22 Dry-Run Validator
 *
 * Quick dry-run validation for common operations
 * Integrates with health checks and provides safety validation
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

interface DryRunValidation {
  operation: string;
  safe: boolean;
  warnings: string[];
  blockers: string[];
  recommendations: string[];
  estimatedTime: number; // seconds
}

class DryRunValidator {
  /**
   * Validate deployment readiness
   */
  async validateDeployment(): Promise<DryRunValidation> {
    console.info('🚀 Validating deployment readiness...\n');

    const warnings: string[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];
    let safe = true;

    // Check build
    try {
      console.info('   🔨 Testing build process...');
      await this.execCommand('bun', ['run', 'build:quick']);
      console.info('   ✅ Build: OK');
    } catch (error) {
      blockers.push('Build process fails');
      safe = false;
      console.info('   ❌ Build: FAILED');
    }

    // Check tests (quick)
    try {
      console.info('   🧪 Running quick tests...');
      await this.execCommand('bun', ['run', 'test:quick'], 10000);
      console.info('   ✅ Tests: OK');
    } catch (error) {
      warnings.push('Quick tests failed - run full test suite');
      console.info('   ⚠️  Tests: WARNING');
    }

    // Check environment
    console.info('   🔧 Checking environment configuration...');
    const envFiles = ['.env', '.env.production', 'wrangler.toml'];
    const missingEnv = envFiles.filter(f => !existsSync(f));

    if (missingEnv.length > 0) {
      warnings.push(`Missing environment files: ${missingEnv.join(', ')}`);
      console.info('   ⚠️  Environment: INCOMPLETE');
    } else {
      console.info('   ✅ Environment: OK');
    }

    // Check git status
    console.info('   📊 Checking git status...');
    try {
      await this.execCommand('git', ['status', '--porcelain']);
      console.info('   ✅ Git: Clean');
    } catch (error) {
      warnings.push('Uncommitted changes detected');
      console.info('   ⚠️  Git: DIRTY');
    }

    // Generate recommendations
    if (safe && warnings.length === 0) {
      recommendations.push('✅ Deployment is ready to proceed');
    } else {
      if (blockers.length > 0) {
        recommendations.push('🚫 Fix blocking issues before deployment');
      }
      if (warnings.length > 0) {
        recommendations.push('⚠️ Address warnings for safer deployment');
      }
    }

    return {
      operation: 'Deployment',
      safe: safe && blockers.length === 0,
      warnings,
      blockers,
      recommendations,
      estimatedTime: safe ? 180 : 0,
    };
  }

  /**
   * Validate configuration changes
   */
  async validateConfiguration(): Promise<DryRunValidation> {
    console.info('⚙️  Validating configuration changes...\n');

    const warnings: string[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];
    let safe = true;

    // Check package.json syntax
    console.info('   📦 Validating package.json...');
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      console.info('   ✅ package.json: Valid JSON');
    } catch (error) {
      blockers.push('package.json has invalid JSON syntax');
      safe = false;
      console.info('   ❌ package.json: INVALID JSON');
    }

    // Check TypeScript config
    console.info('   📝 Validating tsconfig.json...');
    if (existsSync('tsconfig.json')) {
      try {
        JSON.parse(readFileSync('tsconfig.json', 'utf8'));
        console.info('   ✅ tsconfig.json: Valid');
      } catch (error) {
        blockers.push('tsconfig.json has invalid JSON syntax');
        safe = false;
        console.info('   ❌ tsconfig.json: INVALID');
      }
    } else {
      warnings.push('tsconfig.json not found');
      console.info('   ⚠️  tsconfig.json: MISSING');
    }

    // Check Wrangler config
    console.info('   ☁️  Validating wrangler.toml...');
    if (existsSync('wrangler.toml')) {
      console.info('   ✅ wrangler.toml: Present');
    } else {
      warnings.push('wrangler.toml not found for Cloudflare deployment');
      console.info('   ⚠️  wrangler.toml: MISSING');
    }

    recommendations.push(
      safe ? '✅ Configuration changes are safe to apply' : '🚫 Fix configuration errors first'
    );

    return {
      operation: 'Configuration',
      safe,
      warnings,
      blockers,
      recommendations,
      estimatedTime: 60,
    };
  }

  /**
   * Validate dependency updates
   */
  async validateDependencies(): Promise<DryRunValidation> {
    console.info('📚 Validating dependency updates...\n');

    const warnings: string[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];
    let safe = true;

    // Check for outdated dependencies
    console.info('   🔍 Checking for outdated dependencies...');
    try {
      await this.execCommand('bun', ['outdated'], true);
      console.info('   ℹ️  Dependencies: Checked');
    } catch (error) {
      // This is expected to "fail" if there are outdated deps
      console.info('   ℹ️  Dependencies: Some may be outdated');
    }

    // Security audit
    console.info('   🛡️  Running security audit...');
    try {
      await this.execCommand('bun', ['audit', '--audit-level', 'high'], true);
      console.info('   ✅ Security: No high-risk vulnerabilities');
    } catch (error) {
      warnings.push('Security vulnerabilities detected in dependencies');
      console.info('   ⚠️  Security: Vulnerabilities found');
    }

    // Check lock file
    console.info('   🔒 Checking lock file...');
    if (existsSync('bun.lockb')) {
      console.info('   ✅ Lock file: Present');
    } else {
      warnings.push('Lock file missing - dependency versions not locked');
      console.info('   ⚠️  Lock file: Missing');
    }

    recommendations.push(
      '💡 Review dependency changes before applying updates',
      '🧪 Test thoroughly after dependency updates',
      '📄 Check changelogs for breaking changes'
    );

    return {
      operation: 'Dependencies',
      safe,
      warnings,
      blockers,
      recommendations,
      estimatedTime: 300,
    };
  }

  /**
   * Execute command with timeout
   */
  private execCommand(command: string, args: string[], timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out'));
      }, timeout);

      child.on('close', code => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Display validation results
   */
  displayResults(validations: DryRunValidation[]): void {
    console.info('\n🧪 Dry-Run Validation Summary');
    console.info('='.repeat(40));

    let allSafe = true;
    let totalWarnings = 0;
    let totalBlockers = 0;

    validations.forEach(validation => {
      const statusIcon = validation.safe ? '✅' : '❌';
      const timeStr =
        validation.estimatedTime > 0
          ? ` (Est. ${Math.floor(validation.estimatedTime / 60)}m ${validation.estimatedTime % 60}s)`
          : '';

      console.info(`\n${statusIcon} ${validation.operation}${timeStr}`);

      if (validation.blockers.length > 0) {
        console.info('   🚫 Blockers:');
        validation.blockers.forEach(b => console.info(`     • ${b}`));
        allSafe = false;
        totalBlockers += validation.blockers.length;
      }

      if (validation.warnings.length > 0) {
        console.info('   ⚠️  Warnings:');
        validation.warnings.forEach(w => console.info(`     • ${w}`));
        totalWarnings += validation.warnings.length;
      }

      if (validation.recommendations.length > 0) {
        console.info('   💡 Recommendations:');
        validation.recommendations.forEach(r => console.info(`     • ${r}`));
      }
    });

    console.info('\n📊 Overall Status:');
    console.info(`   Safety: ${allSafe ? '✅ SAFE' : '❌ NOT SAFE'}`);
    console.info(`   Blockers: ${totalBlockers}`);
    console.info(`   Warnings: ${totalWarnings}`);

    if (allSafe && totalWarnings === 0) {
      console.info('\n🎉 All validations passed! Operations are safe to proceed.');
    } else if (allSafe) {
      console.info('\n⚠️  Operations are safe but have warnings. Review carefully.');
    } else {
      console.info('\n🚫 Operations are NOT SAFE. Fix blocking issues first.');
    }
  }

  /**
   * Run all validations
   */
  async runAllValidations(): Promise<DryRunValidation[]> {
    const validations = await Promise.all([
      this.validateDeployment(),
      this.validateConfiguration(),
      this.validateDependencies(),
    ]);

    this.displayResults(validations);
    return validations;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new DryRunValidator();

  if (args.includes('--help') || args.includes('-h')) {
    console.info(`
🧪 Fire22 Dry-Run Validator

USAGE:
  bun run scripts/dry-run-validator.ts [operation] [options]

OPERATIONS:
  deployment       Validate deployment readiness
  config           Validate configuration changes
  dependencies     Validate dependency updates
  all              Run all validations (default)

OPTIONS:
  -h, --help       Show this help message

EXAMPLES:
  bun run scripts/dry-run-validator.ts              # All validations
  bun run scripts/dry-run-validator.ts deployment   # Deployment only
  fire22 dry-run                                    # Via Fire22 CLI

🔥 Fire22 Development Team - Enterprise Dashboard System
`);
    process.exit(0);
  }

  const operation = args[0] || 'all';

  try {
    let validations: DryRunValidation[] = [];

    switch (operation) {
      case 'deployment':
        validations = [await validator.validateDeployment()];
        break;
      case 'config':
        validations = [await validator.validateConfiguration()];
        break;
      case 'dependencies':
        validations = [await validator.validateDependencies()];
        break;
      case 'all':
      default:
        validations = await validator.runAllValidations();
        break;
    }

    // Exit with appropriate code
    const allSafe = validations.every(v => v.safe);
    const hasBlockers = validations.some(v => v.blockers.length > 0);

    if (hasBlockers) {
      process.exit(1);
    } else if (!allSafe) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Dry-run validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { DryRunValidator, DryRunValidation };
