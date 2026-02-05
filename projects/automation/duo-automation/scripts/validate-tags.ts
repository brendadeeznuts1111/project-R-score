#!/usr/bin/env bun

/**
 * Tag Validation Script
 * Validates artifact tags against governance rules and metadata schema
 */

import { join, extname } from 'path';
import { YAML } from "bun";

interface ValidationOptions {
  strict?: boolean;
  fix?: boolean;
  output?: 'table' | 'json' | 'summary';
  failOnError?: boolean;
}

interface ValidationResult {
  path: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  tags: string[];
  missingRequired: string[];
  invalidFormat: string[];
  duplicates: string[];
}

interface TagRegistry {
  allowed: {
    status: string[];
    priority: string[];
    domain: string[];
    audience: string[];
    technology: string[];
    environment: string[];
  };
  required: {
    perType: Record<string, string[]>;
    global: string[];
  };
  patterns: {
    tagFormat: RegExp;
    maxLength: number;
    minTags: number;
    maxTags: number;
  };
}

class TagValidator {
  private registry: TagRegistry;
  private results: ValidationResult[] = [];

  constructor() {
    this.loadRegistry();
  }

  /**
   * Validate all artifacts in the repository
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationResult[]> {
    console.log('🔍 Validating artifact tags...');
    const startTime = Date.now();

    await this.scanArtifacts('./');
    this.analyzeResults();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Validated ${this.results.length} artifacts in ${elapsed}ms`);

    this.outputResults(options.output || 'table');

    if (options.failOnError && this.hasErrors()) {
      console.error('\n❌ Validation failed with errors');
      process.exit(1);
    }

    return this.results;
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    total: number;
    valid: number;
    invalid: number;
    errorCount: number;
    warningCount: number;
    tagStats: Record<string, number>;
    complianceRate: number;
  } {
    const total = this.results.length;
    const valid = this.results.filter(r => r.valid).length;
    const invalid = total - valid;
    const errorCount = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = this.results.reduce((sum, r) => sum + r.warnings.length, 0);
    
    const tagStats: Record<string, number> = {};
    this.results.forEach(result => {
      result.tags.forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    });

    return {
      total,
      valid,
      invalid,
      errorCount,
      warningCount,
      tagStats,
      complianceRate: total > 0 ? Math.round((valid / total) * 100) : 0
    };
  }

  /**
   * Fix common tag issues automatically
   */
  async fixIssues(): Promise<void> {
    console.log('🔧 Fixing common tag issues...');
    
    let fixedCount = 0;
    for (const result of this.results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        const fixed = await this.fixArtifact(result);
        if (fixed) {
          fixedCount++;
        }
      }
    }

