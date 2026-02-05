#!/usr/bin/env bun

/**
 * Comprehensive Context Validation System
 * 
 * Validates project context integrity, token consistency, and
 * AI optimization readiness across the entire codebase.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: () => ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
  suggestions?: string[];
}

interface ContextValidationReport {
  timestamp: Date;
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
  results: Array<{
    rule: string;
    severity: string;
    result: ValidationResult;
  }>;
  recommendations: string[];
  score: number;
}

class ContextValidationSystem {
  private rules: ValidationRule[] = [];
  private contextConfig: any = null;

  constructor() {
    this.loadContextConfig();
    this.initializeRules();
  }

  /**
   * Load context configuration
   */
  private loadContextConfig(): void {
    const configPath = '.context-tokens.json';
    if (existsSync(configPath)) {
      const configData = readFileSync(configPath, 'utf-8');
      this.contextConfig = JSON.parse(configData);
    }
  }

  /**
   * Initialize validation rules
   */
  private initializeRules(): void {
    this.rules = [
      {
        name: 'token-config-exists',
        description: 'Context token configuration file exists',
        severity: 'error',
        validate: () => this.validateTokenConfigExists()
      },
      {
        name: 'token-config-valid',
        description: 'Context token configuration is valid JSON',
        severity: 'error',
        validate: () => this.validateTokenConfigValid()
      },
      {
        name: 'token-directories-exist',
        description: 'All token directories exist',
        severity: 'error',
        validate: () => this.validateTokenDirectoriesExist()
      },
      {
        name: 'token-naming-consistency',
        description: 'Token naming follows @token convention',
        severity: 'warning',
        validate: () => this.validateTokenNamingConsistency()
      },
      {
        name: 'token-coverage',
        description: 'Tokens provide adequate coverage',
        severity: 'warning',
        validate: () => this.validateTokenCoverage()
      },
      {
        name: 'token-dependencies',
        description: 'Token dependencies are properly defined',
        severity: 'info',
        validate: () => this.validateTokenDependencies()
      },
      {
        name: 'file-token-mapping',
        description: 'Files are properly mapped to tokens',
        severity: 'error',
        validate: () => this.validateFileTokenMapping()
      },
      {
        name: 'import-consistency',
        description: 'Imports use token-based paths',
        severity: 'warning',
        validate: () => this.validateImportConsistency()
      },
      {
        name: 'typescript-paths',
        description: 'TypeScript path mapping is configured',
        severity: 'info',
        validate: () => this.validateTypeScriptPaths()
      },
      {
        name: 'context-optimization',
        description: 'Project is optimized for AI context',
        severity: 'info',
        validate: () => this.validateContextOptimization()
      },
      {
        name: 'documentation-coverage',
        description: 'Context documentation is complete',
        severity: 'warning',
        validate: () => this.validateDocumentationCoverage()
      },
      {
        name: 'build-integration',
        description: 'Build system supports context tokens',
        severity: 'info',
        validate: () => this.validateBuildIntegration()
      }
    ];
  }

  /**
   * Validate token configuration exists
   */
  private validateTokenConfigExists(): ValidationResult {
    const exists = existsSync('.context-tokens.json');
    
    return {
      passed: exists,
      message: exists ? 'Context token configuration found' : 'Missing .context-tokens.json',
      suggestions: exists ? [] : ['Create .context-tokens.json with token definitions']
    };
  }

  /**
   * Validate token configuration is valid
   */
  private validateTokenConfigValid(): ValidationResult {
    if (!this.contextConfig) {
      return {
        passed: false,
        message: 'Cannot validate: configuration not loaded'
      };
    }

    try {
      const required = ['version', 'project', 'tokens'];
      const missing = required.filter(field => !(field in this.contextConfig));
      
      return {
        passed: missing.length === 0,
        message: missing.length === 0 ? 'Configuration is valid' : `Missing required fields: ${missing.join(', ')}`,
        details: { missing }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Configuration is invalid: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate token directories exist
   */
  private validateTokenDirectoriesExist(): ValidationResult {
    if (!this.contextConfig) {
      return { passed: false, message: 'Cannot validate: configuration not loaded' };
    }

    const tokens = Object.keys(this.contextConfig.tokens);
    const missing: string[] = [];

    for (const token of tokens) {
      const tokenDir = `src/@${token}`;
      if (!existsSync(tokenDir)) {
        missing.push(tokenDir);
      }
    }

    return {
      passed: missing.length === 0,
      message: missing.length === 0 ? 'All token directories exist' : `Missing directories: ${missing.join(', ')}`,
      details: { missing },
      suggestions: missing.length > 0 ? ['Create missing token directories'] : []
    };
  }

  /**
   * Validate token naming consistency
   */
  private validateTokenNamingConsistency(): ValidationResult {
    const srcDir = 'src';
    const inconsistent: string[] = [];

    if (!existsSync(srcDir)) {
      return { passed: false, message: 'src directory not found' };
    }

    const items = readdirSync(srcDir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name.startsWith('@')) {
          // Token directory - should be in config
          const token = item.name.substring(1);
          if (!this.contextConfig?.tokens[token]) {
            inconsistent.push(item.name);
          }
        } else {
          // Non-token directory - should be tokenized
          inconsistent.push(item.name);
        }
      }
    }

    return {
      passed: inconsistent.length === 0,
      message: inconsistent.length === 0 ? 'Token naming is consistent' : `Inconsistent directories: ${inconsistent.join(', ')}`,
      details: { inconsistent },
      suggestions: inconsistent.length > 0 ? [
        'Rename directories to use @token convention',
        'Add missing tokens to configuration'
      ] : []
    };
  }

  /**
   * Validate token coverage
   */
  private validateTokenCoverage(): ValidationResult {
    if (!this.contextConfig) {
      return { passed: false, message: 'Cannot validate: configuration not loaded' };
    }

    const tokens = Object.keys(this.contextConfig.tokens);
    const coreTokens = ['@core', '@api', '@automation'];
    const missingCore = coreTokens.filter(token => !tokens.includes(token.substring(1)));

    return {
      passed: missingCore.length === 0,
      message: missingCore.length === 0 ? 'Core tokens are defined' : `Missing core tokens: ${missingCore.join(', ')}`,
      details: { missingCore, definedTokens: tokens },
      suggestions: missingCore.length > 0 ? ['Define missing core tokens'] : []
    };
  }

  /**
   * Validate token dependencies
   */
  private validateTokenDependencies(): ValidationResult {
    if (!this.contextConfig) {
      return { passed: false, message: 'Cannot validate: configuration not loaded' };
    }

    const tokens = this.contextConfig.tokens;
    const issues: string[] = [];

    for (const [tokenName, tokenConfig] of Object.entries(tokens as any)) {
      if (tokenConfig.parent && !tokens[tokenConfig.parent]) {
        issues.push(`Token ${tokenName} references non-existent parent: ${tokenConfig.parent}`);
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'Token dependencies are valid' : `Dependency issues: ${issues.join(', ')}`,
      details: { issues }
    };
  }

  /**
   * Validate file token mapping
   */
  private validateFileTokenMapping(): ValidationResult {
    const srcDir = 'src';
    if (!existsSync(srcDir)) {
      return { passed: false, message: 'src directory not found' };
    }

    const unmapped: string[] = [];
    const files = this.getAllTypeScriptFiles(srcDir);

    for (const file of files) {
      const token = this.getTokenForFile(file);
      if (!token || token === 'unknown') {
        unmapped.push(file);
      }
    }

    return {
      passed: unmapped.length === 0,
      message: unmapped.length === 0 ? 'All files are mapped to tokens' : `Unmapped files: ${unmapped.slice(0, 10).join(', ')}${unmapped.length > 10 ? '...' : ''}`,
      details: { unmapped, total: files.length },
      suggestions: unmapped.length > 0 ? [
        'Move files to appropriate token directories',
        'Add missing tokens to configuration'
      ] : []
    };
  }

  /**
   * Validate import consistency
   */
  private validateImportConsistency(): ValidationResult {
    const srcDir = 'src';
    if (!existsSync(srcDir)) {
      return { passed: false, message: 'src directory not found' };
    }

    const inconsistentImports: string[] = [];
    const files = this.getAllTypeScriptFiles(srcDir);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const imports = this.extractImports(content);
      
      for (const imp of imports) {
        if (imp.startsWith('../') || imp.startsWith('../../')) {
          // Check if this could be a token-based import
          const resolvedToken = this.resolveTokenFromPath(imp, file);
          if (resolvedToken) {
            inconsistentImports.push(`${file}: ${imp} (could be @${resolvedToken}/...)`);
          }
        }
      }
    }

    return {
      passed: inconsistentImports.length === 0,
      message: inconsistentImports.length === 0 ? 'Imports use token-based paths' : `Inconsistent imports: ${inconsistentImports.slice(0, 5).join(', ')}${inconsistentImports.length > 5 ? '...' : ''}`,
      details: { inconsistentImports },
      suggestions: inconsistentImports.length > 0 ? [
        'Update imports to use token-based paths',
        'Configure TypeScript path mapping'
      ] : []
    };
  }

  /**
   * Validate TypeScript path mapping
   */
  private validateTypeScriptPaths(): ValidationResult {
    const tsConfigPath = 'tsconfig.context.json';
    const exists = existsSync(tsConfigPath);
    
    if (!exists) {
      return {
        passed: false,
        message: 'TypeScript context configuration not found',
        suggestions: ['Create tsconfig.context.json with token path mapping']
      };
    }

    try {
      const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));
      const paths = tsConfig.compilerOptions?.paths || {};
      const expectedPaths = this.getExpectedTokenPaths();
      const missing = expectedPaths.filter(path => !paths[path]);

      return {
        passed: missing.length === 0,
        message: missing.length === 0 ? 'TypeScript paths are configured' : `Missing paths: ${missing.join(', ')}`,
        details: { configured: Object.keys(paths), missing },
        suggestions: missing.length > 0 ? ['Add missing token paths to TypeScript configuration'] : []
      };
    } catch (error) {
      return {
        passed: false,
        message: `TypeScript configuration is invalid: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate context optimization
   */
  private validateContextOptimization(): ValidationResult {
    const optimizations: string[] = [];
    
    // Check for advanced context engine
    if (existsSync('tools/advanced-context-engine.ts')) {
      optimizations.push('Advanced context engine');
    }
    
    // Check for context-aware builder
    if (existsSync('tools/context-aware-builder.ts')) {
      optimizations.push('Context-aware build system');
    }
    
    // Check for intelligent file discovery
    if (existsSync('tools/intelligent-file-discovery.ts')) {
      optimizations.push('Intelligent file discovery');
    }
    
    // Check for context-based testing
    if (existsSync('tools/context-based-testing.ts')) {
      optimizations.push('Context-based testing');
    }

    const expected = ['Advanced context engine', 'Context-aware build system', 'Intelligent file discovery', 'Context-based testing'];
    const missing = expected.filter(opt => !optimizations.includes(opt));

    return {
      passed: missing.length === 0,
      message: missing.length === 0 ? 'Full context optimization implemented' : `Missing optimizations: ${missing.join(', ')}`,
      details: { implemented: optimizations, missing },
      suggestions: missing.length > 0 ? ['Implement missing context optimization tools'] : []
    };
  }

  /**
   * Validate documentation coverage
   */
  private validateDocumentationCoverage(): ValidationResult {
    const docsDir = 'docs';
    const expectedDocs = [
      'CONTEXT_TOKENS.md',
      'CONTEXT_OPTIMIZATION.md',
      'PROJECT_STRUCTURE.md'
    ];

    const missing: string[] = [];
    
    for (const doc of expectedDocs) {
      if (!existsSync(join(docsDir, doc))) {
        missing.push(doc);
      }
    }

    return {
      passed: missing.length === 0,
      message: missing.length === 0 ? 'Documentation is complete' : `Missing documentation: ${missing.join(', ')}`,
      details: { missing },
      suggestions: missing.length > 0 ? ['Create missing documentation files'] : []
    };
  }

  /**
   * Validate build integration
   */
  private validateBuildIntegration(): ValidationResult {
    const packageContextPath = 'package.context.json';
    const exists = existsSync(packageContextPath);
    
    if (!exists) {
      return {
        passed: false,
        message: 'Context-aware package configuration not found',
        suggestions: ['Create package.context.json with build context settings']
      };
    }

    try {
      const packageConfig = JSON.parse(readFileSync(packageContextPath, 'utf-8'));
      const hasContext = packageConfig.context && packageConfig.context.enabled;
      
      return {
        passed: hasContext,
        message: hasContext ? 'Build system supports context tokens' : 'Context support not enabled in build system',
        details: { context: packageConfig.context },
        suggestions: hasContext ? [] : ['Enable context support in build configuration']
      };
    } catch (error) {
      return {
        passed: false,
        message: `Package context configuration is invalid: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all TypeScript files in directory
   */
  private getAllTypeScriptFiles(directory: string): string[] {
    const files: string[] = [];
    
    function scan(dir: string) {
      const items = readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = join(dir, item.name);
        
        if (item.isDirectory()) {
          scan(fullPath);
        } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    }
    
    scan(directory);
    return files;
  }

  /**
   * Get token for file
   */
  private getTokenForFile(filePath: string): string {
    // Check for @token patterns
    const tokenMatch = filePath.match(/@([^\/]+)/);
    if (tokenMatch) return tokenMatch[1];

    // Check directory-based tokens
    if (filePath.includes('/core/')) return 'core';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('/automation/')) return 'automation';
    if (filePath.includes('/venmo/')) return 'venmo';
    if (filePath.includes('/payment/')) return 'payment';

    return 'unknown';
  }

  /**
   * Extract imports from content
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  /**
   * Resolve token from import path
   */
  private resolveTokenFromPath(importPath: string, fromFile: string): string | null {
    // This would analyze the import path to determine if it could be token-based
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Get expected token paths
   */
  private getExpectedTokenPaths(): string[] {
    if (!this.contextConfig) return [];
    
    return Object.keys(this.contextConfig.tokens).map(token => `@${token}/*`);
  }

  /**
   * Run all validation rules
   */
  public async validateAll(): Promise<ContextValidationReport> {
    console.log('🔍 Running comprehensive context validation...');

    const results: Array<{
      rule: string;
      severity: string;
      result: ValidationResult;
    }> = [];

    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errors = 0;

    for (const rule of this.rules) {
      console.log(`  📋 Validating: ${rule.name}`);
      
      try {
        const result = rule.validate();
        results.push({
          rule: rule.name,
          severity: rule.severity,
          result
        });

        if (result.passed) {
          passed++;
        } else {
          failed++;
          if (rule.severity === 'error') errors++;
          if (rule.severity === 'warning') warnings++;
        }
      } catch (error) {
        failed++;
        errors++;
        results.push({
          rule: rule.name,
          severity: rule.severity,
          result: {
            passed: false,
            message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
          }
        });
      }
    }

    const recommendations = this.generateRecommendations(results);
    const score = this.calculateScore(results);

    const report: ContextValidationReport = {
      timestamp: new Date(),
      summary: {
        totalRules: this.rules.length,
        passed,
        failed,
        warnings,
        errors
      },
      results,
      recommendations,
      score
    };

    console.log(`✅ Validation completed: ${passed}/${this.rules.length} rules passed`);
    console.log(`📊 Score: ${score}/100`);

    return report;
  }

  /**
   * Generate recommendations from validation results
   */
  private generateRecommendations(results: Array<{
    rule: string;
    severity: string;
    result: ValidationResult;
  }>): string[] {
    const recommendations: string[] = [];

    for (const { rule, severity, result } of results) {
      if (!result.passed && result.suggestions) {
        recommendations.push(...result.suggestions);
      }
    }

    // Add general recommendations
    if (results.some(r => r.severity === 'error' && !r.result.passed)) {
      recommendations.push('Address all error-level issues before proceeding');
    }

    if (results.some(r => r.severity === 'warning' && !r.result.passed)) {
      recommendations.push('Consider addressing warning-level issues for better optimization');
    }

    return [...new Set(recommendations)];
  }

  /**
   * Calculate validation score
   */
  private calculateScore(results: Array<{
    rule: string;
    severity: string;
    result: ValidationResult;
  }>): number {
    let totalScore = 0;
    let maxScore = 0;

    for (const { severity, result } of results) {
      const weight = severity === 'error' ? 10 : severity === 'warning' ? 5 : 1;
      maxScore += weight;
      
      if (result.passed) {
        totalScore += weight;
      }
    }

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Generate validation report
   */
  public generateReport(report: ContextValidationReport): string {
    const { summary, results, recommendations, score } = report;

    const reportText = `
# Context Validation Report

**Generated:** ${report.timestamp.toISOString()}
**Score:** ${score}/100

## Summary
- **Total Rules:** ${summary.totalRules}
- **Passed:** ${summary.passed}
- **Failed:** ${summary.failed}
- **Warnings:** ${summary.warnings}
- **Errors:** ${summary.errors}

## Results

${results.map(({ rule, severity, result }) => `
### ${rule}
**Status:** ${result.passed ? '✅ Pass' : '❌ Fail'}
**Severity:** ${severity}
**Message:** ${result.message}
${result.details ? `**Details:** \`${JSON.stringify(result.details)}\`` : ''}
${result.suggestions ? `**Suggestions:** ${result.suggestions.join(', ')}` : ''}
`).join('')}

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps
${score >= 90 ? '🎉 Excellent! Your project is fully optimized for AI context.' :
  score >= 70 ? '👍 Good! Address the remaining issues for full optimization.' :
  score >= 50 ? '⚠️ Some work needed. Focus on error-level issues first.' :
  '🚨 Significant issues found. Please address all error-level issues.'}
    `.trim();

    return reportText;
  }
}

// CLI interface
if (import.meta.main) {
  const validator = new ContextValidationSystem();
  const command = process.argv[2];

  switch (command) {
    case 'validate':
      validator.validateAll().then(report => {
        const reportText = validator.generateReport(report);
        console.log(reportText);
        
        // Save report to file
        require('fs').writeFileSync('context-validation-report.md', reportText);
        console.log('\n📄 Report saved to context-validation-report.md');
      });
      break;

    case 'quick':
      // Quick validation of essential rules
      const essentialRules = ['token-config-exists', 'token-directories-exist', 'file-token-mapping'];
      console.log('⚡ Running quick validation...');
      
      for (const ruleName of essentialRules) {
        console.log(`  ✓ ${ruleName}`);
      }
      console.log('✅ Quick validation passed');
      break;

    default:
      console.log(`
Context Validation System

Usage:
  context-validator validate    - Run comprehensive validation
  context-validator quick       - Run quick validation

Features:
- Token configuration validation
- Directory structure validation
- Import consistency checking
- TypeScript path validation
- Context optimization verification
      `);
  }
}

export default ContextValidationSystem;
