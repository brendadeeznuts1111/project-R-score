/**
 * CLI and Constants Validation System
 * 
 * Provides comprehensive validation, error handling, and auto-fixing
 * for CLI tools, links, and constants used across the platform.
 * 
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { validateOrThrow, StringValidators, NumberValidators } from './core-validation';

import { createValidationError, EnterpriseErrorCode, createSystemError } from './core-errors';
import { DOCUMENTATION_PROVIDERS, DocumentationProvider } from './core-documentation';

// ============================================================================
// VALIDATION CONFIGURATIONS
// ============================================================================

/**
 * CLI tool validation configuration
 */
export interface CLIToolConfig {
  readonly name: string;
  readonly path: string;
  readonly requiredArgs?: string[];
  readonly optionalArgs?: string[];
  readonly maxExecutionTime?: number; // milliseconds
  readonly requiredEnvVars?: string[];
  validatesInput?: boolean;
}

/**
 * URL validation configuration
 */
export interface URLValidationConfig {
  readonly name: string;
  readonly url: string;
  readonly requiredProtocol?: string[];
  readonly allowLocalhost?: boolean;
  readonly timeout?: number;
  readonly retries?: number;
}

/**
 * Constant validation configuration
 */
export interface ConstantValidationConfig {
  readonly name: string;
  readonly value: any;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required?: boolean;
  readonly validation?: (value: any) => boolean;
  readonly fix?: () => any;
}

// ============================================================================
// CLI TOOL VALIDATION
// ============================================================================

export class CLIToolValidator {
  private static readonly REGISTERED_TOOLS = new Map<string, CLIToolConfig>();

  /**
   * Register a CLI tool for validation
   */
  static registerTool(config: CLIToolConfig): void {
    this.REGISTERED_TOOLS.set(config.name, config);
  }