    console.log(`✅ Fixed issues in ${fixedCount} artifacts`);
  }

  /**
   * Load tag registry from configuration
   */
  private loadRegistry(): void {
    // Default registry - in production this would load from docs/TAG_REGISTRY.json
    this.registry = {
      allowed: {
        status: ['#ready', '#wip', '#review', '#blocked', '#deprecated'],
        priority: ['#critical', '#high', '#medium', '#low'],
        domain: [
          '#security', '#config-management', '#devops', '#monitoring',
          '#api', '#ui', '#database', '#testing', '#documentation', '#performance'
        ],
        audience: ['#developers', '#devops', '#security', '#users', '#admins', '#all'],
        technology: [
          '#typescript', '#javascript', '#bun', '#react', '#vue', '#docker',
          '#kubernetes', '#aws', '#gcp', '#azure', '#postgresql', '#redis'
        ],
        environment: ['#production', '#staging', '#development']
      },
      required: {
        perType: {
          '.ts': ['type', 'domain', 'status'],
          '.js': ['type', 'domain', 'status'],
          '.tsx': ['type', 'domain', 'status'],
          '.jsx': ['type', 'domain', 'status'],
          '.md': ['type', 'domain', 'status'],
          '.json': ['type', 'domain', 'status'],
          '.yaml': ['type', 'domain', 'status'],
          '.yml': ['type', 'domain', 'status']
        },
        global: ['type', 'domain', 'status']
      },
      patterns: {
        tagFormat: /^#[a-z0-9-]+$/,
        maxLength: 50,
        minTags: 3,
        maxTags: 10
      }
    };
  }

  /**
   * Scan all artifacts in the repository
   */
  private async scanArtifacts(rootPath: string): Promise<void> {
    const excludeDirs = [
      '.git', 'node_modules', '.bun', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp', '.github'
    ];

    const scanDirectory = (dirPath: string): void => {
      try {
        const entries = readdirSync(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !excludeDirs.includes(entry)) {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            this.validateArtifact(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scanDirectory(rootPath);
  }

  /**
   * Validate a single artifact
   */
  private validateArtifact(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = this.extractAndValidate(filePath, content);
      this.results.push(result);
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Extract tags and validate them
   */
  private extractAndValidate(filePath: string, content: string): ValidationResult {
    const tags = this.extractTags(content);
    const ext = extname(filePath);

    const result: ValidationResult = {
      path: filePath,
      valid: true,
      errors: [],
      warnings: [],
      tags,
      missingRequired: [],
      invalidFormat: [],
      duplicates: []
    };

    // Check minimum tag count
    if (tags.length < this.registry.patterns.minTags) {
      result.errors.push(
        `Too few tags (${tags.length}). Minimum required: ${this.registry.patterns.minTags}`
      );
      result.valid = false;
    }

    // Check maximum tag count
    if (tags.length > this.registry.patterns.maxTags) {
      result.warnings.push(
        `Too many tags (${tags.length}). Recommended maximum: ${this.registry.patterns.maxTags}`
      );
    }

    // Check for duplicate tags
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length !== tags.length) {
      result.duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
      result.errors.push(`Duplicate tags found: ${result.duplicates.join(', ')}`);
      result.valid = false;
    }

    // Check tag format
    tags.forEach(tag => {
      if (!this.registry.patterns.tagFormat.test(tag)) {
        result.invalidFormat.push(tag);
      }
    });

    if (result.invalidFormat.length > 0) {
      result.errors.push(
        `Invalid tag format: ${result.invalidFormat.join(', ')}. Tags must match ${this.registry.patterns.tagFormat}`
      );
      result.valid = false;
    }

    // Check tag length
    tags.forEach(tag => {
      if (tag.length > this.registry.patterns.maxLength) {
        result.warnings.push(`Tag too long: ${tag} (${tag.length} chars, max: ${this.registry.patterns.maxLength})`);
      }
    });

    // Check required tags by file type
    const requiredTags = this.registry.required.perType[ext] || this.registry.required.global;
    const tagCategories = this.categorizeTags(tags);

    requiredTags.forEach(category => {
      if (tagCategories[category].length === 0) {
        result.missingRequired.push(category);
      }
    });

    if (result.missingRequired.length > 0) {
      result.errors.push(
        `Missing required tag categories: ${result.missingRequired.join(', ')}`
      );
      result.valid = false;
    }

    // Check allowed values
    this.validateAllowedValues(result, tagCategories);

    return result;
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract from inline tags
    const inlineMatches = content.match(/#[a-z0-9-]+/g) || [];
    inlineMatches.forEach(tag => tags.add(tag));

    // Extract from YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        const frontmatter = YAML.parse(frontmatterMatch[1]) as any;
        if (frontmatter.tags) {
          if (Array.isArray(frontmatter.tags)) {
            frontmatter.tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.startsWith('#')) {
                tags.add(tag);
              }
            });
          }
        }
      } catch (error) {
        // Invalid YAML, skip
      }
    }

    return Array.from(tags).sort();
  }

  /**
   * Categorize tags by type
   */
  private categorizeTags(tags: string[]): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      type: [],
      status: [],
      priority: [],
      domain: [],
      audience: [],
      technology: [],
      environment: [],
      other: []
    };

    tags.forEach(tag => {
      if (this.registry.allowed.status.includes(tag)) {
        categories.status.push(tag);
      } else if (this.registry.allowed.priority.includes(tag)) {
        categories.priority.push(tag);
      } else if (this.registry.allowed.domain.includes(tag)) {
        categories.domain.push(tag);
      } else if (this.registry.allowed.audience.includes(tag)) {
        categories.audience.push(tag);
      } else if (this.registry.allowed.technology.includes(tag)) {
        categories.technology.push(tag);
      } else if (this.registry.allowed.environment.includes(tag)) {
        categories.environment.push(tag);
      } else if (tag === '#api' || tag === '#cli' || tag === '#dashboard' || tag === '#library') {
        categories.type.push(tag);
      } else {
        categories.other.push(tag);
      }
    });

    return categories;
  }

  /**
   * Validate allowed values
   */
  private validateAllowedValues(result: ValidationResult, categories: Record<string, string[]>): void {
    // Check status tags
    categories.status.forEach(tag => {
      if (!this.registry.allowed.status.includes(tag)) {
        result.warnings.push(`Unknown status tag: ${tag}. Allowed: ${this.registry.allowed.status.join(', ')}`);
      }
    });

    // Check domain tags
    categories.domain.forEach(tag => {
      if (!this.registry.allowed.domain.includes(tag)) {
        result.warnings.push(`Unknown domain tag: ${tag}. Consider adding to registry.`);
      }
    });

    // Check for deprecated tags
    const deprecatedTags = ['#old', '#legacy', '#temp'];
    categories.other.forEach(tag => {
      if (deprecatedTags.includes(tag)) {
        result.warnings.push(`Deprecated tag: ${tag}. Please use current tags.`);
      }
    });
  }

  /**
   * Analyze validation results
   */
  private analyzeResults(): void {
    // Additional analysis can be added here
    const stats = this.getStats();
    
    console.log(`\n📊 Validation Summary:`);
    console.log(`  Total artifacts: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${stats.complianceRate}%)`);
    console.log(`  Invalid: ${stats.invalid}`);
    console.log(`  Errors: ${stats.errorCount}`);
    console.log(`  Warnings: ${stats.warningCount}`);
  }

  /**
   * Output validation results
   */
  private outputResults(format: string): void {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(this.results, null, 2));
        break;
      case 'summary':
        this.outputSummary();
        break;
      case 'table':
      default:
        this.outputTable();
        break;
    }
  }

  /**
   * Output results as table
   */
  private outputTable(): void {
    const invalidResults = this.results.filter(r => !r.valid);
    
    if (invalidResults.length === 0) {
      console.log('\n✅ All artifacts passed validation!');
      return;
    }

    console.log('\n❌ Validation Issues Found:');
    console.log('─'.repeat(120));

    invalidResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.path}`);
      
      if (result.errors.length > 0) {
        console.log('   Errors:');
        result.errors.forEach(error => console.log(`     ❌ ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('   Warnings:');
        result.warnings.forEach(warning => console.log(`     ⚠️  ${warning}`));
      }
      
      console.log(`   Tags: ${result.tags.join(', ') || 'None'}`);
    });

    console.log(`\nFound ${invalidResults.length} artifacts with issues`);
  }

  /**
   * Output summary only
   */
  private outputSummary(): void {
    const stats = this.getStats();
    
    console.log('\n📊 Validation Summary:');
    console.log(`  Total artifacts: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${stats.complianceRate}%)`);
    console.log(`  Invalid: ${stats.invalid}`);
    console.log(`  Errors: ${stats.errorCount}`);
    console.log(`  Warnings: ${stats.warningCount}`);
    
    console.log('\n🏷️  Top Tags:');
    Object.entries(stats.tagStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
  }

  /**
   * Check if there are any validation errors
   */
  private hasErrors(): boolean {
    return this.results.some(result => result.errors.length > 0);
  }

  /**
   * Fix issues in an artifact (placeholder for future implementation)
   */
  private async fixArtifact(result: ValidationResult): Promise<boolean> {
    // This would implement automatic fixes for common issues
    // For now, just return false
    return false;
  }
}

/**
 * CLI interface for tag validation
 */
async function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--strict':
      case '-s':
        options.strict = true;
        break;
      case '--fix':
      case '-f':
        options.fix = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--fail-on-error':
        options.failOnError = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Tag Validation CLI

Usage: bun run scripts/validate-tags.ts [options]

Options:
  -s, --strict           Enable strict validation mode
  -f, --fix              Attempt to fix common issues automatically
  -o, --output <format>  Output format: table, json, summary
  --fail-on-error        Exit with error code if validation fails
  -h, --help             Show this help

Examples:
  bun run scripts/validate-tags.ts
  bun run scripts/validate-tags.ts --strict --fail-on-error
  bun run scripts/validate-tags.ts --output json
  bun run scripts/validate-tags.ts --fix
        `);
        return;
    }
  }

  const validator = new TagValidator();
  
  if (options.fix) {
    await validator.fixIssues();
  }
  
  await validator.validate(options);
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TagValidator, ValidationResult, ValidationOptions };