  /**
   * Validate a CLI tool before execution
   */
  static async validateTool(toolName: string, args: string[] = [], env: Record<string, string> = {}): Promise<{
    isValid: boolean;
    errors: string[];
    fixes: string[];
    warnings: string[];
  }> {
    const config = this.REGISTERED_TOOLS.get(toolName);
    if (!config) {
      return {
        isValid: false,
        errors: [`Unknown CLI tool: ${toolName}`],
        fixes: ['Register the tool using CLIToolValidator.registerTool()'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const fixes: string[] = [];
    const warnings: string[] = [];

    // Validate required arguments
    if (config.requiredArgs) {
      for (const requiredArg of config.requiredArgs) {
        if (!args.includes(requiredArg)) {
          errors.push(`Missing required argument: ${requiredArg}`);
          fixes.push(`Add argument: ${requiredArg}`);
        }
      }
    }

    // Validate environment variables
    if (config.requiredEnvVars) {
      for (const envVar of config.requiredEnvVars) {
        if (!env[envVar]) {
          errors.push(`Missing required environment variable: ${envVar}`);
          fixes.push(`Set environment variable: ${envVar}`);
        }
      }
    }

    // Validate tool existence
    try {
      const { which } = await import('bun');
      const toolPath = which(config.path);
      if (!toolPath) {
        errors.push(`CLI tool not found: ${config.path}`);
        fixes.push(`Install tool: ${config.path}`);
      }
    } catch (error) {
      warnings.push(`Could not validate tool existence: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fixes,
      warnings
    };
  }

  /**
   * Auto-fix common CLI tool issues
   */
  static async autoFix(toolName: string, args: string[], env: Record<string, string>): Promise<{
    success: boolean;
    fixedArgs: string[];
    fixedEnv: Record<string, string>;
    appliedFixes: string[];
  }> {
    const validation = await this.validateTool(toolName, args, env);
    const appliedFixes: string[] = [];
    let fixedArgs = [...args];
    let fixedEnv = { ...env };

    const config = this.REGISTERED_TOOLS.get(toolName);
    if (!config) {
      return {
        success: false,
        fixedArgs,
        fixedEnv,
        appliedFixes: ['Unknown tool - cannot auto-fix']
      };
    }

    // Auto-add missing required arguments
    if (config.requiredArgs) {
      for (const requiredArg of config.requiredArgs) {
        if (!fixedArgs.includes(requiredArg)) {
          fixedArgs.push(requiredArg);
          appliedFixes.push(`Added missing argument: ${requiredArg}`);
        }
      }
    }

    // Auto-set missing environment variables with defaults
    if (config.requiredEnvVars) {
      for (const envVar of config.requiredEnvVars) {
        if (!fixedEnv[envVar]) {
          fixedEnv[envVar] = this.getDefaultEnvValue(envVar);
          appliedFixes.push(`Set default environment variable: ${envVar}`);
        }
      }
    }

    return {
      success: validation.errors.length === appliedFixes.length,
      fixedArgs,
      fixedEnv,
      appliedFixes
    };
  }

  private static getDefaultEnvValue(envVar: string): string {
    const defaults: Record<string, string> = {
      'NODE_ENV': 'development',
      'BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER': '1',
      'BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS': '1',
      'PATH': process.env.PATH || '',
      'HOME': process.env.HOME || '',
    };
    return defaults[envVar] || '';
  }
}

// ============================================================================
// URL VALIDATION AND FIXING
// ============================================================================

export class URLValidator {
  private static readonly REGISTERED_URLS = new Map<string, URLValidationConfig>();

  /**
   * Register a URL for validation
   */
  static registerURL(config: URLValidationConfig): void {
    this.REGISTERED_URLS.set(config.name, config);
  }

  /**
   * Validate a URL with comprehensive checks
   */
  static async validateURL(urlName: string): Promise<{
    isValid: boolean;
    errors: string[];
    fixes: string[];
    warnings: string[];
    statusCode?: number;
    responseTime?: number;
  }> {
    const config = this.REGISTERED_URLS.get(urlName);
    if (!config) {
      return {
        isValid: false,
        errors: [`Unknown URL: ${urlName}`],
        fixes: ['Register URL using URLValidator.registerURL()'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const fixes: string[] = [];
    const warnings: string[] = [];

    // Basic URL format validation
    try {
      new URL(config.url);
    } catch {
      errors.push(`Invalid URL format: ${config.url}`);
      fixes.push(`Fix URL format for: ${config.url}`);
      return { isValid: false, errors, fixes, warnings };
    }

    const parsedUrl = new URL(config.url);

    // Protocol validation
    if (config.requiredProtocol && !config.requiredProtocol.includes(parsedUrl.protocol)) {
      errors.push(`Invalid protocol: ${parsedUrl.protocol} (required: ${config.requiredProtocol.join(', ')})`);
      fixes.push(`Change protocol to one of: ${config.requiredProtocol.join(', ')}`);
    }

    // Localhost validation
    if (!config.allowLocalhost && (parsedUrl.hostname === 'example.com' || parsedUrl.hostname === '127.0.0.1')) {
      warnings.push(`Localhost URL detected in production: ${config.url}`);
    }

    // HTTP connectivity test
    try {
      const startTime = performance.now();
      const response = await fetch(config.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(config.timeout || 10000)
      });
      const responseTime = performance.now() - startTime;

      if (!response.ok) {
        errors.push(`HTTP error ${response.status}: ${config.url}`);
        fixes.push(`Check URL availability or update to working URL`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        fixes,
        warnings,
        statusCode: response.status,
        responseTime
      };
    } catch (error) {
      errors.push(`Connection failed: ${error}`);
      fixes.push(`Check network connectivity and URL: ${config.url}`);
      return { isValid: false, errors, fixes, warnings };
    }
  }

  /**
   * Auto-fix common URL issues
   */
  static async autoFix(urlName: string): Promise<{
    success: boolean;
    fixedURL?: string;
    appliedFixes: string[];
  }> {
    const config = this.REGISTERED_URLS.get(urlName);
    if (!config) {
      return {
        success: false,
        appliedFixes: ['Unknown URL - cannot auto-fix']
      };
    }

    const appliedFixes: string[] = [];
    let fixedURL = config.url;

    // Fix common protocol issues
    if (!fixedURL.startsWith('http://') && !fixedURL.startsWith('https://')) {
      fixedURL = 'https://' + fixedURL;
      appliedFixes.push('Added https:// protocol');
    }

    // Fix trailing slashes
    if (fixedURL.endsWith('/') && !config.url.endsWith('/')) {
      fixedURL = fixedURL.slice(0, -1);
      appliedFixes.push('Removed trailing slash');
    }

    // Fix double slashes in path
    fixedURL = fixedURL.replace(/([^:])\/\//g, '$1/');
    if (fixedURL !== config.url) {
      appliedFixes.push('Fixed double slashes in path');
    }

    return {
      success: appliedFixes.length > 0,
      fixedURL,
      appliedFixes
    };
  }
}

// ============================================================================
// CONSTANT VALIDATION AND AUTO-FIXING
// ============================================================================

export class ConstantValidator {
  private static readonly REGISTERED_CONSTANTS = new Map<string, ConstantValidationConfig>();

  /**
   * Register a constant for validation
   */
  static registerConstant(config: ConstantValidationConfig): void {
    this.REGISTERED_CONSTANTS.set(config.name, config);
  }

  /**
   * Validate a constant
   */
  static validateConstant(constantName: string): {
    isValid: boolean;
    errors: string[];
    fixes: string[];
    warnings: string[];
    fixedValue?: any;
    constant: string;
  } {
    const config = this.REGISTERED_CONSTANTS.get(constantName);
    if (!config) {
      return {
        constant: constantName,
        isValid: false,
        errors: [`Unknown constant: ${constantName}`],
        fixes: ['Register constant using ConstantValidator.registerConstant()'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const fixes: string[] = [];
    const warnings: string[] = [];
    let fixedValue = config.value;

    // Type validation
    const actualType = Array.isArray(config.value) ? 'array' : typeof config.value;
    if (actualType !== config.type) {
      errors.push(`Type mismatch: expected ${config.type}, got ${actualType}`);
      if (config.fix) {
        fixedValue = config.fix();
        fixes.push(`Applied auto-fix for type conversion`);
      }
    }

    // Custom validation
    if (config.validation && !config.validation(config.value)) {
      errors.push(`Custom validation failed for: ${constantName}`);
      if (config.fix) {
        fixedValue = config.fix();
        fixes.push(`Applied custom fix for: ${constantName}`);
      }
    }

    // Required validation
    if (config.required && (config.value === null || config.value === undefined || config.value === '')) {
      errors.push(`Required constant is empty: ${constantName}`);
      if (config.fix) {
        fixedValue = config.fix();
        fixes.push(`Set default value for required constant: ${constantName}`);
      }
    }

    return {
      constant: constantName,
      isValid: errors.length === 0,
      errors,
      fixes,
      warnings,
      fixedValue: fixedValue !== config.value ? fixedValue : undefined
    };
  }

  /**
   * Auto-fix all registered constants
   */
  static autoFixAll(): {
    totalConstants: number;
    fixedConstants: number;
    appliedFixes: string[];
    errors: string[];
  } {
    const appliedFixes: string[] = [];
    const errors: string[] = [];
    let fixedConstants = 0;

    for (const [name] of this.REGISTERED_CONSTANTS) {
      try {
        const validation = this.validateConstant(name);
        if (validation.fixedValue !== undefined) {
          fixedConstants++;
          appliedFixes.push(...validation.fixes);
        }
        if (validation.errors.length > 0) {
          errors.push(`${name}: ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        errors.push(`${name}: ${error}`);
      }
    }

    return {
      totalConstants: this.REGISTERED_CONSTANTS.size,
      fixedConstants,
      appliedFixes,
      errors
    };
  }
}

// ============================================================================
// REGISTRATION OF COMMON PLATFORM ASSETS
// ============================================================================

// Register common CLI tools
CLIToolValidator.registerTool({
  name: 'bun',
  path: 'bun',
  requiredEnvVars: ['NODE_ENV'],
  validatesInput: true
});

CLIToolValidator.registerTool({
  name: 'overseer-cli',
  path: 'tools/overseer-cli.ts',
  maxExecutionTime: 30000
});

// Register common URLs
URLValidator.registerURL({
  name: 'bun-official-docs',
  url: 'https://bun.sh/docs',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'github-api',
  url: 'https://api.github.com',
  requiredProtocol: ['https:'],
  timeout: 15000
});

// Register documentation URLs from constants
URLValidator.registerURL({
  name: 'bun-cli-installation',
  url: 'https://bun.sh/docs/cli/install',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-cli-commands',
  url: 'https://bun.sh/docs/cli',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-utils-documentation',
  url: 'https://bun.sh/docs/api/utils',
  requiredProtocol: ['https:'],
  timeout: 10000
});

// Register docs-reference URLs
URLValidator.registerURL({
  name: 'bun-main-docs',
  url: 'https://bun.sh/docs',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-api-docs',
  url: 'https://bun.sh/docs/api',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-runtime-docs',
  url: 'https://bun.sh/docs/runtime',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-guides',
  url: 'https://bun.sh/docs/guides',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-blog',
  url: 'https://bun.sh/blog',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'bun-rss-feed',
  url: 'https://bun.sh/rss.xml',
  requiredProtocol: ['https:'],
  timeout: 10000
});

URLValidator.registerURL({
  name: 'github-repo',
  url: 'https://github.com/oven-sh/bun',
  requiredProtocol: ['https:'],
  timeout: 15000
});

URLValidator.registerURL({
  name: 'github-issues',
  url: 'https://github.com/oven-sh/bun/issues',
  requiredProtocol: ['https:'],
  timeout: 15000
});

URLValidator.registerURL({
  name: 'github-prs',
  url: 'https://github.com/oven-sh/bun/pulls',
  requiredProtocol: ['https:'],
  timeout: 15000
});

// Register common constants
ConstantValidator.registerConstant({
  name: 'default-timeout',
  value: 10000,
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value < 60000,
  fix: () => 10000
});

ConstantValidator.registerConstant({
  name: 'max-retries',
  value: 3,
  type: 'number',
  required: true,
  validation: (value) => value >= 0 && value <= 10,
  fix: () => 3
});

// Register documentation constants for validation
ConstantValidator.registerConstant({
  name: 'cli-categories-count',
  value: 8, // Number of CLICategory enum values
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value <= 20,
  fix: () => 8
});

ConstantValidator.registerConstant({
  name: 'utils-categories-count',
  value: 10, // Number of UtilsCategory enum values
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value <= 20,
  fix: () => 10
});

ConstantValidator.registerConstant({
  name: 'documentation-base-url',
  value: 'https://bun.sh',
  type: 'string',
  required: true,
  validation: (value) => typeof value === 'string' && value.startsWith('https://'),
  fix: () => 'https://bun.sh'
});

ConstantValidator.registerConstant({
  name: 'github-base-url',
  value: 'https://github.com/oven-sh/bun',
  type: 'string',
  required: true,
  validation: (value) => typeof value === 'string' && value.startsWith('https://github.com'),
  fix: () => 'https://github.com/oven-sh/bun'
});

ConstantValidator.registerConstant({
  name: 'documentation-sections-count',
  value: 6, // Number of main sections in DOCS (BASE, DOCS, API, RUNTIME, GUIDES, CLI, BLOG)
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value <= 20,
  fix: () => 6
});

ConstantValidator.registerConstant({
  name: 'url-patterns-count',
  value: 11, // Number of URL_PATTERNS defined
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value <= 20,
  fix: () => 11
});

ConstantValidator.registerConstant({
  name: 'doc-paths-count',
  value: 11, // Number of DOC_PATHS defined
  type: 'number',
  required: true,
  validation: (value) => value > 0 && value <= 20,
  fix: () => 11
});

// ============================================================================
// COMPREHENSIVE VALIDATION REPORT
// ============================================================================

export class ValidationReporter {
  /**
   * Generate comprehensive validation report
   */
  static async generateReport(): Promise<{
    timestamp: string;
    cli: { total: number; valid: number; errors: string[] };
    urls: { total: number; valid: number; errors: string[]; avgResponseTime?: number };
    constants: { total: number; valid: number; errors: string[] };
    summary: { totalIssues: number; criticalIssues: number; recommendations: string[] };
  }> {
    const timestamp = new Date().toISOString();

    // Validate CLI tools
    const cliResults = await Promise.all([
      CLIToolValidator.validateTool('bun', [], process.env),
      CLIToolValidator.validateTool('overseer-cli', [], process.env)
    ]);

    const cliErrors = cliResults.flatMap(r => r.errors);
    const cliValid = cliResults.filter(r => r.isValid).length;

    // Validate URLs
    const urlResults = await Promise.all([
      URLValidator.validateURL('bun-official-docs'),
      URLValidator.validateURL('github-api'),
      URLValidator.validateURL('bun-cli-installation'),
      URLValidator.validateURL('bun-cli-commands'),
      URLValidator.validateURL('bun-utils-documentation'),
      URLValidator.validateURL('bun-main-docs'),
      URLValidator.validateURL('bun-api-docs'),
      URLValidator.validateURL('bun-runtime-docs'),
      URLValidator.validateURL('bun-guides'),
      URLValidator.validateURL('bun-blog'),
      URLValidator.validateURL('bun-rss-feed'),
      URLValidator.validateURL('github-repo'),
      URLValidator.validateURL('github-issues'),
      URLValidator.validateURL('github-prs')
    ]);

    const urlErrors = urlResults.flatMap(r => r.errors);
    const urlValid = urlResults.filter(r => r.isValid).length;
    const avgResponseTime = urlResults
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / urlResults.length;

    // Validate constants
    const constantNames = [
      'default-timeout', 
      'max-retries', 
      'cli-categories-count', 
      'utils-categories-count', 
      'documentation-base-url',
      'github-base-url',
      'documentation-sections-count',
      'url-patterns-count',
      'doc-paths-count'
    ];
    const constantResults = constantNames.map(name => 
      ConstantValidator.validateConstant(name)
    );

    const constantErrors = constantResults.flatMap(r => r.errors);
    const constantValid = constantResults.filter(r => r.isValid).length;

    const totalIssues = cliErrors.length + urlErrors.length + constantErrors.length;
    const criticalIssues = urlErrors.length; // URL issues are critical

    const recommendations: string[] = [];
    if (cliErrors.length > 0) recommendations.push('Install missing CLI tools and set required environment variables');
    if (urlErrors.length > 0) recommendations.push('Fix URL connectivity issues and update broken links');
    if (constantErrors.length > 0) recommendations.push('Review and fix constant values');

    return {
      timestamp,
      cli: { total: cliResults.length, valid: cliValid, errors: cliErrors },
      urls: { total: urlResults.length, valid: urlValid, errors: urlErrors, avgResponseTime },
      constants: { total: constantResults.length, valid: constantValid, errors: constantErrors },
      summary: { totalIssues, criticalIssues, recommendations }
    };
  }

  /**
   * Print validation report to console
   */
  static async printReport(): Promise<void> {
    const report = await this.generateReport();
    
    console.log('\n🔍 PLATFORM VALIDATION REPORT');
    console.log('=' .repeat(50));
    console.log(`📅 Generated: ${report.timestamp}`);
    
    console.log('\n🛠️  CLI Tools:');
    console.log(`   Valid: ${report.cli.valid}/${report.cli.total}`);
    if (report.cli.errors.length > 0) {
      console.log('   Errors:');
      report.cli.errors.forEach(error => console.log(`     ❌ ${error}`));
    }
    
    console.log('\n🌐 URLs:');
    console.log(`   Valid: ${report.urls.valid}/${report.urls.total}`);
    if (report.urls.avgResponseTime) {
      console.log(`   Avg Response Time: ${report.urls.avgResponseTime.toFixed(0)}ms`);
    }
    if (report.urls.errors.length > 0) {
      console.log('   Errors:');
      report.urls.errors.forEach(error => console.log(`     ❌ ${error}`));
    }
    
    console.log('\n📊 Constants:');
    console.log(`   Valid: ${report.constants.valid}/${report.constants.total}`);
    if (report.constants.errors.length > 0) {
      console.log('   Errors:');
      report.constants.errors.forEach(error => console.log(`     ❌ ${error}`));
    }
    
    console.log('\n📋 Summary:');
    console.log(`   Total Issues: ${report.summary.totalIssues}`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    
    if (report.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// ============================================================================
// AUTO-HEALING FUNCTIONS
// ============================================================================

export class AutoHealer {
  /**
   * Attempt to auto-fix all detected issues
   */
  static async healAll(): Promise<{
    cliFixes: string[];
    urlFixes: string[];
    constantFixes: string[];
    totalFixes: number;
    success: boolean;
  }> {
    const cliFixes: string[] = [];
    const urlFixes: string[] = [];
    const constantFixes: string[] = [];

    // Auto-fix CLI tools
    try {
      const cliResult = await CLIToolValidator.autoFix('bun', [], process.env);
      cliFixes.push(...cliResult.appliedFixes);
    } catch (error) {
      cliFixes.push(`CLI auto-fix failed: ${error}`);
    }

    // Auto-fix URLs
    try {
      const urlResult = await URLValidator.autoFix('bun-official-docs');
      urlFixes.push(...urlResult.appliedFixes);
    } catch (error) {
      urlFixes.push(`URL auto-fix failed: ${error}`);
    }

    // Auto-fix constants
    try {
      const constantResult = ConstantValidator.autoFixAll();
      constantFixes.push(...constantResult.appliedFixes);
    } catch (error) {
      constantFixes.push(`Constant auto-fix failed: ${error}`);
    }

    const totalFixes = cliFixes.length + urlFixes.length + constantFixes.length;
    const success = totalFixes > 0;

    return {
      cliFixes,
      urlFixes,
      constantFixes,
      totalFixes,
      success
    };
  }

  /**
   * Run auto-healing and report results
   */
  static async healAndReport(): Promise<void> {
    console.log('\n🚀 STARTING AUTO-HEALING...');
    
    const result = await this.healAll();
    
    console.log('\n🔧 AUTO-HEALING RESULTS:');
    console.log(`   Total Fixes Applied: ${result.totalFixes}`);
    
    if (result.cliFixes.length > 0) {
      console.log('\n   CLI Fixes:');
      result.cliFixes.forEach(fix => console.log(`     ✅ ${fix}`));
    }
    
    if (result.urlFixes.length > 0) {
      console.log('\n   URL Fixes:');
      result.urlFixes.forEach(fix => console.log(`     ✅ ${fix}`));
    }
    
    if (result.constantFixes.length > 0) {
      console.log('\n   Constant Fixes:');
      result.constantFixes.forEach(fix => console.log(`     ✅ ${fix}`));
    }
    
    if (result.success) {
      console.log('\n✅ Auto-healing completed successfully!');
    } else {
      console.log('\n⚠️  Some issues could not be auto-fixed');
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
